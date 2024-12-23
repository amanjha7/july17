const express = require('express');
const {
  createConnection,
  updateConnection,
  handleCallback,
  handleAuthInitiation,
  checkConnectionValidity,
  revokeAccessToken,
  handlePronnelCallback
} = require('../controllers/oauthcontroller');
const { authenticationMiddleware } = require('../middlewares/authentication');
const router = express.Router();

//GET endpoint to receive the auth call from oauth initiator application
router.get('/init', authenticationMiddleware, handleAuthInitiation);
router.get('/callback', handleCallback)
router.get('/pronnel/callback', handlePronnelCallback);

// POST endpoints related to connection
router.post('/connection', authenticationMiddleware, createConnection);
router.patch('/connection/update', authenticationMiddleware, updateConnection);
router.post("/connection/validate", checkConnectionValidity);
router.delete("/revoke", revokeAccessToken);

module.exports = { router };