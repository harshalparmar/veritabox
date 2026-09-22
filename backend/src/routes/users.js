import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import HackathonTeam from '../models/HackathonTeam.js';
import Project from '../models/Project.js';

import Chapter from '../models/Chapter.js';

import KnowledgeArticle from '../models/KnowledgeArticle.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import Hackathon from '../models/Hackathon.js';
import ChallengeSubmission from '../models/ChallengeSubmission.js';
import Challenge from '../models/Challenge.js';
import ReputationLog from '../models/ReputationLog.js';
import jwt from 'jsonwebtoken';
import StudentProfile from '../models/profiles/StudentProfile.js';
import ProfessionalProfile from '../models/profiles/ProfessionalProfile.js';
import RecruiterProfile from '../models/profiles/RecruiterProfile.js';
import TeacherProfile from '../models/profiles/TeacherProfile.js';


const router = express.Router();

// GET /api/users/me
// Returns the currently authenticated user (used by frontend to validate JWT on load)
// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { chapter, limit = 10, page = 1 } = req.query;
    const filter = {};
    if (chapter) filter.chapter = chapter;

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50); // Cap between 1 and 50
    const skip = (parseInt(page) - 1) * parsedLimit;

    const leaders = await User.find(filter)
      .select('name username chapter reputationPoints avatarUrl')
      .sort({ reputationPoints: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await User.countDocuments(filter);

    res.json({
      leaders,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalCount: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving leaderboard: ' + error.message });
  }
});

// GET /api/users/check-username
// Public endpoint to check if a username is available
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ message: 'Username is required.' });

    const existing = await User.findOne({ username: username.toLowerCase() });
    res.json({ available: !existing });
  } catch (error) {
    res.status(500).json({ message: 'Error checking username: ' + error.message });
  }
});

