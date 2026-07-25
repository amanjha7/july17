const { createMongoAndFilterForColumns, modifyMongoQuery } = require("./mongohelpers");
const TrackingConfigDo = require('../models/trackingconfig');

const FILTER_COLUMNS = [
    'pronnel_tracking_id',
    'board_id',
    'app_tracking_id',
    'app_instance_id',
    'tracking_settings_id',
    '_id'
];

const RANGE_COLUMNS = ['create_date'];


// ✅ SAVE
exports.saveTrackingConfig = async function (trackingConfig) {
    trackingConfig.create_date = Date.now();
    let trackingDocument = new TrackingConfigDo(trackingConfig);
    let savedDoc = await trackingDocument.save();
    return savedDoc;
}


// ✅ GET
exports.getTrackingConfig = async function (trackingConfigFilter, columnsRequired, sortParams, paginationParams) {
    let mongoQuery = getTrackingConfigMongoQuery(trackingConfigFilter);
    modifyMongoQuery(mongoQuery, columnsRequired, sortParams, paginationParams);
    let result = await mongoQuery.exec();
    return result;
}


// ✅ UPDATE (UPSERT)
exports.updateTrackingConfig = async function (trackingConfigFilter, toUpdateObj) {
    let filter = getTrackingConfigMongoQuery(trackingConfigFilter);
    toUpdateObj.update_date = Date.now();

    let updatedObj = await TrackingConfigDo.updateOne(
        filter,
        { $set: toUpdateObj },
        { upsert: true }
    );

    return updatedObj;
}


// ✅ DELETE
exports.deleteTrackingConfig = async function (trackingConfigFilter) {
    let filter = getRawQueryInJson(trackingConfigFilter);
    let deletedObj = await TrackingConfigDo.deleteMany(filter);
    return deletedObj;
}


// 🔍 INTERNAL: BUILD QUERY
function getTrackingConfigMongoQuery(trackingConfigFilter) {
    const mongoFilterJson = getRawQueryInJson(trackingConfigFilter);
    return TrackingConfigDo.find(mongoFilterJson);
}


// 🔥 CORE FILTER BUILDER
function getRawQueryInJson(trackingConfigFilter) {
    let filterJson = {};

    if (trackingConfigFilter.pronnelTrackingIdArray) {
        filterJson['pronnel_tracking_id'] = trackingConfigFilter.pronnelTrackingIdArray;
    }

    if (trackingConfigFilter.boardIdArray) {
        filterJson['board_id'] = trackingConfigFilter.boardIdArray;
    }

    if (trackingConfigFilter.appTrackingIdArray) {
        filterJson['app_tracking_id'] = trackingConfigFilter.appTrackingIdArray;
    }

    if (trackingConfigFilter.appInstanceIdArray) {
        filterJson['app_instance_id'] = trackingConfigFilter.appInstanceIdArray;
    }

    if (trackingConfigFilter.trackingSettingsIdArray) {
        filterJson['tracking_settings_id'] = trackingConfigFilter.trackingSettingsIdArray;
    }

    if (trackingConfigFilter.idArray) {
        filterJson['_id'] = trackingConfigFilter.idArray;
    }

    if (trackingConfigFilter.createdTime) {
        filterJson['create_date'] = trackingConfigFilter.createdTime;
    }

    let mongoFilterJson = createMongoAndFilterForColumns(
        filterJson,
        FILTER_COLUMNS,
        RANGE_COLUMNS,
        undefined,
        undefined
    );

    return mongoFilterJson;
}