const { BaseFilter } = require("./basefilter");

class ConnectionFilter extends BaseFilter {
    constructor(pronnelUserIdArray, idArray, appInstanceIdArray, workfolderIdArray, orgIdArray, createdTime) {
        super();
        this.pronnelUserIdArray = pronnelUserIdArray;
        this.idArray = idArray;
        this.appInstanceIdArray = appInstanceIdArray;
        this.workfolderIdArray = workfolderIdArray;
        this.orgIdArray = orgIdArray;
        this.createdTime = createdTime;
    }
}

module.exports = { ConnectionFilter };
