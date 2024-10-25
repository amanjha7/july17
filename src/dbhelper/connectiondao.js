const { createMongoAndFilterForColumns, modifyMongoQuery } = require("./mongohelpers");
const ConnectionDo = require('../models/connection');

const FILTER_COLUMNS = ['workfolder_id', 'org_id', 'pronnel_user_id', '_id', 'app_instance_id'];
const RANGE_COLUMNS = ['create_date'];

exports.saveConnection = async function (connection) {
    connection.create_date = Date.now();
    //const loggerClass = new LoggerClass("saveConnection::", arguments)
    let connectionDocument = new ConnectionDo(connection);
    let savedDoc = await connectionDocument.save();
    // loggerClass.writeDebugLogs(savedDoc);
    return savedDoc;
}

exports.getSavedConnection = async function (connectionFilter, columnsRequired, sortParams, paginationParams) {
    //const loggerClass = new LoggerClass("getSavedConnection::", arguments)
    let mongoQuery = getConnectionMongoQuery(connectionFilter);
    modifyMongoQuery(mongoQuery, columnsRequired, sortParams, paginationParams);
    let connectionResult = await mongoQuery.exec();
    // loggerClass.writeDebugLogs(connectionResult);
    return connectionResult;
}

exports.updateConnection = async function (connectionFilter, toUpdateObj) {
    //const loggerClass = new LoggerClass("updateConnection::", arguments)
    let filter = getConnectionMongoQuery(connectionFilter);
    toUpdateObj.update_date = Date.now();
    let updatedObj = await ConnectionDo.updateOne(filter, { $set: toUpdateObj }, { upsert: true })
    //loggerClass.writeDebugLogs(updatedObj);
    return updatedObj;
}

exports.deleteConnection = async function (connectionFilter) {
    //const loggerClass = new LoggerClass("deleteConnection::", arguments)
    let filter = getRawQueryInJson(connectionFilter);
    let deletedObj = await ConnectionDo.deleteMany(filter);
    //loggerClass.writeDebugLogs(deletedObj);
    return deletedObj;
}

function getConnectionMongoQuery(connectionFilter) {
    const mongoFilterJson = getRawQueryInJson(connectionFilter);
    var mongoQuery = ConnectionDo.find(mongoFilterJson);
    return mongoQuery;
}

function getRawQueryInJson(connectionFilter) {
    let connectionFilterJson = {};
    if (connectionFilter.workfolderIdArray) {
        connectionFilterJson['workfolder_id'] = connectionFilter.workfolderIdArray;
    }
    if (connectionFilter.pronnelUserIdArray) {
        connectionFilterJson['pronnel_user_id'] = connectionFilter.pronnelUserIdArray;
    }
    if (connectionFilter.idArray) {
        connectionFilterJson['_id'] = connectionFilter.idArray;
    }
    if (connectionFilter.appInstanceIdArray) {
        connectionFilterJson['app_instance_id'] = connectionFilter.appInstanceIdArray;
    }
    if (connectionFilter.createdDate) {
        connectionFilterJson['create_date'] = connectionFilter.createdTime;
    }
    if (connectionFilter.orgIdArray) {
        connectionFilterJson['org_id'] = connectionFilter.orgIdArray;
    }
    let mongoFilterJson = createMongoAndFilterForColumns(connectionFilterJson,
        FILTER_COLUMNS,
        RANGE_COLUMNS,
        undefined,
        undefined
    )
    return mongoFilterJson;
}