// GET /api/users/presence — list currently online user IDs (in-memory)
router.get('/presence', protect, async (req, res) => {
  try {
    const { getOnlineUserIds } = await import('../index.js');
    res.json({ online: getOnlineUserIds() });
  } catch (error) {
    res.json({ online: [] });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    let user = await User.findById(req.user._id)
      .select('-password')
      .populate('connections.userId', 'name username avatarUrl')
      .populate({
        path: 'chapterId',
        select: 'name slug localRoles themeColor stats',
        populate: { path: 'localRoles.user', select: '_id' }
      });

    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.profileId && user.profileModel) {
      await user.populate('profileId');
    }

    const userObj = user.toObject();
    if (userObj.chapterId) {
      userObj.chapter = userObj.chapterId;
      delete userObj.chapterId;
    }
    if (userObj.profileId && typeof userObj.profileId === 'object') {
      userObj.personaProfile = userObj.profileId;
      delete userObj.personaProfile.user;
    }

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// POST /api/users/onboarding
router.post('/onboarding', protect, async (req, res) => {
  try {
    const { persona, profileData, baseData } = req.body;
    if (!persona || !profileData) {
      return res.status(400).json({ message: 'Persona and profileData are required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.onboardingCompleted && user.isOnboarded) return res.status(400).json({ message: 'Onboarding already completed.' });

    let ProfileModel;
    let profileModelName;
    let role;

    switch (persona) {
      case 'Student':
        ProfileModel = (await import('../models/profiles/StudentProfile.js')).default;
        profileModelName = 'StudentProfile';
        role = 'Student';
        break;
      case 'Professional':
        ProfileModel = (await import('../models/profiles/ProfessionalProfile.js')).default;
        profileModelName = 'ProfessionalProfile';
        role = 'Professional';
        break;
      case 'Recruiter':
        ProfileModel = (await import('../models/profiles/RecruiterProfile.js')).default;
        profileModelName = 'RecruiterProfile';
        role = 'Recruiter';
        break;
      case 'Teacher':
        ProfileModel = (await import('../models/profiles/TeacherProfile.js')).default;
        profileModelName = 'TeacherProfile';
        role = 'Teacher';
        break;
      default:
        return res.status(400).json({ message: 'Invalid persona.' });
    }

    const newProfile = await ProfileModel.create({
      user: req.user._id,
      ...profileData
    });

    if (baseData) {
      const ALLOWED_BASE_FIELDS = [
        'username', 'bio', 'phone', 'dob', 'gender', 'whatsappNo', 'alternateNo',
        'permanentAddress', 'country', 'state', 'city',
        'employmentStatus', 'occupation', 'designation', 'workExperience', 'companyName',
        'eduInstitutionType', 'eduInstitutionName', 'eduInstitutionAddress',
        'eduState', 'eduCity', 'course', 'branch', 'batch', 'universityId',
        'socialLinks', 'skills', 'careerGoal'
      ];
      for (const key of ALLOWED_BASE_FIELDS) {
        if (baseData[key] !== undefined) user[key] = baseData[key];
      }
    }

    user.role = role;
    user.profileId = newProfile._id;
    user.profileModel = profileModelName;
    user.onboardingCompleted = true;
    user.isOnboarded = true;
    await user.save();

    res.json({ message: 'Onboarding completed successfully', role: user.role, profileId: user.profileId });
  } catch (error) {
    res.status(500).json({ message: 'Server error during onboarding: ' + error.message });
  }
});

// GET /api/users/talent-search
router.get('/talent-search', protect, async (req, res) => {
  try {
    if (req.user.role !== 'Recruiter' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized for talent search.' });
    }

    const { skills, role } = req.query;
    const filter = { role: { $in: ['Student', 'Professional'] } };

    if (role) filter.role = role;

    let usersQuery = User.find(filter)
      .select('name username avatarUrl role careerGoal skills profileModel')
      .populate('profileId');

    const users = await usersQuery;

    let filteredUsers = users;
    if (skills) {
      const requiredSkills = skills.split(',').map(s => s.trim().toLowerCase());
      filteredUsers = users.filter(u => {
        const userSkills = [];
        if (u.skills) userSkills.push(...u.skills.map(s => typeof s === 'string' ? s : s.skillName || ''));
        if (u.profileId && u.profileId.currentSkills) userSkills.push(...u.profileId.currentSkills);
        if (u.profileId && u.profileId.techStack) userSkills.push(...u.profileId.techStack);
        
        if (userSkills.length === 0) return false;
        
        return requiredSkills.every(req => 
          userSkills.some(s => s.toLowerCase().includes(req))
        );
      });
    }

    res.json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error in talent search: ' + error.message });
  }
});

// GET /api/users/profile/:identifier
// Retrieves an engineer's profile by either their MongoDB ID or unique username
router.get('/profile/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let user;

    // Attempt to find by ID first, then by username
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(identifier).select('-password');
    }
    
    if (!user) {
      user = await User.findOne({ username: identifier.toLowerCase() }).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: 'Engineer not found in our registries.' });
    }

    // Verify Privacy Settings
    const visibility = user.settings?.privacy?.profileVisibility || 'Community';
    
    // Quick manual token check for optional auth
    let requesterUser = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requesterUser = await User.findById(decoded.id).select('role chapter');
      } catch (e) {
        // Ignore invalid tokens for public route
      }
    }

    const isSelf = requesterUser && requesterUser._id.toString() === user._id.toString();
    const isAdmin = requesterUser && requesterUser.role === 'Admin';

    if (!isSelf && !isAdmin) {
      if (visibility === 'Community' && !requesterUser) {
        return res.status(401).json({ message: 'Authentication required to view this profile.' });
      }
      if (visibility === 'Chapter' && (!requesterUser || requesterUser.chapter?.toString() !== user.chapter?.toString())) {
        return res.status(403).json({ message: 'This profile is restricted to chapter members.' });
      }
    }

    // AGGREGATE PROJECTS: Find all projects where this user is a squadron member
    const teamIds = await HackathonTeam.find({ members: user._id }).distinct('_id');
    const projects = await Project.find({ associatedTeam: { $in: teamIds } })
        .populate('associatedTeam', 'teamName score members')
        .sort({ updatedAt: -1 });


    // AGGREGATE HACKATHONS
    const userTeams = await HackathonTeam.find({ members: user._id, hackathonId: { $ne: null } })
        .populate('hackathonId', 'title slug bannerImage status')
        .sort({ createdAt: -1 });

    const hackathonData = userTeams.map(team => ({
        _id: team._id,
        hackathon: team.hackathonId,
        teamName: team.teamName,
        slug: team.slug || `${team.teamName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${team._id.toString().substring(18)}`,
        status: team.isDisqualified ? 'disqualified' : 'participating',
        totalScore: team.score,
        rank: team.rank // Note: rank might need to be calculated or fetched from another source if not in Team model
    }));



    // AGGREGATE KNOWLEDGE
    const knowledgeArticles = await KnowledgeArticle.find({ author: user._id, isPublished: true })
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 });

    // AGGREGATE COMPETITIONS
    const competitionRegistrations = await Registration.find({ 
        $or: [{ leader: user._id }, { members: user._id }] 
    })
    .populate({
        path: 'event',
        match: { category: 'Competition' },
        select: 'title category subCategory prizeMoney'
    })
    .sort({ createdAt: -1 });
    
    // Filter out null events (if any non-competition event was matched)
    const competitions = competitionRegistrations.filter(r => r.event !== null);

    // AGGREGATE CHAPTER
    let chapter = null;
    let finalChapterId = user.chapterId;
    if (!finalChapterId) {
        // Fallback: search if user is lead, member, or verified member of any chapter
        const foundChapter = await Chapter.findOne({
            $or: [
                { members: user._id },
                { leads: user._id },
                { verifiedMembers: user._id }
            ]
        });
        if (foundChapter) {
            finalChapterId = foundChapter._id;
        }
    }
    if (finalChapterId) {
        const chapterDoc = await Chapter.findById(finalChapterId).select('name slug themeColor stats logoUrl city members founder');
        if (chapterDoc) {
            chapter = chapterDoc.toObject();
            chapter.membersCount = chapterDoc.members ? chapterDoc.members.length : 0;
            delete chapter.members;
        }
    }

    // AGGREGATE CODEFORGE CHALLENGES SOLVED (Unique accepted submissions)
    const allAcceptedSubmissions = await ChallengeSubmission.find({ userId: user._id, status: 'Accepted' })
        .populate('challengeId', 'title difficulty tags reputationReward')
        .sort({ createdAt: -1 });

    // Filter to keep only the most recent unique challenge solve
    const uniqueChallengeMap = new Map();
    for (const sub of allAcceptedSubmissions) {
      if (sub.challengeId && !uniqueChallengeMap.has(sub.challengeId._id.toString())) {
        uniqueChallengeMap.set(sub.challengeId._id.toString(), sub);
      }
    }
    const uniqueForgeSolves = Array.from(uniqueChallengeMap.values());

    // Calculate Reputation Velocity (XP gained in last 24 days)
    const twentyFourDaysAgo = new Date();
    twentyFourDaysAgo.setDate(twentyFourDaysAgo.getDate() - 24);

    const velocityData = await ReputationLog.aggregate([
      { 
        $match: { 
          userId: user._id, 
          createdAt: { $gte: twentyFourDaysAgo } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalPoints: { $sum: '$points' } 
        } 
      }
    ]);

    const calculatedVelocity = velocityData.length > 0 ? velocityData[0].totalPoints : 0;

    // Calculate CodeForge Rank
    const userSolvesCount = await ChallengeSubmission.countDocuments({ userId: user._id, status: 'Accepted' });
    let forgeRank = 'Unranked';
    if (userSolvesCount > 0) {
      const rankingAgg = await ChallengeSubmission.aggregate([
        { $match: { status: 'Accepted' } },
        { $group: { _id: '$userId', solvedCount: { $sum: 1 } } },
        { $match: { solvedCount: { $gt: userSolvesCount } } },
        { $count: 'higherSolversCount' }
      ]);
      const higherCount = rankingAgg.length > 0 ? rankingAgg[0].higherSolversCount : 0;
      forgeRank = `#${higherCount + 1}`;
    }

    // Calculate total challenges counts (only published challenges)
    const publishedQuery = {
      $or: [
        { activeFrom: { $exists: false } },
        { activeFrom: null },
        { activeFrom: { $lte: new Date() } }
      ]
    };

    const [totalChallenges, rookieChallenges, operativeChallenges, eliteChallenges] = await Promise.all([
      Challenge.countDocuments(publishedQuery),
      Challenge.countDocuments({ ...publishedQuery, difficulty: 'Rookie' }),
      Challenge.countDocuments({ ...publishedQuery, difficulty: 'Operative' }),
      Challenge.countDocuments({ ...publishedQuery, difficulty: 'Elite' })
    ]);

    res.json({
        ...user.toObject(),
        projects,

        hackathons: hackathonData,
        knowledge: knowledgeArticles,
        competitions,
        chapter,
        forgeSolves: uniqueForgeSolves,
        reputationVelocity: calculatedVelocity,
        forgeRank,
        forgeTotals: {
          total: totalChallenges,
          rookie: rookieChallenges,
          operative: operativeChallenges,
          elite: eliteChallenges
        }
    });
  } catch (error) {
    res.status(500).json({ message: 'System fault retrieving profile: ' + error.message });
  }
});

