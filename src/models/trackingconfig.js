const mongoose = require('mongoose');
const { Types } = mongoose;

const trackingConfigSchema = mongoose.Schema({
    pronnel_tracking_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    board_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    app_tracking_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    app_instance_id: { type: mongoose.Schema.Types.ObjectId, required: true }, // ✅ added

    tracking_settings_id: { type: String, required: true },

    tracking_metadata: {
        name: { type: String, default: '' },
        created_by: { type: mongoose.Schema.Types.ObjectId },
        updated_by: { type: mongoose.Schema.Types.ObjectId }
    },

    create_date: { type: Number, required: true },
    update_date: { type: Number, required: true }
});


trackingConfigSchema.pre('save', function () {
    if (!this._id) {
        this._id = new Types.ObjectId();
    }
});


trackingConfigSchema.pre('validate', function () {
    if (!this.create_date) {
        this.create_date = Date.now();
    }
    this.update_date = Date.now(); // always update
});


module.exports = mongoose.model('tracking_config', trackingConfigSchema);