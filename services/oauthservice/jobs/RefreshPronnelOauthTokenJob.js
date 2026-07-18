const { BaseJob } = require('../../base/basejob');

/**
 * RefreshPronnelOauthTokenJob - Job to refresh a Pronnel OAuth token
 */
class RefreshPronnelOauthTokenJob extends BaseJob {
    constructor(appInstanceId) {
        super({ app_instance_id: appInstanceId });
    }
}

module.exports = { RefreshPronnelOauthTokenJob };
