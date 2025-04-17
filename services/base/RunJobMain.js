const { HelloJob } = require("../testservice/jobs/hellojob");
const { JobWithParameter } = require("../testservice/jobs/jobwithparameter");

const dotenv = require("dotenv");
const mongoose = require("mongoose");

async function main() {

    // Don't import your service before this function as connection will not be loaded.
    const { TestService } = require("../testservice/TestService");

    let job = await TestService.getInstance().queueJob(new HelloJob());
    let job1 = await TestService.getInstance().queueJob(new JobWithParameter("vinkal"), 100);

    let delayedJob = await TestService.getInstance().getQueue().getJobs(['delayed']);
    for (let job of delayedJob) {
        job.data.myData = "abhinav";
        console.log(job.data);
    }

    let delayedJob1 = await TestService.getInstance().getQueue().getJobs(['delayed']);
    for (let job of delayedJob1) {
        console.log(job.data);
    }

    // console.log("job scheduled", job);
    // loadAllClasses(walk("./services"));
}

(async () => {
    try {
        dotenv.config({
            path: (process.env.NODE_ENV || 'staging') + '.env'
        });

        mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        await main();
    } catch (e) {
        console.log(e);
        // Handle connection or execution errors
    }
})();
