const { BaseService } = require('../base/baseservice');
const { logger } = require('../../src/config/logger');

// Load models for direct DB operations in job handlers
const Event = require('../../src/models/event');
const Lead = require('../../src/models/lead');
const SessionRecording = require('../../src/models/sessionrecording');
const WebtrackerConfig = require('../../src/models/webtrackerconfig');

/**
 * WebtrackerJobsService - Singleton service for processing webtracker background jobs
 * Handles: event tracking, visitor identification, session recording
 */
class WebtrackerJobsService extends BaseService {
    constructor() {
        super('WebtrackerJobsService');
    }

    static getInstance() {
        if (!WebtrackerJobsService._instance) {
            WebtrackerJobsService._instance = new WebtrackerJobsService();
        }
        return WebtrackerJobsService._instance;
    }

    start() {
        super.start(async (bullJob) => {
            const { name: jobName, data: jobData } = bullJob;

            switch (jobName) {
                case 'TrackEventJob':
                    await this._handleTrackEvent(jobData);
                    break;
                case 'IdentifyVisitorJob':
                    await this._handleIdentifyVisitor(jobData);
                    break;
                case 'SaveSessionRecordingJob':
                    await this._handleSaveSessionRecording(jobData);
                    break;
                default:
                    logger.warn(`[WebtrackerJobsService] Unknown job type: ${jobName}`);
            }
        });
    }

    /**
     * Handle TrackEventJob - Save an event to the database
     */
    async _handleTrackEvent(data) {
        const { token, visitor_id, session_id, event_type, properties, ip, country, city, region, browser, os, device } = data;

        try {
            // Save the event
            const event = new Event({
                visitor_id,
                session_id,
                tracking_token: token,
                event_type,
                properties: properties || {},
                timestamp: Date.now()
            });
            await event.save();

            // Update or create lead record
            let lead = await Lead.findOne({ visitor_id, tracking_token: token });
            if (lead) {
                lead.last_seen = Date.now();
                if (ip) lead.ip = ip;
                if (country && country !== 'Unknown') lead.country = country;
                if (city && city !== 'Unknown') lead.city = city;
                if (region && region !== 'Unknown') lead.region = region;
                if (browser && browser !== 'Unknown Browser') lead.browser = browser;
                if (os && os !== 'Unknown OS') lead.os = os;
                if (device) lead.device = device;
                await lead.save();
            } else {
                lead = new Lead({
                    visitor_id,
                    tracking_token: token,
                    ip: ip || '',
                    country: country || 'Unknown',
                    city: city || 'Unknown',
                    region: region || 'Unknown',
                    browser: browser || 'Unknown Browser',
                    os: os || 'Unknown OS',
                    device: device || 'Desktop',
                    first_seen: Date.now(),
                    last_seen: Date.now()
                });
                await lead.save();
            }

            logger.info(`[WebtrackerJobsService] Tracked event: ${event_type} for visitor: ${visitor_id}`);
        } catch (err) {
            logger.error(`[WebtrackerJobsService] Error tracking event: ${err.message}`);
            throw err;
        }
    }

    /**
     * Handle IdentifyVisitorJob - Identify/merge a visitor with personal info
     */
    async _handleIdentifyVisitor(data) {
        const { token, visitor_id, session_id, name, email, phone, ip, country, city, region, browser, os, device } = data;

        try {
            let lead = await Lead.findOne({ visitor_id, tracking_token: token });

            if (lead) {
                if (name) lead.name = name;
                if (email) lead.email = email;
                if (phone) lead.phone = phone;
                if (ip) lead.ip = ip;
                if (country && country !== 'Unknown') lead.country = country;
                if (city && city !== 'Unknown') lead.city = city;
                if (region && region !== 'Unknown') lead.region = region;
                if (browser && browser !== 'Unknown Browser') lead.browser = browser;
                if (os && os !== 'Unknown OS') lead.os = os;
                if (device) lead.device = device;
                lead.last_seen = Date.now();
                await lead.save();
            } else {
                lead = new Lead({
                    visitor_id,
                    tracking_token: token,
                    name: name || '',
                    email: email || '',
                    phone: phone || '',
                    ip: ip || '',
                    country: country || 'Unknown',
                    city: city || 'Unknown',
                    region: region || 'Unknown',
                    browser: browser || 'Unknown Browser',
                    os: os || 'Unknown OS',
                    device: device || 'Desktop',
                    first_seen: Date.now(),
                    last_seen: Date.now()
                });
                await lead.save();
            }

            // Also save an identify event
            const event = new Event({
                visitor_id,
                session_id: session_id || 'system-identity',
                tracking_token: token,
                event_type: 'identify',
                properties: { name, email, phone },
                timestamp: Date.now()
            });
            await event.save();

            logger.info(`[WebtrackerJobsService] Identified visitor: ${visitor_id} as ${name || email || 'unknown'}`);
        } catch (err) {
            logger.error(`[WebtrackerJobsService] Error identifying visitor: ${err.message}`);
            throw err;
        }
    }

    /**
     * Handle SaveSessionRecordingJob - Save session recording events/rrweb data
     */
    async _handleSaveSessionRecording(data) {
        const { token, visitor_id, session_id, events, payload_id } = data;

        try {
            if (!events || events.length === 0) {
                return;
            }

            // Ensure exact-once delivery in background job handler too if payload_id is passed
            if (payload_id) {
                const alreadyProcessed = await SessionRecording.findOne({
                    session_id,
                    processed_payloads: payload_id
                });
                if (alreadyProcessed) {
                    logger.info(`[WebtrackerJobsService] Session recording payload ${payload_id} already processed. Skipping background job.`);
                    return;
                }
            }

            // Chronological sort
            events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            // Use atomic updates to prevent heavy database writes or Node process memory blockage
            const updateObj = {
                $push: {
                    events: { $each: events }
                },
                $setOnInsert: {
                    visitor_id,
                    tracking_token: token,
                    created_at: Date.now()
                },
                $set: {
                    updated_at: Date.now()
                }
            };

            if (payload_id) {
                updateObj.$addToSet = { processed_payloads: payload_id };
            }

            await SessionRecording.findOneAndUpdate(
                { session_id },
                updateObj,
                { upsert: true, new: true }
            );

            logger.info(`[WebtrackerJobsService] Saved session recording: ${session_id} (${events.length} events)`);
        } catch (err) {
            logger.error(`[WebtrackerJobsService] Error saving session recording: ${err.message}`);
            throw err;
        }
    }
}

WebtrackerJobsService._instance = null;

module.exports = { WebtrackerJobsService };
