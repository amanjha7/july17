const mongoose = require('mongoose');
const { Types } = mongoose;

const connectionSchema = mongoose.Schema({
    access_token: { type: String, required: true },
    refresh_token: { type: String, required: true },
    type: { type: String, required: true },
    pronnel_user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    app_instance_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    org_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    workfolder_id: { type: mongoose.Schema.Types.ObjectId, required: true }
}, {
    timestamps: true
});

connectionSchema.pre('save', function () {
    if (!this._id) {
        this._id = new Types.ObjectId()
    }
});

module.exports = mongoose.model('connection', connectionSchema);