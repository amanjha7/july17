const mongoose = require('mongoose');
const webtrackerService = require('../services/webtrackerservice');
const webtrackerController = require('../controllers/webtrackercontroller');
const WebtrackerConfig = require('../models/webtrackerconfig');
const Lead = require('../models/lead');
const Event = require('../models/event');
const SessionRecording = require('../models/sessionrecording');

// Load environment variables
require('dotenv').config({ path: 'dev.env' });

// In-memory mock database store
const mockDb = {
    configs: [],
    leads: [],
    events: [],
    recordings: []
};

// Helper to assign mock ObjectId
function generateMockId() {
    return new mongoose.Types.ObjectId();
}

// Chainable mock query helper
function createMockQuery(result) {
    const query = {
        sort: function(sortObj) {
            // Simple mock sorting if result is an array
            if (Array.isArray(result) && sortObj) {
                const key = Object.keys(sortObj)[0];
                const direction = sortObj[key];
                result.sort((a, b) => {
                    const valA = a[key] || 0;
                    const valB = b[key] || 0;
                    return direction === -1 ? valB - valA : valA - valB;
                });
            }
            return this;
        },
        select: function() { return this; },
        collation: function() { return this; },
        exec: async function() { return result; },
        then: function(onSuccess, onFailure) {
            return Promise.resolve(result).then(onSuccess, onFailure);
        }
    };
    return query;
}

// Setup Mongoose Prototype Mocking for save()
const Connection = require('../models/connection');
Connection.findOne = function(query) {
    return createMockQuery(null);
};
mongoose.Model.prototype.save = async function() {
    const modelName = this.constructor.modelName;
    if (!this._id) {
        this._id = generateMockId();
    }

    // Convert to plain object representation with custom save/toObject behaviors
    const doc = this;

    if (modelName === 'webtracker_config') {
        const idx = mockDb.configs.findIndex(c => c._id.toString() === doc._id.toString() || c.tracking_token === doc.tracking_token);
        if (idx > -1) {
            mockDb.configs[idx] = doc;
        } else {
            mockDb.configs.push(doc);
        }
    } else if (modelName === 'lead') {
        const idx = mockDb.leads.findIndex(l => l.visitor_id === doc.visitor_id && l.tracking_token === doc.tracking_token);
        if (idx > -1) {
            mockDb.leads[idx] = doc;
        } else {
            mockDb.leads.push(doc);
        }
    } else if (modelName === 'event') {
        mockDb.events.push(doc);
    } else if (modelName === 'session_recording') {
        const idx = mockDb.recordings.findIndex(r => r.session_id === doc.session_id && r.tracking_token === doc.tracking_token);
        if (idx > -1) {
            mockDb.recordings[idx] = doc;
        } else {
            mockDb.recordings.push(doc);
        }
    }
    return doc;
};

// Mock Static Methods for WebtrackerConfig Model
WebtrackerConfig.findOne = function(query) {
    let result = null;
    if (query.$or) {
        result = mockDb.configs.find(c => {
            return query.$or.some(cond => {
                if (cond.app_instance_id && c.app_instance_id) {
                    return cond.app_instance_id.toString() === c.app_instance_id.toString();
                }
                if (cond.website_url) {
                    return cond.website_url === c.website_url;
                }
                return false;
            });
        });
    } else if (query.tracking_token) {
        result = mockDb.configs.find(c => c.tracking_token === query.tracking_token);
    }
    return createMockQuery(result);
};

WebtrackerConfig.findById = function(id) {
    const result = mockDb.configs.find(c => c._id.toString() === id.toString());
    return createMockQuery(result);
};

// Mock Static Methods for Lead Model
Lead.findOne = function(query) {
    const result = mockDb.leads.find(l => l.visitor_id === query.visitor_id && l.tracking_token === query.tracking_token);
    return createMockQuery(result);
};

Lead.find = function(query) {
    let result = mockDb.leads;
    if (query && query.tracking_token) {
        result = mockDb.leads.filter(l => l.tracking_token === query.tracking_token);
    }
    return createMockQuery(result);
};

Lead.findById = function(id) {
    const result = mockDb.leads.find(l => l._id.toString() === id.toString());
    return createMockQuery(result);
};

Lead.countDocuments = async function(query) {
    let result = mockDb.leads;
    if (query && query.tracking_token) {
        result = result.filter(l => l.tracking_token === query.tracking_token);
    }
    if (query && query.$or) {
        result = result.filter(l => {
            return query.$or.some(cond => {
                if (cond.name && cond.name.$ne !== undefined) {
                    return l.name !== cond.name.$ne;
                }
                if (cond.email && cond.email.$ne !== undefined) {
                    return l.email !== cond.email.$ne;
                }
                if (cond.phone && cond.phone.$ne !== undefined) {
                    return l.phone !== cond.phone.$ne;
                }
                return false;
            });
        });
    }
    return result.length;
};

// Mock Static Methods for Event Model
Event.findOne = function(query) {
    const result = mockDb.events.find(e => e.visitor_id === query.visitor_id && e.event_type === query.event_type);
    return createMockQuery(result);
};

