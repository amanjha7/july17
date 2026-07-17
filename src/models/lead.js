const mongoose = require('mongoose');
const { Types } = mongoose;

const leadSchema = mongoose.Schema({
    visitor_id: { type: String, required: true, index: true },
    tracking_token: { type: String, required: true, index: true },
    connection_id: { type: mongoose.Schema.Types.ObjectId, ref: 'connection', index: true },
    pronnel_user_id: { type: mongoose.Schema.Types.ObjectId, index: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    ip: { type: String, default: '' },
    country: { type: String, default: 'Unknown' },
    city: { type: String, default: 'Unknown' },
    region: { type: String, default: 'Unknown' },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Unknown' },
    first_seen: { type: Number },
    last_seen: { type: Number }
});

leadSchema.pre('save', function (next) {
    if (!this._id) {
        this._id = new Types.ObjectId();
    }
    next();
});

leadSchema.pre('validate', function (next) {
    const now = Date.now();
    if (!this.first_seen) {
        this.first_seen = now;
    }
    if (!this.last_seen) {
        this.last_seen = now;
    }
    next();
});

module.exports = mongoose.model('lead', leadSchema);
