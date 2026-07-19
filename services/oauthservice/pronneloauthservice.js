const { BaseService } = require('../base/baseservice');
const { logger } = require('../../src/config/logger');

/**
 * PronnelOauthService - Singleton service for managing Pronnel OAuth token refresh
 * Refreshes OAuth tokens every 7 days via cron
 */
class PronnelOauthService extends BaseService {
    constructor() {
        super('PronnelOauthService');
    }

    static getInstance() {
        if (!PronnelOauthService._instance) {
            PronnelOauthService._instance = new PronnelOauthService();
        }
        return PronnelOauthService._instance;
    }

    start() {
        super.start(async (bullJob) => {
            const { name: jobName, data: jobData } = bullJob;

            switch (jobName) {
                case 'RefreshPronnelOauthTokenJob':
                    await this._handleRefreshPronnelOauthToken(jobData);
                    break;
                default:
                    logger.warn(`[PronnelOauthService] Unknown job type: ${jobName}`);
            }
        });
    }

    /**
     * Handle RefreshPronnelOauthTokenJob
     * Refreshes expired Pronnel OAuth tokens
     */
    async _handleRefreshPronnelOauthToken(data) {
        const { app_instance_id } = data;

        try {
            const { ConnectionFilter } = require('../../src/filters/connectionfilter');
            const { getSavedConnection, updateConnection } = require('../../src/dbhelper/connectiondao');

            let filter = new ConnectionFilter();
            filter.appInstanceIdArray = app_instance_id;
            filter.typeArray = 'pronnel';

            let connections = await getSavedConnection(filter);
            if (!connections || connections.length === 0) {
                logger.warn(`[PronnelOauthService] No Pronnel connection found for app_instance_id: ${app_instance_id}`);
                return;
            }

            const connection = connections[0];
            if (!connection.refresh_token) {
                logger.warn(`[PronnelOauthService] No refresh token available for app_instance_id: ${app_instance_id}`);
                return;
            }

            // Call the Pronnel API to refresh the token
            const qs = require('qs');
            const axios = require('axios');

            const data = qs.stringify({
                client_id: process.env.PRONNEL_CLIENT_ID,
                client_secret: process.env.PRONNEL_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: connection.refresh_token
            });

            const config = {
                method: 'POST',
                url: process.env.PRONNEL_TOKEN_URL || 'https://developerapi80.pronnel.com/api1/oauth/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: data
            };

            const response = await axios.request(config);
            const tokenData = response.data;

            if (tokenData.access_token) {
                await updateConnection(filter, {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token || connection.refresh_token
                });
                logger.info(`[PronnelOauthService] Successfully refreshed token for app_instance_id: ${app_instance_id}`);
            }
        } catch (err) {
            logger.error(`[PronnelOauthService] Error refreshing Pronnel OAuth token: ${err.message}`);
            throw err;
        }
    }
}

PronnelOauthService._instance = null;

module.exports = { PronnelOauthService };
