import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import NewsletterSubscriber from '../models/NewsletterSubscriber.js';
import NewsletterCampaign from '../models/NewsletterCampaign.js';
import { sendNewsletterBroadcast } from '../utils/email.js';

const router = express.Router();

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe an email to the newsletter
// @access  Public
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    let subscriber = await NewsletterSubscriber.findOne({ email: email.toLowerCase() });
    
    if (subscriber) {
      if (!subscriber.isActive) {
        subscriber.isActive = true;
        subscriber.subscribedAt = Date.now();
        await subscriber.save();
        return res.status(200).json({ message: 'Resubscribed successfully', subscriber });
      }
      return res.status(400).json({ message: 'Email is already subscribed' });
    }

    subscriber = new NewsletterSubscriber({
      email: email.toLowerCase(),
      isActive: true,
      userId: req.user ? req.user._id : null
    });

    await subscriber.save();
    
    res.status(201).json({ message: 'Subscribed successfully', subscriber });
  } catch (error) {
    console.error('Subscribe Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe an email from the newsletter
// @access  Public
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const subscriber = await NewsletterSubscriber.findOne({ email: email.toLowerCase() });
    
    if (!subscriber) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = Date.now();
    await subscriber.save();
    
    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/newsletter/subscribers
// @desc    Get all active subscribers
// @access  Admin
router.get('/subscribers', protect, isAdmin, async (req, res) => {
  try {
    const subscribers = await NewsletterSubscriber.find({ isActive: true }).sort('-subscribedAt');
    res.json(subscribers);
  } catch (error) {
    console.error('Get Subscribers Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/newsletter/campaigns
// @desc    Get all newsletter campaigns
// @access  Admin
router.get('/campaigns', protect, isAdmin, async (req, res) => {
  try {
    const campaigns = await NewsletterCampaign.find()
      .populate('sentBy', 'name email')
      .sort('-createdAt');
    res.json(campaigns);
  } catch (error) {
    console.error('Get Campaigns Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/newsletter/send
// @desc    Send a newsletter broadcast to all active subscribers
// @access  Admin
router.post('/send', protect, isAdmin, async (req, res) => {
  try {
    const { subject, htmlContent } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({ message: 'Subject and HTML content are required' });
    }

    // Get all active subscribers
    const subscribers = await NewsletterSubscriber.find({ isActive: true });
    
    if (subscribers.length === 0) {
      return res.status(400).json({ message: 'No active subscribers found' });
    }

    const recipientEmails = subscribers.map(sub => sub.email);

    // Save campaign record first as 'Sending'
    const campaign = new NewsletterCampaign({
      subject,
      htmlContent,
      sentBy: req.user._id,
      recipientCount: recipientEmails.length,
      status: 'Sending'
    });
    await campaign.save();

    // Broadcast email
    const result = await sendNewsletterBroadcast(subject, htmlContent, recipientEmails);

    if (result.success) {
      campaign.status = 'Completed';
      await campaign.save();
      res.status(200).json({ message: 'Newsletter broadcasted successfully', campaign });
    } else {
      campaign.status = 'Failed';
      await campaign.save();
      res.status(500).json({ message: 'Failed to broadcast newsletter', error: result.error });
    }

  } catch (error) {
    console.error('Send Newsletter Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
