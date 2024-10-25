const { validateAndRefreshAccessToken, processSubscription, processWebhook, createNewConnection, processUnsubscription, processWebhookSample, updateConnectionDetails, initiateAuthFlow, getAccessToken, revokeToken, checkAccessTokenStatus } = require('../services/appservice');
const jwt = require('jsonwebtoken');
const {logger} = require('../config/logger');

//Initiate auth flow
const handleAuthInitiation = async (req, res) => {
  logger.info('Entering handleAuthInitiation(). Request body is : ', req.body);
  try {
    let context = req.session.context;
    //Check if the connection already exists, then directly redirect to the return url
    let isValidToken = await validateAndRefreshAccessToken(context);
    if (isValidToken) {
      logger.info('Token is already valid. Redirecting with success status to ', context.return_url);
      res.redirect(context.return_url + '?success=true');
    }
    else {
      logger.info('Token is invalid. Initiating the auth flow again.')
      let authUrl = await initiateAuthFlow(context);
      logger.info('Leaving handleAuthInitiation(). Token is already valid. Redirecting with success status to ', context.return_url);
      res.redirect(authUrl);
    }
  }
  catch (err) {
    logger.error('Error encountered in handleAuthInitiation function', err);
    logger.info('Leaving handleAuthInitiation from catch block');
    res.status(500).send('Auth handling failed due to some error.');
  }
};

//Handle the callback received from the target application, i.e. GITHUB
const handleCallback = async (req, res) => {
  logger.info('Entering handleCallback(). Request Body is : ', req.body);
  const authorizationCode = req.query.code;
  const stateToken = req.query.state;
  if (!authorizationCode) {
    logger.info('Leaving handleCallback(). Auth code is missing.');
    return res.status(400).send('Authorization code is missing');
  }
  const context = jwt.verify(decodeURIComponent(stateToken), process.env.SIGNING_JWT_SECRET);
  try {
    await getAccessToken(authorizationCode, context);
    let returnUrl = context.return_url + '?success=true';
    logger.info('Leaving handleCallback(). Redirecting with success status to', returnUrl);
    res.redirect(returnUrl);
  } catch (error) {
    logger.error('Error encountered in handleCallback(). Error exchanging authorization code for token:', error);
    let returnUrl = context.return_url + '?success=false';
    logger.info('Leaving handleCallback() from catch block. Redirecting with false status to ', returnUrl);
    res.redirect(returnUrl);
  }
};

const revokeAccessToken = async (req, res) => {
  logger.info('Entering revokeAccessToken(). Request body : ', req.body);
  try {
    await revokeToken(req.body);
    logger.info("Leaving revokeAccessToken() with success status.");
    res.status(200).send({ "status": "success" });
  } catch (error) {
    console.error('Error encountered in revokeAccessToken(). Error is : ', error);
    console.info('Leaving revokeAccessToken() from catch block with failure status.')
    res.status(500).send({ "status": "failure" });
  }
};

//Function to subscribe the event of the application by saving the webhook of pronnel in db
const handleSubscription = async (req, res) => {
  logger.info('Entering handleSubscription(). Request Body : ', req.body);
  try {
    let type = req.query.type;
    await processSubscription(req.body, type);
    logger.info('Leaving handleSubscription() after successful subscription.');
    res.status(200).send('Subscription added successfully.');
  }
  catch (err) {
    logger.error('Error encounterd in handleSubscription(). Error is : ', err);
    logger.info('Leaving handleSubscription() from catch block after unsuccessful subscription.');
    res.status(500).send('Subscription failed due to some error.');
  }
};

//Function to unsubscribe the event of the application by removing the webhook of pronnel from db
const handleUnsubscription = async (req, res) => {
  logger.info('Entering handleUnsubscription(). Request Body:', req.body);
  try {
    let type = req.query.type;
    await processUnsubscription(req.body, type);
    logger.info('Leaving handleUnsubscription() after successful unsubscription.');
    res.status(200).send('Subscription removed successfully.');
  }
  catch (err) {
    logger.error('Error encountered in handleUnsubscription(). Error is : ', err);
    logger.info('Leaving handleUnsubscription() from catch block after unsuccessful unsubscription.');
    res.status(500).send('Unsubscription failed due to some error.');
  }
};

//Create connection record which stored app instance related info and context data
const createConnection = async (req, res) => {
  logger.info('Entering createConnection(). Request Body : ', req.body);
  try {
    let id = await createNewConnection(req.body);
    logger.info('Leaving createConnection(). Request Body : ', req.body);
    res.status(200).json({ message: 'Connection details saved.', connection_id: id });
  }
  catch (err) {
    logger.error('Error encountered in createConnection().createConnection(). Request Body : ', req.body);
    logger.info('Leaving createConnection() from catch block. Request Body : ', req.body);
    res.status(500).json({ message: 'Connection creation failed due to some error.' });
  }
};

const updateConnection = async (req, res) => {
  logger.info('Entering updateConnection(). Request Body : ', req.body)
  try {
    let id = await updateConnectionDetails(req.body);
    logger.info('Leaving updateConnection(). Connection id : ', id);
    res.status(200).json({ message: 'Connection details saved.', connection_id: id });
  }
  catch (err) {
    logger.error('Error encountered in updateConnection(). Error is : ', err);
    logger.info('Leaving updateConnection() from catch block. Connection creation failed.');
    res.status(500).json({ message: 'Connection creation failed due to some error.' });
  }
};

const sendWebhookSample = async (req, res) => {
  logger.info('Entering sendWebhookSample(). Request Body : ', req.body);
  try {
    let type = req.query.type;
    let result = await processWebhookSample(type);
    logger.info('Leaving sendWebhookSample().');
    return res.status(200).json(result);
  }
  catch (err) {
    logger.error('Error encountered in sendWebhookSample(). Error is : ', err);
    logger.info('Leaving sendWebhookSample() from catch block. Webhook invocation failed.');
    res.status(500).send('Webhook invocation failed due to some error.');
  }
};

const checkConnectionValidity = async (req, res) => {
  logger.info('Entering checkConnectionValidity(). Request Body : ', req.body);
  try {
    let result = await checkAccessTokenStatus(req.body);
    logger.info('Leaving checkConnectionValidity(). Result :', result);
    return res.status(200).json(result);
  }
  catch (err) {
    logger.error('Error encountered in checkConnectionValidity(). Error is : ', err);
    logger.info('Leaving checkConnectionValidity() from catch block');
    res.status(500).send('Issue in checking connection validity.');
  }
};

const receiveWebhook = async (req, res) => {
  logger.info('Entering receiveWebhook(). Request Body : ', req.body);
  try {
    const event = req.headers['x-github-event'];
    await processWebhook(req.body, event);
    logger.info('Leaving receiveWebhook()');
    return res.status(200).json({message:"success"});
  }
  catch (err) {
    logger.error('Error encountered in receiveWebhook(). Error is : ', err);
    logger.info('Leaving receiveWebhook() from catch block');
    res.status(500).send('Processing webhook failed due to some error.');
  }
};


module.exports = {
  handleSubscription,
  handleUnsubscription,
  createConnection,
  updateConnection,
  sendWebhookSample,
  handleCallback,
  handleAuthInitiation,
  checkConnectionValidity,
  revokeAccessToken,
  receiveWebhook
}