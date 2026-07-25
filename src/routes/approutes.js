const express = require('express');
const {
  handleSubscription,
  handleUnsubscription,
  sendWebhookSample,
  receiveWebhook,
  handleEventWebhook,
  handleTrackingConfiguration
} = require('../controllers/appcontroller');
const { authenticationMiddleware } = require('../middlewares/authentication');
const router = express.Router();

// POST endpoint for subscription of the pronnel webhook
router.post('/subscribe', authenticationMiddleware, handleSubscription);

// POST endpoint to cancel subscription of the pronnel webhook
router.post('/unsubscribe', authenticationMiddleware, handleUnsubscription);

// Webhook - for sending sample response to pronnel
router.post("/webhook/sample", sendWebhookSample);

// Webhook - for configuration in the app
router.post("/common/webhook", receiveWebhook);

router.post("/event/webhook", handleEventWebhook);
router.post('/tracking/configendpoint', authenticationMiddleware, handleTrackingConfiguration)

module.exports = { router };