// PUT /api/users/profile
// Securely alters the authenticated user's schema based on their JWT.
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User verification failed.' });
    }

    // Safely apply alterations passed safely through req.body
    if (req.body.name !== undefined) {
      if (req.body.name.length > 50) return res.status(400).json({ message: 'Name exceeds maximum length of 50 characters' });
      user.name = req.body.name;
    }
    if (req.body.bio !== undefined) {
      if (req.body.bio.length > 500) return res.status(400).json({ message: 'Bio exceeds maximum length of 500 characters' });
      user.bio = req.body.bio;
    }

    // Handle Username Updates with Uniqueness Check
    if (req.body.username && req.body.username !== user.username) {
       const existing = await User.findOne({ username: req.body.username.toLowerCase() });
       if (existing) return res.status(400).json({ message: 'Username already requisitioned by another operative.' });
       user.username = req.body.username.toLowerCase();
    }
    
    // Validate URLs to prevent javascript: XSS
    const isValidUrl = (url) => {
      try {
        if (!url) return true; // allow empty
        if (url.startsWith('/')) return true; // allow local relative paths from our upload endpoint
        const parsed = new URL(url);
        return ['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    };

    if (req.body.avatarUrl !== undefined) {
      if (!isValidUrl(req.body.avatarUrl)) return res.status(400).json({ message: 'Invalid Avatar URL protocol' });
      user.avatarUrl = req.body.avatarUrl;
    }
    if (req.body.coverPhotoUrl !== undefined) {
      if (!isValidUrl(req.body.coverPhotoUrl)) return res.status(400).json({ message: 'Invalid Cover Photo URL protocol' });
      user.coverPhotoUrl = req.body.coverPhotoUrl;
    }

    user.skills = req.body.skills !== undefined ? req.body.skills : user.skills;
    user.currentProjects = req.body.currentProjects !== undefined ? req.body.currentProjects : user.currentProjects;
    
    // Skill Matrix Updates
    if (req.body.skillMatrix) {
       Object.keys(req.body.skillMatrix).forEach(key => {
          if (user.skillMatrix[key] !== undefined) {
             user.skillMatrix[key] = req.body.skillMatrix[key];
          }
       });
    }

    // Settings Updates (Privacy & Notifications)
    if (req.body.settings) {
       if (req.body.settings.notifications) {
          Object.keys(req.body.settings.notifications).forEach(key => {
             if (user.settings.notifications[key] !== undefined) {
                user.settings.notifications[key] = { ...user.settings.notifications[key], ...req.body.settings.notifications[key] };
             }
          });
       }
       if (req.body.settings.privacy) {
          Object.keys(req.body.settings.privacy).forEach(key => {
             if (user.settings.privacy[key] !== undefined) {
                user.settings.privacy[key] = req.body.settings.privacy[key];
             }
          });
       }
    }

    // Complex object destructuring mapping for social arrays
    if (req.body.socialLinks) {
       user.socialLinks.github = req.body.socialLinks.github !== undefined ? req.body.socialLinks.github : user.socialLinks.github;
       user.socialLinks.linkedin = req.body.socialLinks.linkedin !== undefined ? req.body.socialLinks.linkedin : user.socialLinks.linkedin;
       user.socialLinks.portfolio = req.body.socialLinks.portfolio !== undefined ? req.body.socialLinks.portfolio : user.socialLinks.portfolio;
       user.socialLinks.twitter = req.body.socialLinks.twitter !== undefined ? req.body.socialLinks.twitter : user.socialLinks.twitter;
    }

    if (req.body.pinnedProjects) {
       user.pinnedProjects = req.body.pinnedProjects.slice(0, 3); // Max 3
    }

    // New Fields
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
    user.dob = req.body.dob !== undefined ? req.body.dob : user.dob;
    user.gender = req.body.gender !== undefined ? req.body.gender : user.gender;
    user.whatsappNo = req.body.whatsappNo !== undefined ? req.body.whatsappNo : user.whatsappNo;
    user.alternateNo = req.body.alternateNo !== undefined ? req.body.alternateNo : user.alternateNo;
    user.permanentAddress = req.body.permanentAddress !== undefined ? req.body.permanentAddress : user.permanentAddress;
    user.country = req.body.country !== undefined ? req.body.country : user.country;
    user.state = req.body.state !== undefined ? req.body.state : user.state;
    user.city = req.body.city !== undefined ? req.body.city : user.city;
    user.employmentStatus = req.body.employmentStatus !== undefined ? req.body.employmentStatus : user.employmentStatus;
    user.occupation = req.body.occupation !== undefined ? req.body.occupation : user.occupation;
    user.designation = req.body.designation !== undefined ? req.body.designation : user.designation;
    user.workExperience = req.body.workExperience !== undefined ? req.body.workExperience : user.workExperience;
    user.companyName = req.body.companyName !== undefined ? req.body.companyName : user.companyName;
    user.eduInstitutionType = req.body.eduInstitutionType !== undefined ? req.body.eduInstitutionType : user.eduInstitutionType;
    user.eduInstitutionName = req.body.eduInstitutionName !== undefined ? req.body.eduInstitutionName : user.eduInstitutionName;
    user.eduInstitutionAddress = req.body.eduInstitutionAddress !== undefined ? req.body.eduInstitutionAddress : user.eduInstitutionAddress;
    user.eduState = req.body.eduState !== undefined ? req.body.eduState : user.eduState;
    user.eduCity = req.body.eduCity !== undefined ? req.body.eduCity : user.eduCity;
    user.course = req.body.course !== undefined ? req.body.course : user.course;
    user.branch = req.body.branch !== undefined ? req.body.branch : user.branch;
    user.batch = req.body.batch !== undefined ? req.body.batch : user.batch;
    // NOTE: universityId and isOnboarded are intentionally NOT editable here.
    // universityId is an alternate login credential (admin-managed).
    // isOnboarded is set exclusively by the /onboarding endpoint.

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      universityId: updatedUser.universityId,
      username: updatedUser.username,
      role: updatedUser.role,
      bio: updatedUser.bio,
      avatarUrl: updatedUser.avatarUrl,
      coverPhotoUrl: updatedUser.coverPhotoUrl,

      skills: updatedUser.skills,
      skillMatrix: updatedUser.skillMatrix,
      settings: updatedUser.settings,
      socialLinks: updatedUser.socialLinks,
      pinnedProjects: updatedUser.pinnedProjects,
      reputationPoints: updatedUser.reputationPoints,
      badges: updatedUser.badges,
      // Return new fields
      phone: updatedUser.phone,
      dob: updatedUser.dob,
      gender: updatedUser.gender,
      whatsappNo: updatedUser.whatsappNo,
      alternateNo: updatedUser.alternateNo,
      permanentAddress: updatedUser.permanentAddress,
      country: updatedUser.country,
      state: updatedUser.state,
      city: updatedUser.city,
      employmentStatus: updatedUser.employmentStatus,
      occupation: updatedUser.occupation,
      designation: updatedUser.designation,
      workExperience: updatedUser.workExperience,
      companyName: updatedUser.companyName,
      eduInstitutionType: updatedUser.eduInstitutionType,
      eduInstitutionName: updatedUser.eduInstitutionName,
      eduInstitutionAddress: updatedUser.eduInstitutionAddress,
      eduState: updatedUser.eduState,
      eduCity: updatedUser.eduCity,
      course: updatedUser.course,
      branch: updatedUser.branch,
      batch: updatedUser.batch,
      isOnboarded: updatedUser.isOnboarded
    });
  } catch (error) {
    res.status(500).json({ message: 'System fault updating settings: ' + error.message });
  }
});

