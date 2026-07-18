const { BaseJob } = require('../../base/basejob');

/**
 * TrackEventJob - Job to track and save a website event
 */
class TrackEventJob extends BaseJob {
    constructor(data) {
        super(data);
    }
}

module.exports = { TrackEventJob };
