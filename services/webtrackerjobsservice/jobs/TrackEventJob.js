const { BaseJob } = require("../../base/basejob");
const Lead = require("../../../src/models/lead");
const Event = require("../../../src/models/event");
const WebtrackerConfig = require("../../../src/models/webtrackerconfig");
const Connection = require("../../../src/models/connection");
const { logger } = require("../../../src/config/logger");

class TrackEventJob extends BaseJob {
    constructor(data) {
        super();
        this.data = data;
    }

    completed(job) {
        logger.info(`TrackEventJob completed: ${job.id}`);
    }

    failed(job) {
        logger.error(`TrackEventJob failed: ${job.id}`);
    }

    async handle(job) {
        const taskData = this.data || job.data.data;
        const {
            token,
            visitor_id,
            session_id,
            event_type,
            properties,
            ip,
            country,
            city,
            region,
            browser,
            os,
            device
        } = taskData;

        logger.info(`Processing TrackEventJob in background for visitor: ${visitor_id}, event: ${event_type}`);

        const config = await WebtrackerConfig.findOne({ tracking_token: token });
        if (!config) {
            throw new Error(`WebtrackerConfig not found for token: ${token}`);
        }

        const conn = await Connection.findOne({
            pronnel_user_id: config.pronnel_user_id,
            app_instance_id: config.app_instance_id
        });
        const connection_id = conn ? conn._id : null;

        let lead = await Lead.findOne({ visitor_id, tracking_token: token });
        if (!lead) {
            lead = new Lead({
                visitor_id,
                tracking_token: token,
                connection_id,
                pronnel_user_id: config.pronnel_user_id,
                ip,
                country,
                city,
                region,
                browser,
                os,
                device,
                first_seen: Date.now(),
                last_seen: Date.now()
            });
            await lead.save();
            logger.info(`Background: Created new Lead for visitor_id: ${visitor_id}`);
        } else {
            lead.last_seen = Date.now();
            if (connection_id) lead.connection_id = connection_id;
            if (config.pronnel_user_id) lead.pronnel_user_id = config.pronnel_user_id;
            if (lead.ip !== ip && ip) {
                lead.ip = ip;
                if (country && country !== 'Unknown') lead.country = country;
                if (city && city !== 'Unknown') lead.city = city;
                if (region && region !== 'Unknown') lead.region = region;
            }
            await lead.save();
            logger.info(`Background: Updated existing Lead for visitor_id: ${visitor_id}`);
        }

        const newEvent = new Event({
            visitor_id,
            session_id,
            tracking_token: token,
            event_type,
            properties: properties || {}
        });
        await newEvent.save();
        logger.info(`Background: Event ${event_type} saved successfully for visitor_id: ${visitor_id}`);
    }
}

module.exports = { TrackEventJob };
