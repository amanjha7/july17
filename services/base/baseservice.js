const { Queue, Worker } = require('bullmq');
const { logger } = require('../../src/config/logger');

const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined
};

/**
 * BaseService - Singleton base class for all background job services
 * Uses BullMQ for job queue processing
 */
class BaseService {
    constructor(serviceName) {
        if (this.constructor === BaseService) {
            throw new Error('BaseService is abstract and cannot be instantiated directly');
        }
        this.serviceName = serviceName;
        this.queue = null;
        this.worker = null;
        this.isRunning = false;
    }

    /**
     * Initialize the BullMQ queue for this service
     */
    initializeQueue() {
        if (!this.queue) {
            this.queue = new Queue(this.serviceName, {
                connection: REDIS_CONNECTION,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    removeOnComplete: {
                        age: 3600 * 24, // Keep completed jobs for 1 day
                        count: 1000
                    },
                    removeOnFail: {
                        age: 3600 * 24 * 7 // Keep failed jobs for 7 days
                    }
                }
            });
            logger.info(`[${this.serviceName}] Queue initialized`);
        }
        return this.queue;
    }

    /**
     * Initialize the BullMQ worker for this service
     * @param {Function} jobHandler - async function to handle each job
     */
    initializeWorker(jobHandler) {
        if (!this.worker) {
            this.worker = new Worker(
                this.serviceName,
                async (job) => {
                    logger.info(`[${this.serviceName}] Processing job: ${job.name} (ID: ${job.id})`);
                    try {
                        await jobHandler(job);
                        logger.info(`[${this.serviceName}] Job ${job.id} completed successfully`);
                    } catch (err) {
                        logger.error(`[${this.serviceName}] Job ${job.id} failed: ${err.message}`);
                        throw err;
                    }
                },
                {
                    connection: REDIS_CONNECTION,
                    concurrency: 5
                }
            );

            this.worker.on('completed', (job) => {
                logger.info(`[${this.serviceName}] Worker completed job: ${job.id}`);
            });

            this.worker.on('failed', (job, err) => {
                logger.error(`[${this.serviceName}] Worker failed job: ${job?.id} - ${err.message}`);
            });

            logger.info(`[${this.serviceName}] Worker initialized`);
        }
        return this.worker;
    }

    /**
     * Queue a job for processing
     * @param {BaseJob} job - The job instance
     * @param {number} delay - Delay in milliseconds before processing
     * @param {object} options - Additional BullMQ job options
     * @returns {Promise<Job>}
     */
    async queueJob(job, delay = 0, options = {}) {
        if (!this.queue) {
            this.initializeQueue();
        }

        const jobOptions = {
            ...options,
            delay
        };

        const queuedJob = await this.queue.add(job.getJobName(), job.data, jobOptions);
        logger.info(`[${this.serviceName}] Queued job: ${job.getJobName()} (ID: ${queuedJob.id})`);
        return queuedJob;
    }

    /**
     * Start the service (queue + worker)
     * @param {Function} jobHandler
     */
    start(jobHandler) {
        if (this.isRunning) return;

        this.initializeQueue();
        this.initializeWorker(jobHandler);
        this.isRunning = true;
        logger.info(`[${this.serviceName}] Service started`);
    }

    /**
     * Gracefully stop the service
     */
    async stop() {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }
        if (this.queue) {
            await this.queue.close();
            this.queue = null;
        }
        this.isRunning = false;
        logger.info(`[${this.serviceName}] Service stopped`);
    }

    /**
     * Static method to start multiple services by name
     * Services are auto-discovered and instantiated
     * @param {string[]} serviceNames - Array of service names to start
     */
    static async startServices(serviceNames) {
        const services = {
            'PronnelOauthService': () => {
                const { PronnelOauthService } = require('../oauthservice/pronneloauthservice');
                return PronnelOauthService.getInstance();
            },
            'WebtrackerJobsService': () => {
                const { WebtrackerJobsService } = require('../webtrackerjobsservice/webtrackerjobsservice');
                return WebtrackerJobsService.getInstance();
            }
        };

        for (const name of serviceNames) {
            const factory = services[name];
            if (factory) {
                try {
                    const service = factory();
                    service.start();
                    logger.info(`[BaseService] Started service: ${name}`);
                } catch (err) {
                    logger.error(`[BaseService] Failed to start service ${name}: ${err.message}`);
                }
            } else {
                logger.warn(`[BaseService] Unknown service: ${name}`);
            }
        }
    }
}

module.exports = { BaseService };
