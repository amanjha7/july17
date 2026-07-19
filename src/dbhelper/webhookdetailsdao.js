const { createMongoAndFilterForColumns, modifyMongoQuery } = require("./mongohelpers");
const WebhookDetailsDo = require('../models/webhookdetails');

const FILTER_COLUMNS = ['automation_id', 'pronnel_webhook_url', 'connection_id', '_id', 'trigger_type'];
const RANGE_COLUMNS = ['create_date'];

exports.saveWebhookDetails = async function (webhookDetails) {
    webhookDetails.create_date = Date.now();
    //const loggerClass = new LoggerClass("saveWebhookDetails::", arguments)
    let webhookDetailsDocument = new WebhookDetailsDo(webhookDetails);
    let savedDoc = await webhookDetailsDocument.save();
    // loggerClass.writeDebugLogs(savedDoc);
    return savedDoc;
}

exports.getSavedWebhookDetails = async function (webhookDetailsFilter, columnsRequired, sortParams, paginationParams) {
    //const loggerClass = new LoggerClass("getSavedWebhookDetails::", arguments)
    let mongoQuery = getWebhookDetailsMongoQuery(webhookDetailsFilter);
    modifyMongoQuery(mongoQuery, columnsRequired, sortParams, paginationParams);
    let webhookDetailsResult = await mongoQuery.exec();
    // loggerClass.writeDebugLogs(webhookDetailsResult);
    return webhookDetailsResult;
}

exports.updateWebhookDetails = async function (webhookDetailsFilter, toUpdateObj) {
    //const loggerClass = new LoggerClass("updateWebhookDetails::", arguments)
    let filter = getWebhookDetailsMongoQuery(webhookDetailsFilter);
    toUpdateObj.update_date = Date.now();
    let updatedObj = await WebhookDetailsDo.updateOne(filter, { $set: toUpdateObj }, { upsert: true })
    //loggerClass.writeDebugLogs(updatedObj);
    return updatedObj;
}

exports.deleteWebhookDetails = async function (webhookDetailsFilter) {
    //const loggerClass = new LoggerClass("deleteWebhookDetails::", arguments)
    let filter = getRawQueryInJson(webhookDetailsFilter);
    let deletedObj = await WebhookDetailsDo.deleteMany(filter);
    //loggerClass.writeDebugLogs(deletedObj);
    return deletedObj;
}

function getWebhookDetailsMongoQuery(webhookDetailsFilter) {
    const mongoFilterJson = getRawQueryInJson(webhookDetailsFilter);
    var mongoQuery = WebhookDetailsDo.find(mongoFilterJson);
    return mongoQuery;
}

function getRawQueryInJson(webhookDetailsFilter) {
    let webhookDetailsFilterJson = {};
    if (webhookDetailsFilter.automationIdArray) {
        webhookDetailsFilterJson['automation_id'] = webhookDetailsFilter.automationIdArray;
    }
    if (webhookDetailsFilter.pronnelWebhookUrlArray) {
        webhookDetailsFilterJson['pronnel_webhook_url'] = webhookDetailsFilter.pronnelWebhookUrlArray;
    }
    if (webhookDetailsFilter.idArray) {
        webhookDetailsFilterJson['_id'] = webhookDetailsFilter.idArray;
    }
    if (webhookDetailsFilter.connectionIdArray) {
        webhookDetailsFilterJson['connection_id'] = webhookDetailsFilter.connectionIdArray;
    }
    if (webhookDetailsFilter.createdDate) {
        webhookDetailsFilterJson['create_date'] = webhookDetailsFilter.createdTime;
    }
    if (webhookDetailsFilter.triggerTypeArray) {
        webhookDetailsFilterJson['trigger_type'] = webhookDetailsFilter.triggerTypeArray;
    }
    let mongoFilterJson = createMongoAndFilterForColumns(webhookDetailsFilterJson,
        FILTER_COLUMNS,
        RANGE_COLUMNS,
        undefined,
        undefined
    )
    return mongoFilterJson;
}