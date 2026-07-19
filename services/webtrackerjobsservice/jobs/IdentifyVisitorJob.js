const { BaseJob } = require('../../base/basejob');

/**
 * IdentifyVisitorJob - Job to identify/merge a visitor with personal info
 */
class IdentifyVisitorJob extends BaseJob {
    constructor(data) {
        super(data);
    }
}

module.exports = { IdentifyVisitorJob };
