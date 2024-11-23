const qs = require('qs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { ConnectionFilter } = require('../filters/connectionfilter');
const { APP_URLS, REDIRECT_URI, TRIGGER_NAME } = require('../constants/appconstants')
const { saveConnection, getSavedConnection, updateConnection, deleteConnection } = require('../dbhelper/connectiondao')
const { fetchAccessToken } = require('../utils/apputils');
const {logger} = require('../config/logger'); 

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
      redirect_uri: redirectUri
    });
    let returnUrl = `${url}?${params.toString()}&state=${encodeURIComponent(stateToken)}`;
    logger.info('Leaving initiateAuthFlow(). Return Url is : ', returnUrl);
    return returnUrl;
  }

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
      logger.error('Error encountered in validateAndRefreshAccessToken(). Error is : ', err);
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
      logger.error('Error encountered in createNewConnection(). Error is : ', err);
      logger.error('Leaving createNewConnection() from catch block');
      throw err;
    }
  };
  
  const getAccessToken = async (inputToken, context, isRefresh = false) => {
    logger.info('Entering getAccessToken(). Input token : ', inputToken, ' and context : ', context, ' and isRefresh : ', isRefresh);
    // Exchange the authorization code for an access token
    let data = createAccessTokenApiReqData(inputToken, isRefresh);
    let config = {
      method: 'POST',
      url: APP_URLS.ACCESS_TOKEN,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: data // Encode the data as application/x-www-form-urlencoded
    };
    const tokenResponse = await axios.request(config);
    let respData = tokenResponse.data;
    logger.info('Received an access token. Data received is : ', respData);
    //enrich the response object with additional details from the session context 
    respData.pronnel_user_id = context.user_id;
    respData.app_instance_id = context.app_instance_id;
    respData.workfolder_id = context.workfolder_id;
    respData.org_id = context.org_id;
    if (isRefresh) {
      logger.info('Received new access token using refresh token. Now updating the new tokens in already present record.');
      //If we got new access token, we only need to update specific details
      await updateConnectionDetails(respData);
    } else {
      //Check if the connection is an existing one
      let isExisting = await checkIfConnectionExists(respData);
      if (isExisting) {
        logger.info('Received new access for a logged out connection. Now updating the new tokens in already present record.');
        await updateConnectionDetails(respData);
      }
      else {
        //Save the token details in the connection
        await saveConnectionDetails(respData);
      }
    }
  }

  function createAccessTokenApiReqData(inputToken, isRefresh){
    logger.info("Entering createAccessTokenApiReqData().");
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
    logger.info("Leaving createAccessTokenApiReqData().");
    return data;
  }

const checkAccessTokenStatus = async (data) => {
    logger.info('Entering checkAccessTokenStatus(). Data : ', data);
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
        logger.error('Error encountered while fetching saved connection from db. Error is : ', err);
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
        logger.info('Token status api returned HTTP 200, i.e. token is working. Access Token was : ', accessToken);
        return { "status": "success" }
      } else {
        logger.error('Access token is invalid or there was an issue. Access Token : ', accessToken);
        //check if the refresh token is valid, if yes, refresh access token
        if (Date.now() < refreshTokenExpiryTime) {
          logger.info('Refresh token is still not expired. Getting the access token using refresh token.');
          await getAccessToken(data.refresh_token, context);
          return { "status": "success" }
        }
        //Refresh token has also expired, will have to invoke the complete flow again.
        logger.info('Refresh token has also expired. Returning failure status.');
        return { "status": "failure" }
      }
    } catch (error) {
      logger.error('Error checking access token status:', error);
      if (error.response && error.response.status === 404) {
        logger.info('Inside catch block. Access token is invalid.');
      }
      logger.info('Leaving checkAccessTokenStatus().');
      return { "status": "failure" }
    }
  };
  
  const saveConnectionDetails = async (data) => {
    logger.info('Entering saveConnectionDetails(). Data : ', data);
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
      logger.info('Leaving saveConnectionDetails(). Saved connection id = ', result?._id);
      return result?._id;
    }
    catch (err) {
      logger.error('Error envountered while saving connection details. Error is : ', err);
      logger.info('Leaving saveConnectionDetails() from catch block.');
      throw err;
    }
  };
  
  async function checkIfConnectionExists(data) {
    logger.info('Entering checkIfConnectionExists(). Data : ', data);
    let filter = new ConnectionFilter();
    filter.workfolderIdArray = data?.workfolder_id;
    filter.orgIdArray = data?.org_id;
    filter.appInstanceIdArray = data?.app_instance_id;
    filter.pronnelUserIdArray = data?.pronnel_user_id;
    let result = await getSavedConnection(filter);
    if (result.length > 0) {
      logger.info('Leaving checkIfConnectionExists(). Returning TRUE');
      return true;
    }
    else {
      logger.info('Leaving checkIfConnectionExists(). Returning FALSE');
      return false;
    }
  }
  const updateConnectionDetails = async (data) => {
    logger.info('Entering updateConnectionDetails(). Data : ', data);
    let currentTime = Date.now();
    let accessToken = data?.access_token;
    let refreshToken = data?.refresh_token;
    let expiresIn = data?.expires_in;
    let refreshTokenExpiresIn = data?.refresh_token_expires_in;
    let accessTokenExpiryTime = currentTime + (expiresIn * 1000);
    let refreshTokenExpiryTime = currentTime + (refreshTokenExpiresIn * 1000);
      //Now, since the connection details are verified, update the connection details in the database
      let connectionObj = { access_token: accessToken, refresh_token: refreshToken, access_token_expiry_time: accessTokenExpiryTime, refresh_token_expiry_time: refreshTokenExpiryTime };
      let filter = new ConnectionFilter();
      filter.workfolderIdArray = data?.workfolder_id;
      filter.orgIdArray = data?.org_id;
      filter.appInstanceIdArray = data?.app_instance_id;
      filter.pronnelUserIdArray = data?.pronnel_user_id;
      let result = await updateConnection(filter, connectionObj);
      logger.info('Leaving updateConnectionDetails(). Updated connection id : ', result?._id);
      return result._id;
  };

  
const revokeToken = async (data) => {
    logger.info("Entering revokeToken(). Data : ", data);
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
        logger.info("Token revoked successfully");
      } else {
        logger.info('Failed to revoke token');
      }
    } catch (error) {
      logger.error('Error encountered while revoking token. Error is : ', error);
    } finally {
      //Delete the data from the database as well.
      let filter = new ConnectionFilter();
      filter.appInstanceIdArray = appInstanceId;
      try {
        logger.info("Deleting the connection in finally for appInstanceId = ", appInstanceId);
        await deleteConnection(filter);
      }
      catch (err) {
        logger.error('Error encountered while deleting connection for appInstanceId = ', appInstanceId, '. Error is : ', err);
      }
      logger.info('Leaving revokeToken()');
    }
  };

  module.exports = {
    createNewConnection,
    updateConnectionDetails,
    initiateAuthFlow,
    getAccessToken,
    validateAndRefreshAccessToken,
    revokeToken,
    checkAccessTokenStatus
  }