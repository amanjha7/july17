const { Queue, QueueScheduler, QueueEvents } = require("bullmq");
const { connection } = require("./queueconfig");
const { jobHandler } = require("./jobhandler");
const {logger} = require("../../src/config/logger");

class BaseService {
    static serverNumber = Number(process.env.SERVER_NUMBER)
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.queue = new Queue(this.serviceName, { connection });
        this.queueEvents = new QueueEvents(this.queue.name, { connection });

        this.ownServiceName = serviceName + BaseService.serverNumber;
        this.ownQueue = new Queue(this.ownServiceName, { connection });
        this.ownQueueEvents = new QueueEvents(this.ownQueue.name, { connection });

        this.queueServerMap = new Map();
        this.queueServerMap.set(BaseService.serverNumber, this.ownQueue);
    }

    async queueJob(baseJob, delayInSeconds = 0, opts = {}, serverNumberToRun = -1, automationRuleId = '') {
        opts['removeOnComplete'] = {
            age: 1 * 24 * 3600,
        };
        opts['removeOnFail'] = {
            age: 7 * 24 * 3600,
        };
        opts['delay'] = delayInSeconds * 1000;

        if (await this.checkIfSameCronExists(baseJob, opts, serverNumberToRun, automationRuleId)) {
            logger.info("Job with same cron already exist. Not queuing this cron job: " + baseJob.name);
            return;
        }

        if (serverNumberToRun < 0) {
            const newJob = await this.queue.add(baseJob.name, baseJob, opts);
            logger.info("Job Queued:: " + newJob.id + " " + baseJob.name);
            return newJob;
        } else {
            if (!this.queueServerMap.get(serverNumberToRun)) {
                const serverQueue = new Queue(this.serviceName + serverNumberToRun, { connection });
                this.queueServerMap.set(serverNumberToRun, serverQueue);
            }
            const serverQueue = this.queueServerMap.get(serverNumberToRun);
            const newJob = await serverQueue.add(baseJob.name, baseJob, opts);
            logger.info("Job Queued:: " + (newJob?.id) + " " + baseJob.name);
            return newJob;
        }
    }

    getQueue() {
        return this.queue;
    }

    getQueueEvents() {
        return this.queueEvents;
    }

    async getJobDetails(jobId) {
        return await this.queue.getJob(jobId);
    }

    async checkIfSameCronExists(baseJob, opts = {}, serverNumberToRun = -1, automationRuleId = '') {
        if (!opts.repeat?.cron) {
            return false;
        }

        let repeatableJobs;
        if (serverNumberToRun < 0) {
            repeatableJobs = await this.getQueue().getRepeatableJobs();
        } else {
            if (!this.queueServerMap.get(serverNumberToRun)) {
                const serverQueue = new Queue(this.serviceName + serverNumberToRun, { connection });
                this.queueServerMap.set(serverNumberToRun, serverQueue);
            }
            const serverQueue = this.queueServerMap.get(serverNumberToRun);
            repeatableJobs = await serverQueue.getRepeatableJobs();
        }

        for (let i = 0; i < repeatableJobs?.length; i++) {
            const repeatableJob = repeatableJobs[i];
            if (repeatableJob.name === baseJob.name && repeatableJob.cron === opts.repeat?.cron) {
                return true;
            }
        }

        return false;
    }

    static async startServices(serviceNameArray) {
        const { getFilesFromDirectoryRecursively, loadAllClassesDynamically } = require("../../src/utils/apputils");
        const allTypeScriptFiles = getFilesFromDirectoryRecursively('./services');
        const filteredTypeScriptFiles = this.filterFiles(allTypeScriptFiles);
        const allTypeScriptClasses = loadAllClassesDynamically(filteredTypeScriptFiles);

        for (const serviceName of serviceNameArray) {
            await BaseService.setupScheduler(serviceName, allTypeScriptClasses);
            await BaseService.setupScheduler(serviceName + BaseService.serverNumber, allTypeScriptClasses);
        }
    }

    static async setupScheduler(serviceName, allTypeScriptClasses) {
        logger.info("setupScheduler :: Redis connection for services " + connection);
        const queueScheduler = new QueueScheduler(serviceName, { connection });
        await queueScheduler.waitUntilReady();
        await jobHandler(serviceName, allTypeScriptClasses);
    }

    static filterFiles(allTypeScriptFiles) {
        const filteredTypeScriptFiles = [];
        allTypeScriptFiles.forEach((filePath) => {
            if (filePath.includes("jobs")) {
                filteredTypeScriptFiles.push(filePath);
            }
        });
        return filteredTypeScriptFiles;
    }
}

BaseService.serverNumber = Number(process.env.SERVER_NUMBER);

module.exports = { BaseService };
