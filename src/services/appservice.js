const FormData = require('form-data');
const qs = require('qs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { ConnectionFilter } = require('../filters/connectionfilter');
const { WebhookDetailsFilter } = require('../filters/webhookdetailsfilter');
const { APP_URLS, REDIRECT_URI, TRIGGER_NAME } = require('../constants/appconstants')
const { getSavedConnection, deleteConnection } = require('../dbhelper/connectiondao')
const { updateWebhookDetails, getSavedWebhookDetails, deleteWebhookDetails } = require('../dbhelper/webhookdetailsdao');
const { fetchAccessToken } = require('../utils/apputils');
const {logger} = require('../config/logger'); 

const processSubscription = async (data, type) => {
  logger.info('Entering processSubscription(). Data : ', data, ' and Type : ', type);
  //Get the connection id from request
  let appInstanceId = data.context.app_instance_id;
  //Fetch the data related to this connectionId in the database
  let filter = new ConnectionFilter();
  filter.appInstanceIdArray = appInstanceId;
    let result = await getSavedConnection(filter);
    if (result?.length) {
      for (let conn of result) {
        let inputObj = {};
        inputObj.automation_id = data.automation_id;
        inputObj.connection_id = conn._id;
        inputObj.pronnel_webhook_url = data.pronnel_webhook_url;
        inputObj.trigger_type = type;
        if (data?.context?.field_details) {
          inputObj.field_details = data?.context?.field_details;
        }

        let webhookDetailsFilter = new WebhookDetailsFilter();
        webhookDetailsFilter.automationIdArray = data.automation_id;
        webhookDetailsFilter.connectionIdArray = conn._id;
        webhookDetailsFilter.pronnelWebhookUrlArray = data.pronnel_webhook_url;

        await updateWebhookDetails(webhookDetailsFilter, inputObj);
      }
    }
    logger.info('Leaving processSubscription()');
  
};

const processUnsubscription = async (data, type) => {
  logger.info('Entering processUnsubscription(). Data : ', data, ' and Type : ', type);
  //Get the connection id from request
  let appInstanceId = data.appInstanceId;
  //Fetch the data related to this connectionId in the database
  let filter = new ConnectionFilter();
  filter.appInstanceIdArray = appInstanceId;
  
    let result = await getSavedConnection(filter);
    if (result?.length) {
      for (let conn of result) {
        let filter = new WebhookDetailsFilter();
        filter.automation_id = data.automationId;
        filter.connection_id = conn._id;
        filter.pronnel_webhook_url = data.pronnel_webhook_url;
        filter.trigger_type = type;
        await deleteWebhookDetails(filter);
      }
    }
  logger.info('Leaving processUnsubscription()');
};

const processWebhookSample = async (type) => {
  logger.info('Entering processWebhookSample(). Type Received : ', type);
  let dataObj = {}
  switch (type) {
    case TRIGGER_NAME.BRANCH_CREATED: dataObj = JSON.parse(BRANCH_CREATED_SAMPLE);
      break;
    case TRIGGER_NAME.BRANCH_DELETED: dataObj = JSON.parse(BRANCH_DELETED_SAMPLE);
      break;
    case TRIGGER_NAME.COMMIT_CREATED: dataObj = JSON.parse(COMMIT_CREATED_SAMPLE);
      break;
    case TRIGGER_NAME.PULL_REQ_CREATED: dataObj = JSON.parse(PULL_REQ_CREATED_SAMPLE);
      break;
    case TRIGGER_NAME.PULL_REQ_MERGED: dataObj = JSON.parse(PULL_REQ_MERGED_SAMPLE);
      break;
    case TRIGGER_NAME.PULL_REQ_COMMENTED: dataObj = JSON.parse(PULL_REQ_COMMENTED_SAMPLE);
      break;

  }
  logger.info('Leaving processWebhookSample()');
  return dataObj;
};

async function invokeWebhook(catchookUrl, data) {
  logger.info('Entering invokeWebhook(). Catchhook url = ', catchookUrl, ' and data = ', data);
  let hexSignature = generateCryptoSignature(data, process.env.APP_SIGNING_SECRET);
  let config = {
    method: 'POST',
    url: process.env.PRONNEL_HOST_URL + catchookUrl,
    headers: {
      'Accept': 'application/json',
      "x-signature-sha256": `sha256=${hexSignature}`
    },
    data: data
  }
  try {
    const response = await axios.request(config);
    if (response?.status == 200) {
      logger.info('Leaving invokeWebhook() with HTTP status 200. Webhook successfully invoked');
    }
    else {
      logger.info('Leaving invokeWebhook() with HTTP status != 200 . Webhook could not be successfully invoked');
    }
  }
  catch (err) {
    logger.error('Error encountered in invokeWebhook(). Error is : ', err);
    logger.info('Leaving invokeWebhook() from catch block.')
    throw err;
  }
}

const processWebhook = async (payload, event) => {
  logger.info('Entering processWebhook(). Payload : ', payload, ' and event : ', event);
  try {
    let triggerType = determineTriggerType(event, payload);
    let filter = new WebhookDetailsFilter();
    filter.triggerTypeArray = triggerType;
    let result = await getSavedWebhookDetails(filter);
    switch (triggerType) {
      case TRIGGER_NAME.BRANCH_CREATED:
      case TRIGGER_NAME.BRANCH_DELETED:
        await handleBranchWebhook(payload, result);
        break;
      default:
        logger.info('Inside process webhook switch. Encountered unhandled triggerType case!');
    }
    logger.info('Leaving processWebhook()');
  }
  catch (err) {
    logger.error('Error encountered in processWebhook(). Error is : ', err);
    throw err;
  }
};

async function handleBranchWebhook(payload, dbResult) {
  let sourceRepoId = payload?.repository?.id;
  if (dbResult?.length) {
    for (let res of dbResult) {
      let catchHookUrl = res.pronnel_webhook_url;
      let field_details = res?.field_details;
      let fixed_fields = field_details?.fixed_fields;
      if (fixed_fields) {
        let repoId = fixed_fields?.repository?.field_value?.value;
        if (sourceRepoId === repoId) {
          await invokeWebhook(catchHookUrl, payload);
        }
      }
    }
  }
}

function determineTriggerType(event, payload) {
  let triggerType;
  switch (event) {
    case 'create':
      if (payload.ref_type === 'branch') {
        triggerType = TRIGGER_NAME.BRANCH_CREATED
      }
      break;
    case 'delete':
      if (payload.ref_type === 'branch') {
        triggerType = TRIGGER_NAME.BRANCH_DELETED
      }
      break;
    case 'pull_request':
      if (payload.action === 'opened') {
        triggerType = TRIGGER_NAME.PULL_REQ_CREATED
      }
      else if (payload.action === 'closed' && payload?.pull_request?.merged) {
        triggerType = TRIGGER_NAME.PULL_REQ_MERGED
      }
      break;
    case 'pull_request_review_comment':
      if (payload.action === 'created') {
        triggerType = TRIGGER_NAME.PULL_REQ_COMMENTED
      }
    case 'push':
      if (payload.commits && payload.commits?.length > 0) {
        triggerType = TRIGGER_NAME.COMMIT_CREATED;
      }
    default:
      logger.info(`Unhandled event: ${event}`);
  }
  return triggerType;
}


//####  SAMPLE GET and POST calls  ####
/* const getPullRequestList = async (data) => {
  let accessToken = await fetchAccessToken(data);
  let fixed_fields = data?.field_details?.fixed_fields;
  let owner = fixed_fields.repo_owner?.field_value;
  let repo = fixed_fields.repo_name?.field_value;

  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    headers: createGitHubApiHeader(accessToken)
  });

  return response.data.map(obj => ({
    label: obj.title,
    value: obj.number
  }));
};


const createPullRequestComment = async (data) => {
  let fixed_fields = data?.field_details?.fixed_fields;
  let accessToken = await fetchAccessToken(data);
  let owner = fixed_fields.repo_owner?.field_value;
  let repo = fixed_fields.repo_name?.field_value;
  let pullNumber = fixed_fields.pull_number?.field_value;

  await axios.post(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/comments`, {
    body: 'Great stuff!',
    commit_id: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    path: 'file1.txt',
    start_line: 1,
    start_side: 'RIGHT',
    line: 2,
    side: 'RIGHT'
  }, {
    headers: createGitHubApiHeader(accessToken)
  });
};

const updatePullRequest = async (data) => {
  let fixed_fields = data?.field_details?.fixed_fields;
  let accessToken = await fetchAccessToken(data);
  let owner = fixed_fields.repo_owner?.field_value;
  let repo = fixed_fields.repo_name?.field_value;
  let pullNumber = fixed_fields.pull_number?.field_value;
  let title = fixed_fields.title?.field_value;
  let body = fixed_fields.body?.field_value;
  let state = fixed_fields.state?.field_value;

  let details = await getPullRequestDetails(owner, repo, pullNumber, accessToken);
  let base = details ? details.base.ref : 'master';

  await axios.patch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    title: title,
    body: body,
    state: state,
    base: base
  }, {
    headers: createGitHubApiHeader(accessToken)
  });
};
*/


module.exports = {
  processSubscription,
  processUnsubscription,
  processWebhookSample,
  processWebhook
}