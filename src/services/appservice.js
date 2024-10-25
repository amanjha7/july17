const FormData = require('form-data');
const qs = require('qs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { ConnectionFilter } = require('../filters/connectionfilter');
const { WebhookDetailsFilter } = require('../filters/webhookdetailsfilter');
const { APP_URLS, REDIRECT_URI, TRIGGER_NAME } = require('../constants/appconstants')
const { saveConnection, getSavedConnection, updateConnection, deleteConnection } = require('../dbhelper/connectiondao')
const { updateWebhookDetails, getSavedWebhookDetails, deleteWebhookDetails } = require('../dbhelper/webhookdetailsdao');
const { createGitHubApiHeader } = require('../utils/apputils');
const { fetchAccessToken } = require('../utils/apputils');

const initiateAuthFlow = async (context) => {
  logger.info('Entering initiateAuthFlow(). Context received is : ', context);
  //We'll take the returnUrl from the pronnel token that is received in the authorize request
  const url = APP_URLS.GITHUB_AUTHORIZE;
  const clientId = process.env.APP_CLIENT_ID;
  const redirectUri = REDIRECT_URI;
  //const scope = "repo, user";
  const allow_signup = "true"; //this will allow user to sign up if it doesn't have an account.
  const prompt = "select_account" //this will enable the user to select one out of multiple accounts

  //Encode the context and send in state
  const stateToken = jwt.sign(context, process.env.SIGNING_JWT_SECRET, { expiresIn: '10m' });
  // Generate OAuth URL and include the JWT in the state parameter
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    //scope: scope,
    allow_signup: allow_signup,
    prompt: prompt,
    state: stateToken
  });
  let returnUrl = `${url}?${params.toString()}&state=${encodeURIComponent(stateToken)}`;
  logger.info('Leaving initiateAuthFlow(). Return Url is : ', returnUrl);
  return returnUrl;
}

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

const validateAndRefreshAccessToken = async function (context) {
  logger.info('Entering validateAndRefreshAccessToken(). Context received : ', context);
  let filter = new ConnectionFilter();
  filter.appInstanceIdArray = context.app_instance_id;
  filter.pronnelUserIdArray = context.user_id;
  filter.workfolderIdArray = context.workfolder_id;
  filter.orgIdArray = context.org_id;
  try {
    let result = await getSavedConnection(filter);
    if (result?.length) {
      let data = result[0];
      let currentTime = Date.now();
      let accessTokenExpTime = data?.access_token_expiry_time;
      if (currentTime > accessTokenExpTime) {
        //Access token has expired, checking for refresh token expiry time
        let refreshTokenExpiryTime = data?.refresh_token_expiry_time;
        if (currentTime > refreshTokenExpiryTime) {
          //Refresh token has also expired, will have to invoke the complete flow again.
          logger.info('Leaving validateAndRefreshAccessToken(). currentTime > refreshTokenExpiryTime, hence returning false');
          return false;
        }
        else {
          //Refresh token has not expired yet, use it to get new access_token
          await getAccessToken(data.refresh_token, context);
          logger.info('Leaving validateAndRefreshAccessToken(). New access token acquired, hence returning true');
          return true;
        }
      }
      else {
        logger.info('Leaving validateAndRefreshAccessToken(). currentTime < accessTokenExpTime, hence returning true');
        return true;
      }
    }
  }
  catch (err) {
    logger.error('Error encountered in validateAndRefreshAccessToken(). Error is : ', err.message);
    logger.info('Leaving validateAndRefreshAccessToken() from catch block.');
    //some error occurred while saving details
    return false;
  }
}

const createNewConnection = async (data) => {
  logger.info('Entering createNewConnection(). Data : ', data);
  let accountId = data?.accountId;
  let accessToken = data?.access_token;
  let config = {
    method: 'GET',
    url: `${APP_URLS.SYSTEM_INFO}`,
    headers: {
      'Accept': 'application/json',
      'access-token': accessToken
    }
  }
  try {
    //Test the connection details by invoking an api of ring.io
    const response = await axios.request(config);
    if (response?.result) {
      //Now, since the connection details are verified, save the connection details in the database
      let connectionObj = { name: data?.name, account_id: accountId, api_token: accessToken, pronnel_user_id: data?.userId, app_instance_id: data?.app_instance_id };
      let result = await saveConnection(connectionObj);
      logger.info('Leaving createNewConnection(). New connection created. Connection id : ', result._id);
      return result._id;
    }
  }
  catch (err) {
    logger.error('Error encountered in createNewConnection(). Error is : ', err.message);
    logger.error('Leaving createNewConnection() from catch block');
    console.log(err)
    throw err;
  }
};