Event.find = function(query) {
    let result = mockDb.events;
    if (query && query.visitor_id) {
        result = result.filter(e => e.visitor_id === query.visitor_id);
    }
    if (query && query.tracking_token) {
        result = result.filter(e => e.tracking_token === query.tracking_token);
    }
    return createMockQuery(result);
};

Event.countDocuments = async function(query) {
    let result = mockDb.events;
    if (query && query.tracking_token) {
        result = result.filter(e => e.tracking_token === query.tracking_token);
    }
    if (query && query.event_type) {
        result = result.filter(e => e.event_type === query.event_type);
    }
    return result.length;
};

// Mock Static Methods for SessionRecording Model
SessionRecording.findOne = function(query) {
    const result = mockDb.recordings.find(r => {
        if (query.session_id && r.session_id !== query.session_id) return false;
        if (query.tracking_token && r.tracking_token !== query.tracking_token) return false;
        return true;
    });
    return createMockQuery(result);
};

// Mock mongoose connect so it doesn't try to connect to localhost:27017
mongoose.connect = async function() {
    console.log('⚡ Mocked MongoDB connection successful.');
    return true;
};

// Mock WebtrackerJobsService queueJob to run synchronously during tests
const { WebtrackerJobsService } = require('../../services/webtrackerjobsservice/webtrackerjobsservice');

WebtrackerJobsService.getInstance().queueJob = async function(baseJob) {
    console.log(`⚡ Mocked Queue: Immediately processing job ${baseJob.name}`);
    const mockJobObject = {
        id: 'test-job-id',
        name: baseJob.name,
        data: baseJob,
        asJSON: () => JSON.stringify(baseJob)
    };
    await baseJob.handle(mockJobObject);
    return mockJobObject;
};

