const jwt = require('jsonwebtoken');

async function authenticationMiddleware(req, res, next) {
  try {
    let { authorization } = req.headers;
    if (!authorization && req.query) {
      authorization = req.query.token;
    }
    if (!authorization) {
      authorization = req.body.sessionToken;
    }
    const { app_id, app_version_id, client_id, org_id, user_id, return_url, app_instance_id, workfolder_id } = jwt.verify(
      authorization,
      process.env.APP_SIGNING_SECRET
    );
    //Setting the required values in the session so that these can be retrieved subsequently
    let context = { app_id: app_id, app_version_id: app_version_id, client_id: client_id, org_id: org_id, user_id: user_id, return_url: return_url, app_instance_id: app_instance_id, workfolder_id:workfolder_id }
    let reqSession = req.session;
    reqSession.context = context;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'not authenticated' });
  }
}

module.exports = { authenticationMiddleware };