/**
 * BaseJob - Abstract base class for all background jobs
 */
class BaseJob {
    constructor(data = {}) {
        this.data = data;
        this.createdAt = Date.now();
    }

    /**
     * Handle method - to be overridden by subclasses
     * Each job must implement its own handle method
     */
    async handle() {
        throw new Error('handle() method must be implemented by subclass');
    }

    /**
     * Get the job name for queue identification
     */
    getJobName() {
        return this.constructor.name;
    }
}

module.exports = { BaseJob };
