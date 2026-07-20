const mongoose = require('mongoose');
const { Types } = mongoose;

const sessionRecordingSchema = mongoose.Schema({
    session_id: { type: String, required: true, index: true },
    visitor_id: { type: String, required: true },
    tracking_token: { type: String, required: true },
    events: { type: [mongoose.Schema.Types.Mixed], default: [] },
    processed_payloads: { type: [String], default: [] }, // unique tracking of fully processed payload_ids
    created_at: { type: Number },
    updated_at: { type: Number }
});

// TTL index: automatically delete records older than 5 days
// MongoDB TTL indexes work on Date fields, so we add a `expire_at` field
sessionRecordingSchema.add({
    expire_at: { type: Date, default: Date.now, index: { expires: '5d' } }
});

sessionRecordingSchema.pre('save', function (next) {
    if (!this._id) {
        this._id = new Types.ObjectId();
    }
    next();
});

sessionRecordingSchema.pre('validate', function (next) {
    const now = Date.now();
    if (!this.created_at) {
        this.created_at = now;
    }
    this.updated_at = now;
    // Set the TTL expiry field to current time (MongoDB will auto-delete after 5 days)
    this.expire_at = new Date(now);
    next();
});

module.exports = mongoose.model('session_recording', sessionRecordingSchema);
