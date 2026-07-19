const { BaseFilter } = require("./basefilter");

class WebhookDetailsFilter extends BaseFilter {
    constructor(automationIdArray, pronnelWebhookUrlArray, connectionIdArray, idArray, triggerTypeArray, createdTime) {
        super();
        this.automationIdArray = automationIdArray;
        this.pronnelWebhookUrlArray = pronnelWebhookUrlArray;
        this.idArray = idArray;
        this.connectionIdArray = connectionIdArray;
        this.triggerTypeArray = triggerTypeArray;
        this.createdTime = createdTime;
    }
}

module.exports = { WebhookDetailsFilter };
