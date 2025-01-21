const mongoose = require('mongoose');
const { Types } = mongoose;

const connectionSchema = mongoose.Schema({
    access_token: { type: String, required: true },
    refresh_token: { type: String, required: true },
    access_token_expiry_time: { type: Number, timestamps: true },
    refresh_token_expiry_time: { type: Number, timestamps: true },
    type: { type: String, required: true },
    pronnel_user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    app_instance_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    org_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    workfolder_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    create_date: { type: Number, required: true },
    update_date: { type: Number, required: true }
});

connectionSchema.pre('save', function () {
    if (!this._id) {
        this._id = new Types.ObjectId()
    }
});

connectionSchema.pre('validate', function () {
    if (!this.create_date) {
        this.create_date = Date.now()
    }
    if (!this.update_date) {
        this.update_date = Date.now()
    }
});

module.exports = mongoose.model('connection', connectionSchema);