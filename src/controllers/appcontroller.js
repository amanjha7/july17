const { processSubscription, processWebhook, processUnsubscription, processWebhookSample, processEventWebhook, handleTrackingConfigurationService } = require('../services/appservice');
const {logger} = require('../config/logger');

//Function to subscribe the event of the application by saving the webhook of pronnel in db
const handleSubscription = async (req, res) => {
  logger.info(`Entering handleSubscription(). Request Body : ${JSON.stringify(req.body)}`);
  try {
    let type = req.query.type;
    await processSubscription(req.body, type);
    logger.info(`Leaving handleSubscription() after successful subscription.`);
    res.status(200).send('Subscription added successfully.');
  }
  catch (err) {
    logger.error(`Error encountered in handleSubscription(). Error is : ${err}`);
    logger.info(`Leaving handleSubscription() from catch block after unsuccessful subscription.`);
    res.status(500).send('Subscription failed due to some error.');
  }
};

//Function to unsubscribe the event of the application by removing the webhook of pronnel from db
const handleUnsubscription = async (req, res) => {
  logger.info(`Entering handleUnsubscription(). Request Body: ${JSON.stringify(req.body)}`);
  try {
    let type = req.query.type;
    await processUnsubscription(req.body, type);
    logger.info(`Leaving handleUnsubscription() after successful unsubscription.`);
    res.status(200).send('Subscription removed successfully.');
  }
  catch (err) {
    logger.error(`Error encountered in handleUnsubscription(). Error is : ${err}`);
    logger.info(`Leaving handleUnsubscription() from catch block after unsuccessful unsubscription.`);
    res.status(500).send('Unsubscription failed due to some error.');
  }
};

const sendWebhookSample = async (req, res) => {
  logger.info(`Entering sendWebhookSample(). Request Body : ${JSON.stringify(req.body)}`);
  try {
    let type = req.query.type;
    let result = await processWebhookSample(type);
    logger.info(`Leaving sendWebhookSample().`);
    return res.status(200).json(result);
  }
  catch (err) {
    logger.error(`Error encountered in sendWebhookSample(). Error is : ${err}`);
    logger.info(`Leaving sendWebhookSample() from catch block. Webhook invocation failed.`);
    res.status(500).send('Webhook invocation failed due to some error.');
  }
};

const receiveWebhook = async (req, res) => {
  logger.info(`Entering receiveWebhook(). Request Body : ${JSON.stringify(req.body)}`);
  try {
    const event = req.headers['x-github-event'];
    await processWebhook(req.body, event);
    logger.info(`Leaving receiveWebhook()`);
    return res.status(200).json({message:"success"});
  }
  catch (err) {
    logger.error(`Error encountered in receiveWebhook(). Error is : ${err}`);
    logger.info(`Leaving receiveWebhook() from catch block`);
    res.status(500).send('Processing webhook failed due to some error.');
  }
};

const handleEventWebhook = async (req, res) => {
  logger.info('Entering handleEventWebhook(). Request Body : ', req.body);
  try {
    const event = req.body?.event_type;
    processEventWebhook(req.body, event);
    logger.info('Leaving handleEventWebhook()');
    return res.status(200).json({message:"success"});
  }
  catch (err) {
    logger.error('Error encountered in handleEventWebhook(). Error is : ', err);
    logger.info('Leaving handleEventWebhook() from catch block');
    res.status(500).send('Processing webhook failed due to some error.');
  }
}

const handleTrackingConfiguration = async (req, res) => {
  logger.info("Entering handleTrackingConfiguration");
    try {
    let response = await handleTrackingConfigurationService(req.body, req.session.context);
    logger.info('Session recording data received successfully');
    if(response) {
      logger.info(`Session recording result: ${JSON.stringify(response)}`);
      return res.status(200).json(response);
    }
    return res.status(200).json({ message: "Session recording retrieved successfully" });
  } catch (err) {
    logger.error('Error encountered in handleTrackingConfiguration(). Error is : ', err);
    return res.status(500).send('Failed to handleTrackingConfiguration.');
  }
}

module.exports = {
  handleSubscription,
  handleUnsubscription,
  sendWebhookSample,
  receiveWebhook,
  handleEventWebhook,
  handleTrackingConfiguration
}