const { BaseJob } = require('../../base/basejob');

/**
 * SaveSessionRecordingJob - Job to save session recording / rrweb events
 */
class SaveSessionRecordingJob extends BaseJob {
    constructor(data) {
        super(data);
    }
}

module.exports = { SaveSessionRecordingJob };
