const { ConnectionFilter } = require('../filters/connectionfilter');
const axios = require('axios');
const { getSavedConnection } = require('../dbhelper/connectiondao');
const { logger } = require('../config/logger');

const verifySignature = async function (secret, header, payload) {
    let encoder = new TextEncoder();
    let parts = header.split("=");
    let sigHex = parts[1];

    let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

    let keyBytes = encoder.encode(secret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        extractable,
        ["sign", "verify"],
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    let equal = await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes,
    );

    return equal;
}

function hexToBytes(hex) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
        let c = hex.slice(i, i + 2);
        let b = parseInt(c, 16);
        bytes[index] = b;
        index += 1;
    }

    return bytes;
}

const fetchAccessToken = async function (data) {
    let accessToken;
    //Get the connection id from request
    let appInstanceId = data.context.app_instance_id;
    //Fetch the data related to this connectionId in the database
    let filter = new ConnectionFilter();
    filter.appInstanceIdArray = appInstanceId;
    try {
        let result = await getSavedConnection(filter);
        if (result?.length) {
            accessToken = result[0].access_token;
        }
        return accessToken;
    }
    catch (err) {
        logger.error('Error encountered in fetchAccessToken(). Error is : ', err);
        throw err;
    }
}

const getValueFromJSONObjKey = function (key, array) {
    let org = array.find(obj => obj.field_key === key);
    return org?.value;
}

const createGitHubApiHeader = function (accessToken) {
    return {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }
}

const readJsonFile = (filePath, callback) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return callback(err, null);
        }
        try {
            const jsonData = JSON.parse(data);
            callback(null, jsonData);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            callback(parseError, null);
        }
    });
};

function convertToCustomDateObject(epochTime) {
    // Reference date (January 1, 1900)
    const referenceDate = new Date("1900-01-01T00:00:00Z");
    
    // Calculate `date` as days since January 1, 1900
    const dateInDays = Math.floor((epochTime - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate `day_time` (milliseconds since the start of the day)
    const dayStart = new Date(epochTime).setUTCHours(0, 0, 0, 0);
    const dayTime = epochTime - dayStart;
    
    // Construct the custom object
    return {
        date: dateInDays,
        time: epochTime,
        is_time_added: true,
        day_time: dayTime,
    };
}

function generateCryptoSignature(payload, secret) {
    const crypto = require("crypto");
    const hash = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    return hash;
}

module.exports = {
    verifySignature,
    fetchAccessToken,
    getValueFromJSONObjKey,
    createGitHubApiHeader,
    readJsonFile,
    convertToCustomDateObject,
    generateCryptoSignature
}