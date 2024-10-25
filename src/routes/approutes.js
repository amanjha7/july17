const express = require('express');
const {
  handleSubscription,
  handleUnsubscription,
  createConnection,
  sendWebhookSample,
  updateConnection,
  receiveWebhook,
  handleCallback,
  handleAuthInitiation,
  checkConnectionValidity,
  revokeAccessToken,
} = require('../controllers/appcontroller');
const { authenticationMiddleware } = require('../middlewares/authentication');
const router = express.Router();

//GET endpoint to receive the auth call from oauth initiator application
router.get('/auth', authenticationMiddleware, handleAuthInitiation);
router.get('/callback', handleCallback)

// POST endpoint for subscription of the pronnel webhook
router.post('/subscribe', authenticationMiddleware, handleSubscription);

// POST endpoint to cancel subscription of the pronnel webhook
router.post('/unsubscribe', authenticationMiddleware, handleUnsubscription);

// Webhook - for sending sample response to pronnel
router.get("/webhook/sample", sendWebhookSample);

// POST endpoints related to connection
router.post('/connection', authenticationMiddleware, createConnection);
router.patch('/connection/update', authenticationMiddleware, updateConnection);
router.post("/connection/validate", checkConnectionValidity);
router.delete("/auth/revoke", revokeAccessToken);

// Webhook - for configuration in the app
router.post("/common/webhook", receiveWebhook);

module.exports = { router };