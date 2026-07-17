const { BaseJob } = require("../../base/basejob");
const Lead = require("../../../src/models/lead");
const Event = require("../../../src/models/event");
const WebtrackerConfig = require("../../../src/models/webtrackerconfig");
const Connection = require("../../../src/models/connection");
const { logger } = require("../../../src/config/logger");

class IdentifyVisitorJob extends BaseJob {
    constructor(data) {
        super();
        this.data = data;
    }

    completed(job) {
        logger.info(`IdentifyVisitorJob completed: ${job.id}`);
    }

    failed(job) {
        logger.error(`IdentifyVisitorJob failed: ${job.id}`);
    }

    async handle(job) {
        const taskData = this.data || job.data.data;
        const {
            token,
            visitor_id,
            session_id,
            name,
            email,
            phone,
            ip,
            country,
            city,
            region,
            browser,
            os,
            device
        } = taskData;

        logger.info(`Processing IdentifyVisitorJob in background for visitor: ${visitor_id}`);

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
                name: name || '',
                email: email || '',
                phone: phone || '',
                first_seen: Date.now(),
                last_seen: Date.now()
            });
        } else {
            if (name) lead.name = name;
            if (email) lead.email = email;
            if (phone) lead.phone = phone;
            lead.last_seen = Date.now();
            if (connection_id) lead.connection_id = connection_id;
            if (config.pronnel_user_id) lead.pronnel_user_id = config.pronnel_user_id;
        }

        await lead.save();
        logger.info(`Background: Identified visitor: ${visitor_id} as Name: ${lead.name}, Email: ${lead.email}, Phone: ${lead.phone}`);

        const identityEvent = new Event({
            visitor_id,
            session_id: session_id || 'system-identity',
            tracking_token: token,
            event_type: 'identify',
            properties: { name, email, phone }
        });
        await identityEvent.save();
        logger.info(`Background: Identity event saved successfully for visitor_id: ${visitor_id}`);
    }
}

module.exports = { IdentifyVisitorJob };
