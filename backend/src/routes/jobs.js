import express from 'express';
import JobOpportunity from '../models/JobOpportunity.js';
import JobApplication from '../models/JobApplication.js';
import ProgressRecord from '../models/ProgressRecord.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

const requireRecruiter = (req, res, next) => {
  if (req.user && (req.user.role === 'Recruiter' || req.user.role === 'Industry' || req.user.role === 'Admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a recruiter' });
  }
};

// GET /api/jobs/recruiter/stats - Recruiter analytics
router.get('/recruiter/stats', protect, requireRecruiter, async (req, res) => {
  try {
    const jobs = await JobOpportunity.find({ recruiter: req.user._id });
    const jobIds = jobs.map(j => j._id);
    const applications = await JobApplication.find({ job: { $in: jobIds } });

    const stats = {
      totalJobs: jobs.length,
      openJobs: jobs.filter(j => j.status === 'Open').length,
      closedJobs: jobs.filter(j => j.status === 'Closed').length,
      draftJobs: jobs.filter(j => j.status === 'Draft').length,
      totalApplications: applications.length,
      pendingReview: applications.filter(a => a.status === 'Pending').length,
      interviewing: applications.filter(a => a.status === 'Interviewing').length,
      accepted: applications.filter(a => a.status === 'Accepted').length,
      rejected: applications.filter(a => a.status === 'Rejected').length,
      byType: {
        Job: jobs.filter(j => j.type === 'Job').length,
        Internship: jobs.filter(j => j.type === 'Internship').length,
        Contract: jobs.filter(j => j.type === 'Contract').length,
      },
      recentApplications: await JobApplication.find({ job: { $in: jobIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('candidate', 'name email avatarUrl username skills')
        .populate('job', 'title type company'),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats: ' + error.message });
  }
});

// GET /api/jobs/recruiter/my-postings - Recruiter views their own jobs with app counts
router.get('/recruiter/my-postings', protect, requireRecruiter, async (req, res) => {
  try {
    const jobs = await JobOpportunity.find({ recruiter: req.user._id }).sort({ createdAt: -1 }).lean();
    const jobIds = jobs.map(j => j._id);
    const appCounts = await JobApplication.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$job', total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } } } }
    ]);
    const countMap = {};
    appCounts.forEach(a => { countMap[a._id.toString()] = { total: a.total, pending: a.pending }; });
    const result = jobs.map(j => ({
      ...j,
      applicationCount: countMap[j._id.toString()]?.total || 0,
      pendingCount: countMap[j._id.toString()]?.pending || 0,
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your jobs: ' + error.message });
  }
});

// GET /api/jobs/recruiter/applications - Recruiter views all applications
router.get('/recruiter/applications', protect, requireRecruiter, async (req, res) => {
  try {
    const jobs = await JobOpportunity.find({ recruiter: req.user._id }).select('_id');
    const jobIds = jobs.map(j => j._id);
    const query = { job: { $in: jobIds } };
    if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
    if (req.query.jobId) query.job = req.query.jobId;

    const applications = await JobApplication.find(query)
      .sort({ createdAt: -1 })
      .populate('candidate', 'name email avatarUrl username skills careerGoal')
      .populate('job', 'title type company');

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications: ' + error.message });
  }
});

// GET /api/jobs/:jobId/applications - Applications for a specific job
router.get('/:jobId/applications', protect, requireRecruiter, async (req, res) => {
  try {
    const job = await JobOpportunity.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not your job posting' });
    }
    const applications = await JobApplication.find({ job: req.params.jobId })
      .sort({ createdAt: -1 })
      .populate('candidate', 'name email avatarUrl username skills careerGoal profileId')
      .populate({ path: 'candidate', populate: { path: 'profileId' } });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error: ' + error.message });
  }
});

// GET /api/jobs/recruiter/job/:jobId - Get single job detail for recruiter
router.get('/recruiter/job/:jobId', protect, requireRecruiter, async (req, res) => {
  try {
    const job = await JobOpportunity.findById(req.params.jobId)
      .populate('recruiter', 'name')
      .populate('perfectMatches', 'name email avatarUrl username skills')
      .lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter._id.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not your job posting' });
    }
    const appCounts = await JobApplication.aggregate([
      { $match: { job: job._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusCounts = { Pending: 0, Interviewing: 0, Accepted: 0, Rejected: 0 };
    appCounts.forEach(a => { statusCounts[a._id] = a.count; });
    res.json({ ...job, statusCounts, totalApplications: Object.values(statusCounts).reduce((s, v) => s + v, 0) });
  } catch (error) {
    res.status(500).json({ message: 'Error: ' + error.message });
  }
});

// POST /api/jobs - Recruiter posts a job
router.post('/', protect, requireRecruiter, async (req, res) => {
  try {
    const { title, company, description, type, requiredSkills, location, isRemote, salary,
      experience, deadline, status } = req.body;
    const job = new JobOpportunity({
      title, company, description, type, requiredSkills, location, isRemote, salary,
      experience, deadline, status,
      recruiter: req.user._id
    });

    if (job.requiredSkills && job.requiredSkills.length > 0) {
      const candidates = await ProgressRecord.find({});
      const matches = candidates.filter(record => {
        return job.requiredSkills.every(reqSkill => {
          const userSkill = record.skills.find(s => s.skillName.toLowerCase() === reqSkill.skillName.toLowerCase());
          return userSkill && userSkill.isVerified && userSkill.proficiency >= reqSkill.minimumProficiency;
        });
      });
      job.perfectMatches = matches.map(m => m.user);
    }

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error posting job: ' + error.message });
  }
});

// PUT /api/jobs/:jobId - Update job posting
router.put('/:jobId', protect, requireRecruiter, async (req, res) => {
  try {
    const job = await JobOpportunity.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not your job posting' });
    }
    const allowed = ['title', 'company', 'description', 'type', 'requiredSkills', 'location', 'isRemote', 'salary', 'experience', 'deadline', 'status'];
    allowed.forEach(field => { if (req.body[field] !== undefined) job[field] = req.body[field]; });
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error updating job: ' + error.message });
  }
});

// GET /api/jobs/my-applications - Student views their applications
router.get('/my-applications', protect, async (req, res) => {
  try {
    const applications = await JobApplication.find({ candidate: req.user._id })
      .sort({ createdAt: -1 })
      .populate('job', 'title company type location');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your applications: ' + error.message });
  }
});

// GET /api/jobs - List all open jobs (public)
router.get('/', optionalProtect, async (req, res) => {
  try {
    const jobs = await JobOpportunity.find({ status: 'Open' }).populate('recruiter', 'name companyName');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs: ' + error.message });
  }
});

// POST /api/jobs/:jobId/apply - Student applies
router.post('/:jobId/apply', protect, async (req, res) => {
  try {
    const existing = await JobApplication.findOne({ job: req.params.jobId, candidate: req.user._id });
    if (existing) return res.status(400).json({ message: 'Already applied' });

    const application = new JobApplication({
      job: req.params.jobId,
      candidate: req.user._id,
      resumeUrl: req.body.resumeUrl,
      coverLetter: req.body.coverLetter
    });
    await application.save();

    await JobOpportunity.findByIdAndUpdate(req.params.jobId, { $inc: { applicationCount: 1 } });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Error applying: ' + error.message });
  }
});

// PUT /api/jobs/application/:appId - Recruiter updates application status
router.put('/application/:appId', protect, requireRecruiter, async (req, res) => {
  try {
    const { status, recruiterFeedback } = req.body;

    // Validate status
    const validStatuses = ['Pending', 'Interviewing', 'Accepted', 'Rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find the application first to check ownership
    const application = await JobApplication.findById(req.params.appId);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Verify the recruiter owns the associated job
    const job = await JobOpportunity.findById(application.job);
    if (!job) return res.status(404).json({ message: 'Associated job not found' });
    if (job.recruiter.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    if (status) application.status = status;
    if (recruiterFeedback !== undefined) application.recruiterFeedback = recruiterFeedback;
    await application.save();

    const populated = await JobApplication.findById(application._id)
      .populate('candidate', 'name email avatarUrl username')
      .populate('job', 'title');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating application: ' + error.message });
  }
});

export default router;
