import express from 'express';
import Project from '../models/Project.js';
import HackathonTeam from '../models/HackathonTeam.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

const isTeamMember = (team, user) => Boolean(
    team && user && team.members.some(member => member.toString() === user._id.toString())
);

const publicProjectFilter = {
    $or: [
        { isPublic: true },
        { isPublic: { $exists: false } }
    ]
};

// @desc    Create a new Squadron Project Profile
// @route   POST /api/projects
router.post('/', protect, async (req, res) => {
    try {
        const { title, tagline, description, associatedTeam, techStack, isPublic } = req.body;
        
        // Validation: User must be part of the team
        const team = await HackathonTeam.findById(associatedTeam);
        if (!team || !team.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Unauthorized: No squadron affiliation.' });
        }

        const project = await Project.create({
            title, tagline, description, associatedTeam, techStack, isPublic: isPublic === true
        });

        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all Projects (Public Mainnet Feed)
router.get('/mainnet', async (req, res) => {
    try {
        const projects = await Project.find(publicProjectFilter)
            .populate({
                path: 'associatedTeam',
                select: 'teamName score members isDisqualified'
            })
            .sort({ updatedAt: -1 })
            .lean();

        // Add 'Competition Verified' flag based on team score
        const enhancedProjects = projects.map(p => {
            const isVerified = p.associatedTeam?.score > 0;
            return { ...p, isVerified };
        });

        res.json(enhancedProjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Submit a Mission Log entry (Progress Matrix)
// @route   PATCH /api/projects/:id/log
router.patch('/:id/log', protect, async (req, res) => {
    try {
        const { logContent, mediaURL, isPublic } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ message: 'Target project depth not found.' });

        // Security: Confirm user is a squadron member
        const team = await HackathonTeam.findById(project.associatedTeam);
        if (!team || !team.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Unauthorized: Security credentials rejected.' });
        }

        const logEntry = {
            logContent,
            mediaURL,
            isPublic,
            timestamp: new Date()
        };

        project.progressMatrix.push(logEntry);
        await project.save();

        // SIGNAL RELAY: If public, emit a global signal for the Mainnet Feed
        if (isPublic && req.io) {
            req.io.emit('GLOBAL_PROGRESS_UPDATE', {
                projectId: project._id,
                title: project.title,
                teamName: team.teamName,
                logContent: logEntry.logContent,
                timestamp: logEntry.timestamp
            });
        }

        res.json({ message: 'Mission Log Synced.', entry: logEntry });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all Projects associated with a HackathonTeam (Squadron)
// @route   GET /api/projects/team/:teamId
router.get('/team/:teamId', optionalProtect, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.teamId).select('members');
        if (!team) return res.status(404).json({ message: 'Squadron not found.' });

        const member = isTeamMember(team, req.user);
        const query = member
            ? { associatedTeam: req.params.teamId }
            : { associatedTeam: req.params.teamId, ...publicProjectFilter };
        const projects = await Project.find(query)
            .sort({ updatedAt: -1 });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get internal TOC details
router.get('/:id', optionalProtect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('associatedTeam').lean();
        if (!project) return res.status(404).json({ message: 'Project not found.' });
        if (project.isPublic === false && !isTeamMember(project.associatedTeam, req.user)) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update Project Details
// @route   PUT /api/projects/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const { title, tagline, description, status, techStack, attachments } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ message: 'Project not found.' });

        // Security: Confirm user is a squadron member
        const team = await HackathonTeam.findById(project.associatedTeam);
        if (!team || !team.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Unauthorized: Security credentials rejected.' });
        }

        project.title = title !== undefined ? title : project.title;
        project.tagline = tagline !== undefined ? tagline : project.tagline;
        project.description = description !== undefined ? description : project.description;
        project.status = status !== undefined ? status : project.status;
        project.techStack = techStack !== undefined ? techStack : project.techStack;
        project.attachments = attachments !== undefined ? attachments : project.attachments;

        await project.save();

        res.json({ message: 'Project settings synchronized.', project });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
