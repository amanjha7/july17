const express = require('express');
const {
    saveConfig,
    getConfig,
    getLeads,
    getLeadDetails,
    getLeadEvents,
    getSessionRecording,
    getStats,
    trackEvent,
    identifyVisitor,
    saveSessionRecording,
    serveScript
} = require('../controllers/webtrackercontroller');
const { authenticationMiddleware } = require('../middlewares/authentication');

const router = express.Router();

// Publicly accessible ingestion endpoints
router.post('/track', trackEvent);
router.post('/identify', identifyVisitor);
router.post('/session-recording', saveSessionRecording);
router.get('/script/:token', serveScript);

// Protected/Private Config & Analytics endpoints (Can use middleware if needed, we'll keep it flexible)
router.post('/config', saveConfig);
router.get('/config/:id', getConfig);
router.get('/leads', getLeads);
router.get('/leads/:id', getLeadDetails);
router.get('/leads/:id/events', getLeadEvents);
router.get('/sessions/:sessionId/recording', getSessionRecording);
router.get('/stats', getStats);

module.exports = { router };
