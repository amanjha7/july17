const { logger } = require("../../../src/config/logger");
const { BaseJob } = require("../../base/basejob");
const { ConnectionFilter } = require("../../../src/filters/connectionfilter");
const { getSavedConnection } = require('../../../src/dbhelper/connectiondao')

class RefreshPronnelOauthTokenJob extends BaseJob {
    constructor(appInstanceId) {
        super();
        this.appInstanceId = appInstanceId;
    }
    completed(job) {
        // Optional: add any logic here if needed
    }

    failed(job) {
        // Optional: add any logic here if needed
    }

    async handle(job) {        
        await this.refreshPronnelToken();
    }

    async refreshPronnelToken(){
        const { getPronnelAccessToken } = require('../../../src/services/oauthservice')
        let filter = new ConnectionFilter();
        filter.appInstanceIdArray = this.appInstanceId;
        filter.typeArray = 'pronnel';
        let pronnelResult = await getSavedConnection(filter);
        if (pronnelResult?.length) {
            let pronnelRefreshToken = pronnelResult[0].refresh_token;
            await getPronnelAccessToken(pronnelRefreshToken, pronnelResult[0], true);
        }
    }

}

module.exports = { RefreshPronnelOauthTokenJob };
