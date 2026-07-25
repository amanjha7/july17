const { BaseFilter } = require("./basefilter");

class TrackingConfigFilter extends BaseFilter {
    constructor(
        pronnelTrackingIdArray,
        boardIdArray,
        appTrackingIdArray,
        appInstanceIdArray,
        trackingSettingsIdArray,
        createdTime
    ) {
        super();
        this.pronnelTrackingIdArray = pronnelTrackingIdArray;
        this.boardIdArray = boardIdArray;
        this.appTrackingIdArray = appTrackingIdArray;
        this.appInstanceIdArray = appInstanceIdArray;
        this.trackingSettingsIdArray = trackingSettingsIdArray;
        this.createdTime = createdTime;
    }
}

module.exports = { TrackingConfigFilter };