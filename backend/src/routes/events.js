import express from 'express';
import Event from '../models/Event.js';
import EventRegistration from '../models/EventRegistration.js';
import { sendEventRegistrationEmail } from '../utils/email.js';
import { protect as auth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// GET /api/events - Publicly available fetch with category filtering
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;

    const events = await Event.find(query).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events: ' + error.message });
  }
});

// GET /api/events/registration/:ticketToken - Fetch digital ID card
router.get('/registration/:ticketToken', async (req, res) => {
  try {
    const reg = await EventRegistration.findOne({ ticketToken: req.params.ticketToken }).populate('event');
    if (!reg) return res.status(404).json({ message: 'Registration not found or invalid token.' });
    res.json(reg);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching registration: ' + error.message });
  }
});

// GET /api/events/:id - Fetch atomic event intelligence
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Tournament record not found.' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournament details: ' + error.message });
  }
});

// POST /api/events - Create new tournament record (Admin Only)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: 'Error creating tournament: ' + error.message });
  }
});

// PUT /api/events/:id - Update mission parameters (Admin Only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Tournament record not found.' });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: 'Error updating mission parameters: ' + error.message });
  }
});

// DELETE /api/events/:id - Purge tournament record (Admin Only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Tournament record not found.' });
    res.json({ message: 'Tournament successfully purged from registry.' });
  } catch (error) {
    res.status(500).json({ message: 'Error purging tournament: ' + error.message });
  }
});


// GET /api/events/:id/registrations - Admin fetch registrations
router.get('/:id/registrations', auth, requireAdmin, async (req, res) => {
  try {
    const regs = await EventRegistration.find({ event: req.params.id }).sort({ createdAt: -1 });
    res.json(regs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching registrations: ' + error.message });
  }
});

// POST /api/events/:id/register - Register for an event
router.post('/:id/register', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const { name, email, phone, status, institutionOrCompany, userId } = req.body;
    
    // Check if already registered
    const existing = await EventRegistration.findOne({ event: event._id, email });
    if (existing) {
      return res.status(400).json({ message: 'You are already registered for this event.' });
    }

    const reg = new EventRegistration({
      event: event._id,
      user: userId || null,
      name,
      email,
      phone,
      status,
      institutionOrCompany
    });

    await reg.save();

    // Send confirmation email asynchronously
    sendEventRegistrationEmail(email, name, event, reg.ticketToken);

    res.status(201).json({ message: 'Registration successful', ticketToken: reg.ticketToken });
  } catch (error) {
    res.status(400).json({ message: 'Error registering: ' + error.message });
  }
});

export default router;