const getAccessToken = async (inputToken, context, isRefresh = false) => {
  logger.info('Entering getAccessToken(). Input token : ', inputToken, ' and context : ', context, ' and isRefresh : ', isRefresh);
  // Exchange the authorization code for an access token
  let data = {};
  if (isRefresh) {
    logger.info('Going for a refresh token.');
    data = qs.stringify({
      client_id: process.env.APP_CLIENT_ID, client_secret: process.env.APP_CLIENT_SECRET,
      grant_type: 'refresh_token', refresh_token: inputToken
    });
  }
  else {
    logger.info('Going for an access token.');
    data = qs.stringify({
      code: inputToken, redirect_uri: REDIRECT_URI, client_id: process.env.APP_CLIENT_ID,
      client_secret: process.env.APP_CLIENT_SECRET
    });
  }
  let config = {
    method: 'POST',
    url: APP_URLS.APP_ACCESS_TOKEN,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data // Encode the data as application/x-www-form-urlencoded
  };
  const tokenResponse = await axios.request(config);
  let respData = tokenResponse.data;
  console.log('Access Token Response:', respData);
  //enrich the response object with additional details from the session context 
  respData.pronnel_user_id = context.user_id;
  respData.app_instance_id = context.app_instance_id;
  respData.workfolder_id = context.workfolder_id;
  respData.org_id = context.org_id;
  if (isRefresh) {
    //If we got new access token, we only need to update specific details
    await updateConnectionDetails(respData);
  } else {
    //Check if the connection is an existing one
    let isExisting = await checkIfConnectionExists(respData);
    if (isExisting) {
      await updateConnectionDetails(respData);
    }
    else {
      //Save the token details in the connection
      await saveConnectionDetails(respData);
    }
  }
}

const revokeToken = async (data) => {
  let appInstanceId = data.context?.app_instance_id;
  let accessToken = await fetchAccessToken(data);
  const clientId = process.env.APP_CLIENT_ID;
  try {
    const response = await axios.delete(`https://api.github.com/applications/${clientId}/grant`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      data: {
        access_token: accessToken
      }
    });
    if (response.status === 204) {
      console.log("Token revoked successfully");
    } else {
      console.error('Failed to revoke token');
    }
  } catch (error) {
    console.error('Error revoking token:', error);
  } finally {
    //Delete the data from the database as well.
    let filter = new ConnectionFilter();
    filter.appInstanceIdArray = appInstanceId;
    try {
      await deleteConnection(filter);
    }
    catch (err) {
      console.log(err);
    }
  }
};


