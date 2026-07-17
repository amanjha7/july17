const mongoose = require('mongoose');
const { Types } = mongoose;

const sessionRecordingSchema = mongoose.Schema({
    session_id: { type: String, required: true, index: true },
    visitor_id: { type: String, required: true },
    tracking_token: { type: String, required: true },
    events: { type: [mongoose.Schema.Types.Mixed], default: [] },
    created_at: { type: Number },
    updated_at: { type: Number }
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
    next();
});

module.exports = mongoose.model('session_recording', sessionRecordingSchema);
