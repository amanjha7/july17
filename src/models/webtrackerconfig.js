const mongoose = require('mongoose');
const { Types } = mongoose;

const webtrackerConfigSchema = mongoose.Schema({
    website_url: { type: String, required: true },
    pronnel_user_id: { type: mongoose.Schema.Types.ObjectId },
    org_id: { type: mongoose.Schema.Types.ObjectId },
    app_instance_id: { type: mongoose.Schema.Types.ObjectId },
    tracking_token: { type: String, required: true, unique: true },
    generated_script: { type: String },
    name: { type: String },
    create_date: { type: Number },
    update_date: { type: Number }
});

webtrackerConfigSchema.pre('save', function (next) {
    if (!this._id) {
        this._id = new Types.ObjectId();
    }
    next();
});

webtrackerConfigSchema.pre('validate', function (next) {
    if (!this.create_date) {
        this.create_date = Date.now();
    }
    if (!this.update_date) {
        this.update_date = Date.now();
    }
    next();
});

module.exports = mongoose.model('webtracker_config', webtrackerConfigSchema);
