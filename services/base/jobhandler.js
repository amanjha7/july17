const { Worker } = require("bullmq");
const { isEmpty } = require("lodash");
const { plainToInstance } = require("class-transformer");
const {logger} = require("../../src/config/logger");
const { concurrency, connection } = require("./queueconfig");

const jobHandler = (queueName, allTypeScriptClasses) => {
    const worker = new Worker(
        queueName,
        async (job) => {
            const instanceClass = allTypeScriptClasses.get(job.data.name);
            const instance = plainToInstance(instanceClass, job.data);

            if (isEmpty(instance)) {
                throw new Error(`Unable to find job: ${job.data.name}`);
            }

            logger.info("jobHandler :: job Info :: JobId: " + job.id + " JobName: " + job.name);
            logger.debug("jobHandler :: job Details", job.asJSON());

            if (typeof instance.setJobDetails === "function") {
                instance.setJobDetails(job);
            }

            if (typeof instance.handle === "function") {
                await instance.handle(job);
            }

            return { status: 200, message: "Success" };
        },
        {
            concurrency: concurrency,
            connection: connection
        }
    );

    worker.on("failed", (job) => {
        logger.error("Job Failed:: job Details", job.asJSON());
        // You can re-enable the failed logic here if needed
        // const instance = plainToInstance(allTypeScriptClasses.get(job.data.name), job.data);
        // if (typeof instance.failed === "function") {
        //     instance.failed(job);
        // }
    });

    worker.on("completed", (job) => {
        logger.debug("Job Completed:: job Details", job.asJSON());
    });
};

module.exports = { jobHandler };
