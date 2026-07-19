exports.convertToJsonArray = function (obj) {
    if (obj instanceof Array) {
        return obj
    }
    else {
        return [obj];
    }
}

exports.jsonArrayToSelectString = function (jsonArray) {
    var outputString = "";
    jsonArray.forEach(function (obj) {
        outputString += obj + " ";
    });
    return outputString;
}

exports.modifyMongoQuery = function (mongoQuery, columnsRequired, sortParams, paginationParams) {
    if (columnsRequired) {
        mongoQuery.select(exports.jsonArrayToSelectString(columnsRequired))
    }

    if (sortParams) {
        mongoQuery.collation({ locale: 'en_US', strength: 2 }).sort(sortParams)
    }
    if (paginationParams) {
        if (paginationParams.start_from) {
            mongoQuery.skip(paginationParams.start_from)
        }
        if (paginationParams.page_size) {
            mongoQuery.limit(paginationParams.page_size)
            if (paginationParams.page_number) {
                if (paginationParams.page_number < 1) {
                    paginationParams.page_number = 1
                }
                mongoQuery.skip(paginationParams.page_size * (paginationParams.page_number - 1))
            }
        }
    }
}
/**
 *
 * @param filterJson
 * @param inColumnNamesArray ["user_id", "org_id", "group.name"]
 *          These are the columns on which you want to match the values passed. Mostly used for string, id, etc.
 *          If those column are inside the json object then you have to pass the whole hirearchy by seperating with .
 *
 *          For DAO layer these are the master column names on which you want to give filter
 * @param rangeColumnNamesArray ["create_date", "marks"]
 *          These columns are the one in which you want to perform the range operations. Common examples are column whose types
 *          are number, date, etc.
 *          If those column are inside the json object then you have to pass the whole hirearchy by seperating with .
 *
 *          For DAO layer these are the master column names on which you want to give filter
 *
 * Note: In this we are not checking the schema. Developer needs to check if they are passing correct data.
 * @param arrayColumnNamesObjectArray
 * Let us suppose our Mongo collection is as follows
 * {
 *     _id: ObjectId("hawhhdsh"),
 *     "members"[
 *         {
 *             "date_of_join":"D1",
 *             "user_id": "12"
 *         },
 *         {
 *             "date_of_join":"D2",
 *             "user_id": "13"
 *         }
 *     ],
 *     "users":[
 *         {
 *              "name": "Vinkal"
 *             "user_details":{
 *                 "user_id":"100"
 *             }
 *         },
 *         {
 *              "name": "Vishnoi"
 *             "user_details":{
 *                 "user_id":"101"
 *             }
 *         }
 *     ]
 * }
 * Let us suppose you want to filter inside array members and users. So you can pass as below
 * [
 *    { "members": "user_id"} //Here group_members is the array and user_id is the key inside the JSON object
 *    { "users": "user_details.user_id"}//Here users is the array and user_details.user_id is the nested key inside the JSON object
 * ]
 *
 * For DAO layer these are the master array column names on which you want to give filter
 * @returns {{}}
 *
 *     Below are shown just to understand how the JSON is constructed.
 *     Method named createMongoAndFilterForColumns will give the json in this format.
 *     const mongoFilterJson = {};
 *     if(userGroupFilterJson.org_id){
 *         mongoFilterJson['org_id'] = {"$in": convertToJsonArray(userGroupFilterJson.org_id)}
 *     }
 *     if(userGroupFilterJson.group_name){
 *         mongoFilterJson['group_name'] = {"$in": convertToJsonArray(userGroupFilterJson.group_name)}
 *     }
 *
 */
exports.createMongoAndFilterForColumns = function (filterJson, inColumnNamesArray,
    rangeColumnNamesArray, arrayColumnNamesObjectArray,
    allowedsearchcolumns) {
    const mongoFilterJson = {};
    if (inColumnNamesArray.find(element => element === 'is_deleted')) {
        mongoFilterJson['is_deleted'] = { "$in": exports.convertToJsonArray(false) }
    }
    if (inColumnNamesArray.find(element => element === 'isDeleted')) {
        mongoFilterJson['isDeleted'] = { "$in": exports.convertToJsonArray(false) }
    }
    if (inColumnNamesArray.find(element => element === 'is_enabled')) {
        if (filterJson['is_enabled'] !== undefined) {
            mongoFilterJson['is_enabled'] = { "$in": exports.convertToJsonArray(filterJson['is_enabled']) }
        }
    }
    if (inColumnNamesArray) {
        inColumnNamesArray.forEach(function (columnName) {
            if (filterJson[columnName]) {
                mongoFilterJson[columnName] = { "$in": exports.convertToJsonArray(filterJson[columnName]) }
            }
        });
    }
    if (rangeColumnNamesArray) {
        rangeColumnNamesArray.forEach(function (columnName) {
            if (filterJson[columnName]) {
                var rangeFilterJson = {}
                if (filterJson[columnName]['from']) {
                    rangeFilterJson["$gte"] = filterJson[columnName]['from']
                }
                if (filterJson[columnName]['to']) {
                    rangeFilterJson["$lte"] = filterJson[columnName]['to']
                }
                mongoFilterJson[columnName] = rangeFilterJson
            }
        })
    }
    if (arrayColumnNamesObjectArray) {
        arrayColumnNamesObjectArray.forEach(function (arrayColumnNameObject) {
            var arrayKeys = Object.keys(arrayColumnNameObject);
            if (arrayKeys.length == 0) {
                return
            }
            var arrayColumnName = arrayKeys[0];
            var objectColumnNameInArray = arrayColumnNameObject[arrayColumnName];
            if (filterJson[arrayColumnName] && filterJson[arrayColumnName][objectColumnNameInArray]) {
                if (!mongoFilterJson[arrayColumnName]) {
                    mongoFilterJson[arrayColumnName] = { "$elemMatch": {} }
                }
                var elemMatchJson = mongoFilterJson[arrayColumnName]["$elemMatch"]
                elemMatchJson[objectColumnNameInArray] = { "$in": exports.convertToJsonArray(filterJson[arrayColumnName][objectColumnNameInArray]) }
            }
        })
    }
    if (allowedsearchcolumns && filterJson['search_params'] && filterJson['search_params']['search_text']) {
        var givenSearchColumns = allowedsearchcolumns;
        if (filterJson['search_params']['search_columns'] && filterJson['search_params']['search_columns'].length > 0) {
            givenSearchColumns = filterJson['search_params']['search_columns']
        }
        var filteredSearchColumns = givenSearchColumns.filter(value => allowedsearchcolumns.includes(value));
        var searchJsonArray = []
        filteredSearchColumns.forEach(function (columnName) {
            var tempJson = {}
            tempJson[columnName] = { '$regex': exports.escapeRegExp(filterJson['search_params']['search_text']), '$options': 'i' };
            searchJsonArray.push(tempJson)
        })
        mongoFilterJson["$or"] = searchJsonArray;
    }

    return mongoFilterJson;
}

exports.escapeRegExp = function (string) {
    return string.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&'); // $& means the whole matched string
}