// PUT /api/users/profile/persona
// Update persona-specific profile (StudentProfile, ProfessionalProfile, etc.)
router.put('/profile/persona', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.profileId || !user.profileModel) {
      return res.status(400).json({ message: 'No persona profile linked. Complete onboarding first.' });
    }

    let ProfileModel;
    switch (user.profileModel) {
      case 'StudentProfile':
        ProfileModel = (await import('../models/profiles/StudentProfile.js')).default;
        break;
      case 'ProfessionalProfile':
        ProfileModel = (await import('../models/profiles/ProfessionalProfile.js')).default;
        break;
      case 'RecruiterProfile':
        ProfileModel = (await import('../models/profiles/RecruiterProfile.js')).default;
        break;
      case 'TeacherProfile':
        ProfileModel = (await import('../models/profiles/TeacherProfile.js')).default;
        break;
      default:
        return res.status(400).json({ message: 'Unknown profile type.' });
    }

    const profile = await ProfileModel.findById(user.profileId);
    if (!profile) return res.status(404).json({ message: 'Persona profile not found.' });

    const ALLOWED_FIELDS = {
      StudentProfile: ['university', 'degree', 'graduationYear', 'department', 'careerGoals', 'currentSkills', 'interests', 'skillLevel'],
      ProfessionalProfile: ['company', 'jobTitle', 'yearsOfExperience', 'techStack', 'industry', 'interests', 'openToMentor'],
      TeacherProfile: ['institution', 'department', 'subjectsTaught', 'experienceYears', 'interests', 'canMentor'],
      RecruiterProfile: ['company', 'hiringRoles', 'linkedInUrl', 'teamSize', 'hiringUrgency', 'preferredSkills', 'industry'],
    };

    const allowed = ALLOWED_FIELDS[user.profileModel] || [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        profile[key] = req.body[key];
      }
    }

    const updated = await profile.save();
    const profileObj = updated.toObject();
    delete profileObj.user;
    res.json(profileObj);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update persona profile: ' + error.message });
  }
});

