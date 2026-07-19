const { BaseJob } = require("../../base/basejob");

class HelloJob extends BaseJob {
    completed(job) {
        // Optional: add any logic here if needed
    }

    failed(job) {
        // Optional: add any logic here if needed
    }

    async handle(job) {
        console.log("Hello Job");
        console.log("Job Details", job?.asJSON());
    }
}

module.exports = { HelloJob };
