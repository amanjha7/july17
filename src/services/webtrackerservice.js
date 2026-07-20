const { v4: uuidv4 } = require('uuid');
const WebtrackerConfig = require('../models/webtrackerconfig');
const Lead = require('../models/lead');
const Event = require('../models/event');
const SessionRecording = require('../models/sessionrecording');
const { logger } = require('../config/logger');

const createOrUpdateConfig = async (data) => {
    logger.info(`Entering createOrUpdateConfig() with data: ${JSON.stringify(data)}`);
    const { website_url, pronnel_user_id, org_id, app_instance_id, name } = data;

    // Check if configuration already exists for this app instance or website
    let config = await WebtrackerConfig.findOne({
        $or: [
            { app_instance_id: app_instance_id },
            { website_url: website_url }
        ]
    });

    const tracking_token = config ? config.tracking_token : uuidv4();
    const hostUrl = process.env.APP_HOST_URL || 'http://localhost:22611';

    // Construct HTML tracking snippet
    const generated_script = `<!-- Pronnel Webtracker Snippet -->
<script type="text/javascript">
  (function() {
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = '${hostUrl}/app/webtracker/script/${tracking_token}';
    var x = document.getElementsByTagName('script')[0];
    x.parentNode.insertBefore(s, x);
  })();
</script>`;

    if (config) {
        config.website_url = website_url || config.website_url;
        config.name = name || config.name;
        config.generated_script = generated_script;
        config.update_date = Date.now();
        await config.save();
        logger.info(`Updated existing WebtrackerConfig in DB.`);
    } else {
        config = new WebtrackerConfig({
            website_url,
            pronnel_user_id,
            org_id,
            app_instance_id,
            tracking_token,
            generated_script,
            name
        });
        await config.save();
        logger.info(`Created new WebtrackerConfig in DB.`);
    }

    return config;
};

const getConfig = async (id) => {
    logger.info(`Entering getConfig() with ID: ${id}`);
    return await WebtrackerConfig.findById(id);
};

const getConfigByToken = async (token) => {
    return await WebtrackerConfig.findOne({ tracking_token: token });
};

const getLeads = async (token) => {
    logger.info(`Entering getLeads() with token: ${token}`);
    const filter = {};
    if (token) {
        filter.tracking_token = token;
    }
    return await Lead.find(filter).sort({ last_seen: -1 });
};

const getLeadDetails = async (id) => {
    return await Lead.findById(id);
};

const getLeadEvents = async (visitor_id) => {
    return await Event.find({ visitor_id }).sort({ timestamp: -1 });
};

const getSessionRecording = async (session_id) => {
    logger.info(`Entering getSessionRecording() for session: ${session_id}`);
    const rec = await SessionRecording.findOne({ session_id });
    if (rec && rec.events) {
        rec.events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        return rec.events;
    }
    return [];
};

const getStats = async (token) => {
    logger.info(`Entering getStats() with token: ${token}`);
    const filter = {};
    if (token) {
        filter.tracking_token = token;
    }

    const totalLeads = await Lead.countDocuments(filter);

    // Count identified leads: those with name, email, or phone populated
    const identifiedFilter = {
        ...filter,
        $or: [
            { name: { $ne: '' } },
            { email: { $ne: '' } },
            { phone: { $ne: '' } }
        ]
    };
    const identifiedLeads = await Lead.countDocuments(identifiedFilter);

    // Total page views vs click events
    const pageViews = await Event.countDocuments({ ...filter, event_type: 'page_view' });
    const clicks = await Event.countDocuments({ ...filter, event_type: 'click' });
    const formSubmits = await Event.countDocuments({ ...filter, event_type: 'form_submit' });

    // Location distributions
    const leadsWithLocation = await Lead.find(filter, { country: 1, city: 1 });
    const locations = {};
    leadsWithLocation.forEach(l => {
        const country = l.country || 'Unknown';
        locations[country] = (locations[country] || 0) + 1;
    });

    return {
        totalLeads,
        identifiedLeads,
        pageViews,
        clicks,
        formSubmits,
        locations
    };
};

const getAllConfigs = async (appInstanceId) => {
    logger.info(`Entering getAllConfigs() for appInstanceId: ${appInstanceId}`);
    const filter = {};
    if (appInstanceId) {
        filter.app_instance_id = appInstanceId;
    }
    return await WebtrackerConfig.find(filter).sort({ create_date: -1 });
};

module.exports = {
    createOrUpdateConfig,
    getConfig,
    getConfigByToken,
    getAllConfigs,
    getLeads,
    getLeadDetails,
    getLeadEvents,
    getSessionRecording,
    getStats
};