// PUT /api/users/password
// Securely updates the operative's access credentials
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password verification failed.' });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'New password lacks required complexity: Min 8 chars, 1 letter, 1 number, 1 special character.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Access credentials updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Fault updating password: ' + error.message });
  }
});

const blockRecruiterConnection = (req, res, next) => {
  if (req.user && req.user.role === 'Recruiter') {
    return res.status(403).json({ message: 'Connections are not available for Recruiter accounts.' });
  }
  next();
};

// POST /api/users/connection/request
// Requests a connection from another engineer
router.post('/connection/request', protect, blockRecruiterConnection, async (req, res) => {
  try {
    const { targetUserId, type } = req.body;
    
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({ message: "Cannot establish connection with oneself." });
    }

    const ALLOWED_TYPES = ['Collaborator', 'Squadmate'];
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: `Invalid connection type. Allowed: ${ALLOWED_TYPES.join(', ')}` });
    }

    let targetUser;
    if (targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(targetUserId);
    } else {
      targetUser = await User.findOne({ username: targetUserId.toLowerCase() });
    }
    
    if (!targetUser) return res.status(404).json({ message: 'Target engineer not found.' });



    // Check if link already exists
    const existingConnection = targetUser.connections.find(c => c.userId.toString() === req.user._id.toString());
    if (existingConnection) {
      return res.status(400).json({ message: 'Telemetry link already exists or is pending.' });
    }

    // Inject pending request to TARGET
    targetUser.connections.push({
      userId: req.user._id,
      type: type,
      status: 'Pending'
    });
    
    await targetUser.save();
    
    res.json({ message: 'Connection requested.' });
  } catch (error) {
    res.status(500).json({ message: 'Network fault requesting connection: ' + error.message });
  }
});