const checkAccessTokenStatus = async (data) => {
  try {
    let accessToken;
    let refreshTokenExpiryTime;
    //Get the connection id from request
    let appInstanceId = data.context.app_instance_id;
    //Fetch the data related to this connectionId in the database
    let filter = new ConnectionFilter();
    filter.appInstanceIdArray = appInstanceId;
    try {
      let result = await getSavedConnection(filter);
      if (result?.length) {
        accessToken = result[0].access_token;
        refreshTokenExpiryTime = result[0]?.refresh_token_expiry_time;
      }
      else {
        return { "status": "failure" }
      }
    }
    catch (err) {
      console.log(err);
      throw err;
    }
    const clientId = process.env.APP_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const response = await axios.post(`https://api.github.com/applications/${clientId}/token`, {
      access_token: accessToken
    }, {
      auth: {
        username: clientId,
        password: clientSecret
      },
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (response.status === 200) {
      console.log('Access token is valid:', response.data);
      return { "status": "success" }
    } else {
      console.error('Access token is invalid or there was an issue.');
      //check if the refresh token is valid, if yes, refresh access token
      if (Date.now() < refreshTokenExpiryTime) {
        await getAccessToken(data.refresh_token, context);
        return { "status": "success" }
      }
      //Refresh token has also expired, will have to invoke the complete flow again.
      return { "status": "failure" }
    }
  } catch (error) {
    console.error('Error checking access token status:', error);
    if (error.response && error.response.status === 404) {
      console.log('Access token is invalid.');
    }
    return { "status": "failure" }
  }
};

const saveConnectionDetails = async (data) => {
  let currentTime = Date.now();
  let accessToken = data?.access_token;
  let refreshToken = data?.refresh_token;
  let expiresIn = data?.expires_in;
  let refreshTokenExpiresIn = data?.refresh_token_expires_in;
  let accessTokenExpiryTime = currentTime + (expiresIn * 1000);
  let refreshTokenExpiryTime = currentTime + (refreshTokenExpiresIn * 1000);
  try {
    let connectionObj = { access_token: accessToken, refresh_token: refreshToken, pronnel_user_id: data?.pronnel_user_id, access_token_expiry_time: accessTokenExpiryTime, refresh_token_expiry_time: refreshTokenExpiryTime, app_instance_id: data?.app_instance_id, org_id: data?.org_id, workfolder_id: data?.workfolder_id };
    let result = await saveConnection(connectionObj);
    return result._id;
  }
  catch (err) {
    console.log(err)
    throw err;
  }
};

async function checkIfConnectionExists(data) {
  let filter = new ConnectionFilter();
  filter.workfolderIdArray = data?.workfolder_id;
  filter.orgIdArray = data?.org_id;
  filter.appInstanceIdArray = data?.app_instance_id;
  filter.pronnelUserIdArray = data?.pronnel_user_id;
  let result = await getSavedConnection(filter);
  if (result.length > 0) {
    return true;
  }
  else {
    return false;
  }
}
const updateConnectionDetails = async (data) => {
  let currentTime = Date.now();
  let accessToken = data?.access_token;
  let refreshToken = data?.refresh_token;
  let expiresIn = data?.expires_in;
  let refreshTokenExpiresIn = data?.refresh_token_expires_in;
  let accessTokenExpiryTime = currentTime + (expiresIn * 1000);
  let refreshTokenExpiryTime = currentTime + (refreshTokenExpiresIn * 1000);
  try {
    //Now, since the connection details are verified, update the connection details in the database
    let connectionObj = { access_token: accessToken, refresh_token: refreshToken, access_token_expiry_time: accessTokenExpiryTime, refresh_token_expiry_time: refreshTokenExpiryTime };
    let filter = new ConnectionFilter();
    filter.workfolderIdArray = data?.workfolder_id;
    filter.orgIdArray = data?.org_id;
    filter.appInstanceIdArray = data?.app_instance_id;
    filter.pronnelUserIdArray = data?.pronnel_user_id;
    let result = await updateConnection(filter, connectionObj);
    return result._id;
  }
  catch (err) {
    console.log(err)
    throw err;
  }
};

const processWebhookSample = async (type) => {
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
  return dataObj;
};


async function invokeWebhook(catchookUrl, data) {
  let config = {
    method: 'POST',
    url: process.env.PRONNEL_HOST_URL + catchookUrl,
    headers: {
      'Accept': 'application/json',
    },
    data: data
  }
  try {
    const response = await axios.request(config);
    if (response?.request_id) {
      console.log('Webhook successfully invoked');
    }
  }
  catch (err) {
    console.log('Webhook invocation failed');
    console.log(err)
    throw err;
  }
}

const processWebhook = async (payload, event) => {
  console.log('Processing webhook:', payload);
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
        console.log(`Unhandled event: ${event}`);
    }
    return triggerType;
  }
  catch (err) {
    console.log(err)
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
      console.log(`Unhandled event: ${event}`);
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
  createNewConnection,
  processWebhookSample,
  processWebhook,
  updateConnectionDetails,
  initiateAuthFlow,
  getAccessToken,
  validateAndRefreshAccessToken,
  revokeToken,
  checkAccessTokenStatus
}