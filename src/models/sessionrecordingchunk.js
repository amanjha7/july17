const mongoose = require('mongoose');
const { Types } = mongoose;

const sessionRecordingChunkSchema = mongoose.Schema({
    session_id: { type: String, required: true, index: true },
    visitor_id: { type: String, required: true },
    tracking_token: { type: String, required: true },
    payload_id: { type: String, required: true, index: true },
    sequence_number: { type: Number, required: true },
    total_chunks: { type: Number, required: true },
    events: { type: [mongoose.Schema.Types.Mixed], default: [] },
    chunk_data: { type: String }, // support chunked string data
    created_at: { type: Number },
    expire_at: { type: Date, default: Date.now, index: { expires: '5d' } }
});

sessionRecordingChunkSchema.pre('save', function (next) {
    if (!this._id) {
        this._id = new Types.ObjectId();
    }
    next();
});

sessionRecordingChunkSchema.pre('validate', function (next) {
    const now = Date.now();
    if (!this.created_at) {
        this.created_at = now;
    }
    this.expire_at = new Date(now);
    next();
});

module.exports = mongoose.model('session_recording_chunk', sessionRecordingChunkSchema);
