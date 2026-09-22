import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import TestLog from '../models/TestLog.js';

const router = express.Router();

// GET /api/missions (Fetch all upcoming tests)
router.get('/', async (req, res) => {
  try {
    const activeMissions = await TestLog.find().populate('pilotOrLead', 'name').sort({ startTime: 1 });
    res.json(activeMissions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to access flight matrix.' });
  }
});

// POST /api/missions (Schedule a testing block)
router.post('/', protect, async (req, res) => {
  try {
    const { startTime, endTime, location, projectRef, objectives } = req.body;
    
    // Explicit RBAC verification: Is user a Team Lead or Admin?
    if (!['Admin', 'Team Lead'].includes(req.user.role)) {
       return res.status(403).json({ message: 'Unauthorized. Only Team Leads may schedule flight tests.' });
    }

    const startDt = new Date(startTime);
    const endDt = new Date(endTime);

    if (endDt <= startDt) {
      return res.status(400).json({ message: 'Chronological paradox. End time must be strictly after Start time.' });
    }

    // THE INTERCEPTOR: Overlapping Reservation Math
    // Condition to intersect: Existing Start < New End  AND  Existing End > New Start
    const collision = await TestLog.findOne({
      location: location,
      status: 'Scheduled',
      $and: [
        { startTime: { $lt: endDt } },
        { endTime: { $gt: startDt } }
      ]
    });

    if (collision) {
      return res.status(409).json({ message: 'Collision Warning: This location is mathematically already booked during this timeframe!' });
    }

    const testBlock = await TestLog.create({
      startTime: startDt,
      endTime: endDt,
      location,
      projectRef,
      pilotOrLead: req.user._id,
      objectives
    });

    res.status(201).json(testBlock);

  } catch (err) {
    res.status(500).json({ message: 'Error scheduling flight architecture.' });
  }
});

// PUT /api/missions/:id/report (Submit post flight report)
router.put('/:id/report', protect, async (req, res) => {
  try {
    const mission = await TestLog.findById(req.params.id);
    if (!mission) return res.status(404).json({ message: 'Mission absent.' });

    // Validate ownership
    if (mission.pilotOrLead.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
       return res.status(403).json({ message: 'Only the designated Lead can submit the final flight report.' });
    }

    const { outcome, status } = req.body;
    if (!outcome) return res.status(400).json({ message: 'Detailed outcome variables are strictly required.' });

    mission.outcome = outcome;
    mission.status = status || 'Completed';
    await mission.save();

    res.json(mission);
  } catch (err) {
    res.status(500).json({ message: 'Error logging briefing.' });
  }
});

export default router;
