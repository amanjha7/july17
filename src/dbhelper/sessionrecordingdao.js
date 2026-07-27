const { createMongoAndFilterForColumns, modifyMongoQuery } = require("./mongohelpers");
const SessionRecordingDo = require("../models/sessionRecording");

const FILTER_COLUMNS = [
    "_id",
    "session_id",
    "visitor_id",
    "tracking_token"
];

const RANGE_COLUMNS = [
    "created_at",
    "updated_at"
];

exports.saveSessionRecording = async function (sessionRecording) {
    let sessionRecordingDocument = new SessionRecordingDo(sessionRecording);
    let savedDoc = await sessionRecordingDocument.save();
    return savedDoc;
};

exports.getSessionRecording = async function (
    sessionRecordingFilter,
    columnsRequired,
    sortParams,
    paginationParams
) {
    let mongoQuery = getSessionRecordingMongoQuery(sessionRecordingFilter);
    modifyMongoQuery(
        mongoQuery,
        columnsRequired,
        sortParams,
        paginationParams
    );
    let sessionRecordingResult = await mongoQuery.exec();
    return sessionRecordingResult;
};

exports.updateSessionRecording = async function (
    sessionRecordingFilter,
    toUpdateObj
) {
    let filter = getRawQueryInJson(sessionRecordingFilter);
    let updatedObj = await SessionRecordingDo.updateMany(
        filter,
        { $set: toUpdateObj }
    );
    return updatedObj;
};

exports.updateOneSessionRecording = async function (
    sessionRecordingFilter,
    toUpdateObj,
    options = {}
) {
    let filter = getRawQueryInJson(sessionRecordingFilter);
    let updatedObj = await SessionRecordingDo.updateOne(
        filter,
        { $set: toUpdateObj },
        options
    );
    return updatedObj;
};

exports.findOneAndUpdateSessionRecording = async function (
    sessionRecordingFilter,
    toUpdateObj,
    options = { new: true }
) {
    let filter = getRawQueryInJson(sessionRecordingFilter);
    return await SessionRecordingDo.findOneAndUpdate(
        filter,
        { $set: toUpdateObj },
        options
    );
};

exports.deleteSessionRecording = async function (sessionRecordingFilter) {
    let filter = getRawQueryInJson(sessionRecordingFilter);
    let deletedObj = await SessionRecordingDo.deleteMany(filter);
    return deletedObj;
};

function getSessionRecordingMongoQuery(sessionRecordingFilter) {
    const mongoFilterJson = getRawQueryInJson(sessionRecordingFilter);
    return SessionRecordingDo.find(mongoFilterJson);
}

function getRawQueryInJson(sessionRecordingFilter) {
    let sessionRecordingFilterJson = {};

    if (sessionRecordingFilter.idArray) {
        sessionRecordingFilterJson["_id"] =
            sessionRecordingFilter.idArray;
    }

    if (sessionRecordingFilter.sessionIdArray) {
        sessionRecordingFilterJson["session_id"] =
            sessionRecordingFilter.sessionIdArray;
    }

    if (sessionRecordingFilter.visitorIdArray) {
        sessionRecordingFilterJson["visitor_id"] =
            sessionRecordingFilter.visitorIdArray;
    }

    if (sessionRecordingFilter.trackingTokenArray) {
        sessionRecordingFilterJson["tracking_token"] =
            sessionRecordingFilter.trackingTokenArray;
    }

    if (sessionRecordingFilter.createdAt) {
        sessionRecordingFilterJson["created_at"] =
            sessionRecordingFilter.createdAt;
    }

    if (sessionRecordingFilter.updatedAt) {
        sessionRecordingFilterJson["updated_at"] =
            sessionRecordingFilter.updatedAt;
    }

    let mongoFilterJson = createMongoAndFilterForColumns(
        sessionRecordingFilterJson,
        FILTER_COLUMNS,
        RANGE_COLUMNS,
        undefined,
        undefined
    );

    return mongoFilterJson;
}