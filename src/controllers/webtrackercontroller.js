const geoip = require('geoip-lite');
const webtrackerService = require('../services/webtrackerservice');
const Lead = require('../models/lead');
const Event = require('../models/event');
const SessionRecording = require('../models/sessionrecording');
const { logger } = require('../config/logger');

// POST /app/webtracker/config
const saveConfig = async (req, res) => {
    logger.info('Entering saveConfig() controller.');
    try {
        const context = req.session?.context || {};
        const data = {
            website_url: req.body.website_url,
            name: req.body.name,
            pronnel_user_id: req.body.pronnel_user_id || context.user_id,
            org_id: req.body.org_id || context.org_id,
            app_instance_id: req.body.app_instance_id || context.app_instance_id
        };

        if (!data.website_url) {
            return res.status(400).json({ error: 'website_url is required' });
        }

        const config = await webtrackerService.createOrUpdateConfig(data);
        res.status(200).json({
            message: 'Webtracker configuration saved successfully',
            config
        });
    } catch (err) {
        logger.error('Error in saveConfig():', err);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
};

// GET /app/webtracker/config/:id
const getConfig = async (req, res) => {
    try {
        const config = await webtrackerService.getConfig(req.params.id);
        if (!config) {
            return res.status(404).json({ error: 'Configuration not found' });
        }
        res.status(200).json(config);
    } catch (err) {
        logger.error('Error in getConfig():', err);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
};

// GET /app/webtracker/leads
const getLeads = async (req, res) => {
    try {
        const token = req.query.token;
        const leads = await webtrackerService.getLeads(token);
        res.status(200).json(leads);
    } catch (err) {
        logger.error('Error in getLeads():', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
};

// GET /app/webtracker/leads/:id
const getLeadDetails = async (req, res) => {
    try {
        const lead = await webtrackerService.getLeadDetails(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.status(200).json(lead);
    } catch (err) {
        logger.error('Error in getLeadDetails():', err);
        res.status(500).json({ error: 'Failed to fetch lead details' });
    }
};

// GET /app/webtracker/leads/:id/events
const getLeadEvents = async (req, res) => {
    try {
        const lead = await webtrackerService.getLeadDetails(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        const events = await webtrackerService.getLeadEvents(lead.visitor_id);
        res.status(200).json(events);
    } catch (err) {
        logger.error('Error in getLeadEvents():', err);
        res.status(500).json({ error: 'Failed to fetch lead events' });
    }
};

// GET /app/webtracker/sessions/:sessionId/recording
const getSessionRecording = async (req, res) => {
    try {
        const events = await webtrackerService.getSessionRecording(req.params.sessionId);
        res.status(200).json({
            session_id: req.params.sessionId,
            events
        });
    } catch (err) {
        logger.error('Error in getSessionRecording():', err);
        res.status(500).json({ error: 'Failed to fetch session recording' });
    }
};

// GET /app/webtracker/stats
const getStats = async (req, res) => {
    try {
        const token = req.query.token;
        const stats = await webtrackerService.getStats(token);
        res.status(200).json(stats);
    } catch (err) {
        logger.error('Error in getStats():', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

// Helper to determine visitor's browser/os/device from user-agent
function parseUserAgent(uaString) {
    const ua = uaString || '';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    let device = 'Desktop';

    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
        device = 'Mobile';
    } else if (ua.includes('iPad') || ua.includes('Tablet')) {
        device = 'Tablet';
    }

    return { browser, os, device };
}

// POST /app/webtracker/track
const trackEvent = async (req, res) => {
    logger.info('Entering trackEvent() controller.');
    try {
        const { token, visitor_id, session_id, event_type, properties } = req.body;

        if (!token || !visitor_id || !session_id || !event_type) {
            return res.status(400).json({ error: 'Missing required tracking parameters: token, visitor_id, session_id, and event_type are required' });
        }

        // Verify config exists
        const config = await webtrackerService.getConfigByToken(token);
        if (!config) {
            return res.status(404).json({ error: 'Invalid or missing tracking token' });
        }

        // Extract client IP and Geolocation
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        if (ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        let country = 'Unknown';
        let city = 'Unknown';
        let region = 'Unknown';

        // For local development or loopback addresses, let's fall back to mock location for insights if desired, or keep Unknown.
        // Let's do a standard geoip lookup
        const geo = geoip.lookup(ip);
        if (geo) {
            country = geo.country || 'Unknown';
            city = geo.city || 'Unknown';
            region = geo.region || 'Unknown';
        } else if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
            country = 'US';
            city = 'San Francisco';
            region = 'CA';
        }

        // Parse user agent
        const ua = req.headers['user-agent'] || '';
        const { browser, os, device } = parseUserAgent(ua);

        // Find or create lead/visitor
        let lead = await Lead.findOne({ visitor_id, tracking_token: token });
        if (!lead) {
            lead = new Lead({
                visitor_id,
                tracking_token: token,
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
            logger.info(`Created new Lead for visitor_id: ${visitor_id}`);
        } else {
            lead.last_seen = Date.now();
            // Update location/device details if they were Unknown or changed
            if (lead.ip !== ip && ip) {
                lead.ip = ip;
                if (geo) {
                    lead.country = geo.country || lead.country;
                    lead.city = geo.city || lead.city;
                    lead.region = geo.region || lead.region;
                }
            }
            await lead.save();
        }

        // Save event
        const newEvent = new Event({
            visitor_id,
            session_id,
            tracking_token: token,
            event_type,
            properties: properties || {}
        });
        await newEvent.save();

        res.status(200).json({ success: true, message: 'Event tracked successfully' });
    } catch (err) {
        logger.error('Error in trackEvent():', err);
        res.status(500).json({ error: 'Failed to track event' });
    }
};

// POST /app/webtracker/identify
const identifyVisitor = async (req, res) => {
    logger.info('Entering identifyVisitor() controller.');
    try {
        const { token, visitor_id, name, email, phone } = req.body;

        if (!token || !visitor_id) {
            return res.status(400).json({ error: 'token and visitor_id are required' });
        }

        // Find lead
        let lead = await Lead.findOne({ visitor_id, tracking_token: token });
        if (!lead) {
            // Create a lead if doesn't exist
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            if (ip.includes(',')) ip = ip.split(',')[0].trim();
            let country = 'Unknown', city = 'Unknown', region = 'Unknown';
            const geo = geoip.lookup(ip);
            if (geo) {
                country = geo.country;
                city = geo.city;
                region = geo.region;
            } else if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
                country = 'US'; city = 'San Francisco'; region = 'CA';
            }
            const { browser, os, device } = parseUserAgent(req.headers['user-agent']);

            lead = new Lead({
                visitor_id,
                tracking_token: token,
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
            // Update existing lead details
            if (name) lead.name = name;
            if (email) lead.email = email;
            if (phone) lead.phone = phone;
            lead.last_seen = Date.now();
        }

        await lead.save();
        logger.info(`Identified visitor: ${visitor_id} as Name: ${lead.name}, Email: ${lead.email}, Phone: ${lead.phone}`);

        // Record identity change event
        const identityEvent = new Event({
            visitor_id,
            session_id: req.body.session_id || 'system-identity',
            tracking_token: token,
            event_type: 'identify',
            properties: { name, email, phone }
        });
        await identityEvent.save();

        res.status(200).json({ success: true, message: 'Visitor identified successfully', lead });
    } catch (err) {
        logger.error('Error in identifyVisitor():', err);
        res.status(500).json({ error: 'Failed to identify visitor' });
    }
};

// POST /app/webtracker/session-recording
const saveSessionRecording = async (req, res) => {
    try {
        const { token, visitor_id, session_id, events } = req.body;

        if (!token || !visitor_id || !session_id || !events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'Missing or invalid parameters: token, visitor_id, session_id, and events array are required' });
        }

        let recording = await SessionRecording.findOne({ session_id, tracking_token: token });
        if (!recording) {
            recording = new SessionRecording({
                session_id,
                visitor_id,
                tracking_token: token,
                events: events
            });
        } else {
            // Append incoming rrweb events chunk
            recording.events.push(...events);
            recording.updated_at = Date.now();
        }

        await recording.save();
        res.status(200).json({ success: true, message: 'Session recording chunks appended successfully' });
    } catch (err) {
        logger.error('Error in saveSessionRecording():', err);
        res.status(500).json({ error: 'Failed to save session recording chunks' });
    }
};

// GET /app/webtracker/script/:token
const serveScript = async (req, res) => {
    try {
        const token = req.params.token;
        const config = await webtrackerService.getConfigByToken(token);
        if (!config) {
            return res.status(404).send('/* Invalid or inactive webtracker configuration token */');
        }

        const hostUrl = process.env.APP_HOST_URL || `${req.protocol}://${req.get('host')}`;

        // Dynamic Tracker JavaScript Client Script
        const javascriptTemplate = `(function() {
    console.log('[Pronnel Webtracker] Initializing for website: ${config.website_url}');

    // Utility to get/set cookies
    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
    }
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    }

    // Generate or fetch Visitor ID
    var visitorId = localStorage.getItem('pronnel_visitor_id') || getCookie('pronnel_visitor_id');
    if (!visitorId) {
        visitorId = 'visitor_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('pronnel_visitor_id', visitorId);
        setCookie('pronnel_visitor_id', visitorId, 365);
    }

    // Generate or fetch Session ID (expires after browser close / inactive session)
    var sessionId = sessionStorage.getItem('pronnel_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        sessionStorage.setItem('pronnel_session_id', sessionId);
    }

    var token = '${token}';
    var apiHost = '${hostUrl}';

    function sendBeacon(endpoint, payload) {
        var url = apiHost + endpoint;
        var data = JSON.stringify(payload);
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
        } else {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(data);
        }
    }

    function trackEvent(eventType, properties) {
        var payload = {
            token: token,
            visitor_id: visitorId,
            session_id: sessionId,
            event_type: eventType,
            properties: properties || {}
        };
        sendBeacon('/app/webtracker/track', payload);
    }

    function identifyUser(name, email, phone) {
        var payload = {
            token: token,
            visitor_id: visitorId,
            session_id: sessionId,
            name: name,
            email: email,
            phone: phone
        };
        // Save locally to avoid sending redundant identities
        localStorage.setItem('pronnel_identified_name', name || '');
        localStorage.setItem('pronnel_identified_email', email || '');
        localStorage.setItem('pronnel_identified_phone', phone || '');

        sendBeacon('/app/webtracker/identify', payload);
    }

    // 1. Track Page View
    trackEvent('page_view', {
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight
    });

    // 2. Track Clicks
    document.addEventListener('click', function(e) {
        var target = e.target;
        if (!target) return;

        // Bubble up to find closest clickable element if needed
        var element = target.closest('a, button, input[type="submit"], input[type="button"]');
        if (!element) return;

        trackEvent('click', {
            tag: element.tagName.toLowerCase(),
            text: (element.innerText || element.value || '').substring(0, 50).trim(),
            id: element.id || '',
            classes: element.className || '',
            url: window.location.href
        });
    }, true);

    // 3. Track Form Submissions and Auto-Identify Lead (name, email, phone)
    document.addEventListener('submit', function(e) {
        var form = e.target;
        if (!form) return;

        var formData = {};
        var inputs = form.querySelectorAll('input, select, textarea');
        var nameParts = [];
        var email = '';
        var phone = '';

        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            if (!input.name && !input.id && !input.type) continue;

            var key = input.name || input.id || input.type;
            var val = input.value;

            // Simple heuristics to identify personal fields
            var keyLower = key.toLowerCase();
            var typeLower = (input.type || '').toLowerCase();

            if (keyLower.indexOf('email') > -1 || typeLower === 'email') {
                email = val;
            } else if (keyLower.indexOf('phone') > -1 || keyLower.indexOf('mobile') > -1 || keyLower.indexOf('tel') > -1 || typeLower === 'tel') {
                phone = val;
            } else if (keyLower.indexOf('name') > -1 || keyLower.indexOf('first') > -1 || keyLower.indexOf('last') > -1) {
                nameParts.push(val);
            }

            // Exclude passwords or sensitive fields
            if (typeLower !== 'password') {
                formData[key] = val;
            }
        }

        var fullName = nameParts.join(' ').trim();

        // If we found any identifier, invoke identification
        if (fullName || email || phone) {
            identifyUser(fullName, email, phone);
        }

        // Track form submission event
        trackEvent('form_submit', {
            form_id: form.id || '',
            form_class: form.className || '',
            action: form.action || '',
            fields: formData
        });
    }, true);

    // 4. rrweb Session Recording Integration
    function loadRrwebAndStart() {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js';
        script.onload = function() {
            if (!window.rrweb) return;
            var eventBuffer = [];

            window.rrweb.record({
                emit: function(event) {
                    eventBuffer.push(event);
                    if (eventBuffer.length >= 50) {
                        flushEvents();
                    }
                }
            });

            function flushEvents() {
                if (eventBuffer.length === 0) return;
                var batch = eventBuffer.slice();
                eventBuffer = [];

                var payload = {
                    token: token,
                    visitor_id: visitorId,
                    session_id: sessionId,
                    events: batch
                };
                sendBeacon('/app/webtracker/session-recording', payload);
            }

            // Flush events periodically or on page unload
            setInterval(flushEvents, 8000);
            window.addEventListener('beforeunload', flushEvents);
        };
        document.head.appendChild(script);
    }

    // Wait until DOM is loaded to load rrweb
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        loadRrwebAndStart();
    } else {
        window.addEventListener('DOMContentLoaded', loadRrwebAndStart);
    }
})();`;

        res.set('Content-Type', 'application/javascript');
        res.status(200).send(javascriptTemplate);
    } catch (err) {
        logger.error('Error serving tracking script:', err);
        res.status(500).send('/* Internal server error serving tracking script */');
    }
};

module.exports = {
    saveConfig,
    getConfig,
    getLeads,
    getLeadDetails,
    getLeadEvents,
    getSessionRecording,
    getStats,
    trackEvent,
    identifyVisitor,
    saveSessionRecording,
    serveScript
};
