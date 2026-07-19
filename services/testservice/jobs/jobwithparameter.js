const { BaseJob } = require("../../base/basejob");
const { Job } = require("bullmq");

class JobWithParameter extends BaseJob {
    constructor(myData) {
        super();
        this.myData = myData;
    }

    completed(job) {
        // Optional: logic when job completes
    }

    failed(job) {
        // Optional: logic when job fails
    }

    async handle(job) {
        console.log("Hello Job");
        console.log("Job Details", job?.asJSON());
        console.log("Print parameters", this.myData);
    }
}

module.exports = { JobWithParameter };
