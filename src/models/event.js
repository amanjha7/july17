const mongoose = require('mongoose');
const { Types } = mongoose;

const eventSchema = mongoose.Schema({
    visitor_id: { type: String, required: true, index: true },
    session_id: { type: String, required: true, index: true },
    tracking_token: { type: String, required: true, index: true },
    event_type: { type: String, required: true },
    properties: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Number }
});

eventSchema.pre('save', function (next) {
    if (!this._id) {
        this._id = new Types.ObjectId();
    }
    next();
});

eventSchema.pre('validate', function (next) {
    if (!this.timestamp) {
        this.timestamp = Date.now();
    }
    next();
});

module.exports = mongoose.model('event', eventSchema);
