const { ConnectionFilter } = require('../filters/connectionfilter');
const axios = require('axios');
const { getSavedConnection } = require('../dbhelper/connectiondao')

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
        console.log(err);
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

module.exports = {
    verifySignature,
    fetchAccessToken,
    getValueFromJSONObjKey,
    createGitHubApiHeader,
    readJsonFile
}