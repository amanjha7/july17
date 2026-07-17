const { BaseService } = require("../base/baseservice");

class WebtrackerJobsService extends BaseService {
    static instance;
    name = this.constructor.name;

    constructor() {
        super(WebtrackerJobsService.name);
    }

    static getInstance() {
        if (!WebtrackerJobsService.instance) {
            WebtrackerJobsService.instance = new WebtrackerJobsService();
        }
        return WebtrackerJobsService.instance;
    }
}

module.exports = { WebtrackerJobsService };
