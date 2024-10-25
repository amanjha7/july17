const mongoose = require('mongoose');
const { Types } = mongoose;

const webhookDetailsSchema = mongoose.Schema({
    automation_id: { type: String, required: true },
    connection_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Connection', required: true },
    pronnel_webhook_url: { type: String, required: true },
    trigger_type: { type: String, required: true },
    field_details:  { type: mongoose.Schema.Types.Mixed },
    create_date: { type: Number, required: true },
    update_date: { type: Number, required: true }
});

webhookDetailsSchema.pre('save', function () {
    if (!this._id) {
        this._id = new Types.ObjectId()
    }
});

webhookDetailsSchema.pre('validate', function () {
    if (!this.create_date) {
        this.create_date = Date.now()
    }
    if (!this.update_date) {
        this.update_date = Date.now()
    }
});

module.exports = mongoose.model('webhookdetails', webhookDetailsSchema);