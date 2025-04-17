import { TestService } from "./services/testservice/TestService";

class CronJobs {

    static async start() {
        // Example Cron Jobs
        await TestService.getInstance().queueJob(new UpdateLastActivityTime(), 0, {
            repeat: {
                cron: "0 0 */12 ? * *"
            }
        });
    }
}

export default { CronJobs };
