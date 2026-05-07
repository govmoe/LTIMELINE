const express = require('express');
const router = express.Router();
const users = require('../data/users');

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

router.get('/timelines', requireAuth, (req, res) => {
  const timelines = users.getUserTimelines(req.user.id);
  res.json({ timelines });
});

router.post('/timelines', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Timeline name is required' });
  }
  
  const timeline = users.createTimeline(req.user.id, name);
  if (timeline) {
    res.json({ success: true, timeline });
  } else {
    res.status(500).json({ error: 'Failed to create timeline' });
  }
});

router.get('/timelines/:timelineId', requireAuth, (req, res) => {
  const timeline = users.getTimelineById(req.user.id, req.params.timelineId);
  if (timeline) {
    res.json({ timeline });
  } else {
    res.status(404).json({ error: 'Timeline not found' });
  }
});

router.put('/timelines/:timelineId', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Timeline name is required' });
  }
  
  const timeline = users.updateTimeline(req.user.id, req.params.timelineId, name);
  if (timeline) {
    res.json({ success: true, timeline });
  } else {
    res.status(404).json({ error: 'Timeline not found' });
  }
});

router.delete('/timelines/:timelineId', requireAuth, (req, res) => {
  const success = users.deleteTimeline(req.user.id, req.params.timelineId);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Timeline not found' });
  }
});

router.post('/timelines/:timelineId/events', requireAuth, (req, res) => {
  const { date, time, title, description, color } = req.body;
  if (!date || !title) {
    return res.status(400).json({ error: 'Date and title are required' });
  }
  
  const event = users.addEvent(req.user.id, req.params.timelineId, {
    date,
    time: time || '',
    title,
    description: description || '',
    color: color || '#4CAF50'
  });
  
  if (event) {
    res.json({ success: true, event });
  } else {
    res.status(404).json({ error: 'Timeline not found' });
  }
});

router.put('/timelines/:timelineId/events/:eventId', requireAuth, (req, res) => {
  const { date, time, title, description, color } = req.body;
  
  const event = users.updateEvent(req.user.id, req.params.timelineId, req.params.eventId, {
    date,
    time: time || '',
    title,
    description: description || '',
    color: color || '#4CAF50'
  });
  
  if (event) {
    res.json({ success: true, event });
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

router.delete('/timelines/:timelineId/events/:eventId', requireAuth, (req, res) => {
  const success = users.deleteEvent(req.user.id, req.params.timelineId, req.params.eventId);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

module.exports = router;