const { TestService } = require("./services/testservice/testservice");
const { HelloJob } = require("./services/testservice/jobs/hellojob");

class CronJobs {
    static async start() {
        // Example Cron Jobs
        await TestService.getInstance().queueJob(new HelloJob(), 0, {
            repeat: {
                cron: "*/1 * * * *"
            }
        });
    }
}

module.exports = { CronJobs };