// POST /api/users/connection/accept
// Target engineer accepts pending requests
router.post('/connection/accept', protect, blockRecruiterConnection, async (req, res) => {
  try {
    const { requesterId } = req.body;
    const currentUser = await User.findById(req.user._id);

    // Find the pending block
    const connectionIndex = currentUser.connections.findIndex(c => c.userId.toString() === requesterId && c.status === 'Pending');
    if (connectionIndex === -1) {
      return res.status(404).json({ message: 'Pending matrix link not found.' });
    }

    // Mutate to accepted via bi-directional handshaking
    const connectionType = currentUser.connections[connectionIndex].type;
    currentUser.connections[connectionIndex].status = 'Accepted';
    
    const requesterUser = await User.findById(requesterId);
    if (!requesterUser) return res.status(404).json({ message: 'Requester not found.' });
    
    requesterUser.connections.push({
      userId: currentUser._id,
      type: connectionType,
      status: 'Accepted'
    });

    await currentUser.save();
    await requesterUser.save();

    res.json({ message: 'Telemetry link established successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'System fault authorizing connection: ' + error.message });
  }
});

// POST /api/users/connection/remove
// Removes an existing connection or cancels a pending request
router.post('/connection/remove', protect, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUser = await User.findById(req.user._id);

    // Remove from current user
    currentUser.connections = currentUser.connections.filter(c => c.userId.toString() !== targetUserId);
    await currentUser.save();

    // Remove from target user
    const targetUser = await User.findById(targetUserId);
    if (targetUser) {
      targetUser.connections = targetUser.connections.filter(c => c.userId.toString() !== req.user._id.toString());
      await targetUser.save();
    }

    res.json({ message: 'Link severed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'System fault severing connection: ' + error.message });
  }
});

// GET /api/users/network
// Retrieves structured network data
router.get('/network', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('connections.userId', 'name username avatarUrl role');
    
    const incoming = [];
    const outgoing = [];
    const active = [];

    // To find outgoing, we need to query users who have the current user as 'Pending' in their connections
    const usersWithMePending = await User.find({
      'connections': { $elemMatch: { userId: req.user._id, status: 'Pending' } }
    }).select('name username avatarUrl role connections');

    for (const u of usersWithMePending) {
      if (!u.connections) continue;
      outgoing.push({
        user: u,
        // Since we don't store outgoing directly, we derive it from the other user's incoming
        timestamp: u.connections.find(c => c.userId?.toString() === req.user._id.toString())?.timestamp
      });
    }

    if (user.connections) {
      user.connections.forEach(c => {
        if (!c.userId) return; // In case user was deleted
        
        const connData = {
          user: c.userId,
          type: c.type,
          timestamp: c.timestamp,
          status: c.status
        };

        if (c.status === 'Pending') {
          incoming.push(connData);
        } else if (c.status === 'Accepted') {
          active.push(connData);
        }
      });
    }

    res.json({ incoming, outgoing, active });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving network structure: ' + error.message });
  }
});

// POST /api/users/me/sessions/revoke
// Revokes a specific session
router.post('/me/sessions/revoke', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const user = await User.findById(req.user._id);
    user.activeSessions = user.activeSessions.filter(s => s._id.toString() !== sessionId);
    await user.save();
    res.json({ message: 'Session revoked successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'System fault revoking session: ' + error.message });
  }
});

// POST /api/users/me/sessions/revoke-all
// Revokes all active sessions for the user
router.post('/me/sessions/revoke-all', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.activeSessions = [];
    await user.save();
    res.json({ message: 'All sessions revoked successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'System fault revoking all sessions: ' + error.message });
  }
});



// POST /api/users/me/deactivate
// Temporarily deactivates the operative's identity
router.post('/me/deactivate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    // Logic to hide from searches would be handled by the 'settings.privacy.searchable' field
    user.settings.privacy.searchable = false;
    await user.save();
    res.json({ message: 'Identity deactivated. Log back in at any time to restore your status.' });
  } catch (error) {
    res.status(500).json({ message: 'System fault deactivating identity: ' + error.message });
  }
});



export default router;
