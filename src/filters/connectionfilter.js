const { BaseFilter } = require("./basefilter");

class ConnectionFilter extends BaseFilter {
    constructor(pronnelUserIdArray, idArray, appInstanceIdArray, workfolderIdArray, orgIdArray, createdTime,typeArray) {
        super();
        this.pronnelUserIdArray = pronnelUserIdArray;
        this.idArray = idArray;
        this.appInstanceIdArray = appInstanceIdArray;
        this.workfolderIdArray = workfolderIdArray;
        this.orgIdArray = orgIdArray;
        this.createdTime = createdTime;
        this.typeArray =typeArray;
        }
}

module.exports = { ConnectionFilter };