async function runTests() {
    console.log('==================================================');
    console.log('STARTING INTEGRATION TESTS FOR WEBTRACKER SERVICE');
    console.log('==================================================');

    // 1. Connect to MongoDB (mocked)
    await mongoose.connect();

    // 2. Clear test data
    console.log('Clearing old test data...');
    mockDb.configs = [];
    mockDb.leads = [];
    mockDb.events = [];
    mockDb.recordings = [];
    console.log('✅ Old test data cleared.');

    let configId;
    let testToken;

    try {
        // 3. Test Configuration Creation & Script Generation
        console.log('\n--- 1. Testing WebtrackerConfig Creation & Script Generation ---');
        const mockConfigData = {
            website_url: 'https://example-test.com',
            name: 'Test Project Website',
            pronnel_user_id: generateMockId(),
            org_id: generateMockId(),
            app_instance_id: generateMockId()
        };

        const config = await webtrackerService.createOrUpdateConfig(mockConfigData);
        configId = config._id;
        testToken = config.tracking_token;

        console.log(`✅ Saved Config ID: ${config._id}`);
        console.log(`✅ Generated Tracking Token: ${config.tracking_token}`);
        if (!config.generated_script.includes(testToken)) {
            throw new Error('Script generation does not include tracking token!');
        }
        console.log('✅ Script generation verified successfully.');

        // 4. Test Event Tracking & Lead Automatic Creation
        console.log('\n--- 2. Testing Event Tracking (Page View) & Lead Creation ---');
        const visitorId = 'test-visitor-999';
        const sessionId = 'test-session-777';

        // Mock req & res for controller trackEvent
        const trackReq = {
            body: {
                token: testToken,
                visitor_id: visitorId,
                session_id: sessionId,
                event_type: 'page_view',
                properties: {
                    url: 'https://example-test.com/home',
                    title: 'Home Page'
                }
            },
            headers: {
                'x-forwarded-for': '8.8.8.8', // Google DNS public IP for GeoIP lookup
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            socket: {}
        };

        let resStatus, resJson;
        const trackRes = {
            status: function(code) {
                resStatus = code;
                return this;
            },
            json: function(data) {
                resJson = data;
                return this;
            }
        };

        await webtrackerController.trackEvent(trackReq, trackRes);
        if (resStatus !== 200 || !resJson.success) {
            throw new Error(`Failed to track event: Status ${resStatus}, Response: ${JSON.stringify(resJson)}`);
        }
        console.log('✅ Track page_view API completed with HTTP 200.');

        // Verify Lead is created in DB
        const lead = await Lead.findOne({ visitor_id: visitorId, tracking_token: testToken });
        if (!lead) {
            throw new Error('Lead was not automatically created in database upon page view!');
        }
        console.log('✅ Lead created successfully in DB.');
        console.log(`   Lead Details - IP: ${lead.ip}, Country: ${lead.country}, City: ${lead.city}`);
        console.log(`   Browser: ${lead.browser}, OS: ${lead.os}, Device: ${lead.device}`);

        if (lead.country !== 'US') {
            throw new Error(`GeoIP lookup failed. Expected US, got: ${lead.country}`);
        }
        console.log('✅ GeoIP lookup verified (resolves 8.8.8.8 to US).');

        // Verify Event is stored
        const pageViewEvent = await Event.findOne({ visitor_id: visitorId, event_type: 'page_view' });
        if (!pageViewEvent) {
            throw new Error('Page view event was not stored in the events collection!');
        }
        console.log('✅ Page view event verified in DB.');

        // 5. Test Form Submission & Identity Association
        console.log('\n--- 3. Testing Form Submission & Lead Identity Update ---');

        const identifyReq = {
            body: {
                token: testToken,
                visitor_id: visitorId,
                session_id: sessionId,
                name: 'John Doe',
                email: 'johndoe@example.com',
                phone: '+15551234567'
            },
            headers: {},
            socket: {}
        };

        await webtrackerController.identifyVisitor(identifyReq, trackRes);
        if (resStatus !== 200 || !resJson.success) {
            throw new Error(`Failed to identify visitor: Status ${resStatus}, Response: ${JSON.stringify(resJson)}`);
        }
        console.log('✅ Identify visitor API completed with HTTP 200.');

        // Verify Lead is updated in DB
        const updatedLead = await Lead.findOne({ visitor_id: visitorId, tracking_token: testToken });
        if (!updatedLead || updatedLead.name !== 'John Doe' || updatedLead.email !== 'johndoe@example.com' || updatedLead.phone !== '+15551234567') {
            throw new Error('Lead profile details (name, email, phone) were not correctly updated/associated!');
        }
        console.log('✅ Lead details updated & associated with existing anonymous profile.');
        console.log(`   Updated Lead: Name="${updatedLead.name}", Email="${updatedLead.email}", Phone="${updatedLead.phone}"`);

        // 6. Test rrweb Session Recording Chunk Saving & Append
        console.log('\n--- 4. Testing rrweb Session Recording Storage ---');

        const recReq1 = {
            body: {
                token: testToken,
                visitor_id: visitorId,
                session_id: sessionId,
                events: [
                    { type: 0, timestamp: Date.now(), data: { node: 'dummy' } },
                    { type: 1, timestamp: Date.now() }
                ]
            }
        };

        await webtrackerController.saveSessionRecording(recReq1, trackRes);
        if (resStatus !== 200 || !resJson.success) {
            throw new Error(`Failed to save initial session recording chunks: Status ${resStatus}`);
        }
        console.log('✅ Initial session recording chunks saved successfully.');

        // Save secondary chunks (Append)
        const recReq2 = {
            body: {
                token: testToken,
                visitor_id: visitorId,
                session_id: sessionId,
                events: [
                    { type: 2, timestamp: Date.now(), data: { x: 100, y: 200 } }
                ]
            }
        };

        await webtrackerController.saveSessionRecording(recReq2, trackRes);
        if (resStatus !== 200 || !resJson.success) {
            throw new Error(`Failed to append session recording chunks: Status ${resStatus}`);
        }
        console.log('✅ Append session recording chunks saved successfully.');

        // Fetch session recording to verify
        const recEvents = await webtrackerService.getSessionRecording(sessionId);
        if (recEvents.length !== 3) {
            throw new Error(`Expected 3 total rrweb events in session, found: ${recEvents.length}`);
        }
        console.log(`... Array of frames retrieved successfully: ${JSON.stringify(recEvents)}`);
        console.log(`✅ Session recording frames successfully appended and retrieved. Total frames: ${recEvents.length}`);

        // 7. Test Analytics Aggregation
        console.log('\n--- 5. Testing Analytics & Insights Statistics ---');
        const stats = await webtrackerService.getStats(testToken);

        console.log('   Stats retrieved:', JSON.stringify(stats, null, 2));
        if (stats.totalLeads !== 1 || stats.identifiedLeads !== 1 || stats.pageViews !== 1) {
            throw new Error('Analytics aggregation mismatch!');
        }
        console.log('✅ Stats validation and aggregation matches perfectly.');

        // 8. Test Dynamic JavaScript Client Delivery
        console.log('\n--- 6. Testing Dynamic JavaScript Script Delivery ---');
        const scriptReq = {
            params: { token: testToken },
            protocol: 'https',
            get: function(h) { return 'pronneldevapps.pronnel.com/app62'; }
        };

        let scriptHeader, scriptBody;
        const scriptRes = {
            set: function(k, v) {
                scriptHeader = v;
                return this;
            },
            status: function(code) {
                resStatus = code;
                return this;
            },
            send: function(body) {
                scriptBody = body;
                return this;
            }
        };

        await webtrackerController.serveScript(scriptReq, scriptRes);
        if (resStatus !== 200 || scriptHeader !== 'application/javascript') {
            throw new Error(`Failed script serving: Status ${resStatus}, Header ${scriptHeader}`);
        }
        if (!scriptBody.includes(testToken) || !scriptBody.includes('window.rrweb') || !scriptBody.includes('pronnel_visitor_id')) {
            throw new Error('Served dynamic tracker JS is incomplete or incorrect!');
        }
        console.log('✅ Served dynamic client JS is fully configured and correctly typed.');

        console.log('\n==================================================');
        console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
        console.log('==================================================');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST RUN FAILURE:', error);
        process.exit(1);
    }
}

runTests();
