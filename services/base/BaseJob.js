class BaseJob {
    constructor() {
        this.name = this.constructor.name;
        this.jobDetails = null;
    }

    // Should be overridden in derived classes
    failed(job) {
        throw new Error("Method 'failed' must be implemented.");
    }

    // Should be overridden in derived classes
    completed(job) {
        throw new Error("Method 'completed' must be implemented.");
    }

    async handle(job, currentStep) {
        // To be implemented in derived classes if needed
    }

    moveToNextStep() {
        // Logic to move to the next step
    }

    setJobDetails(jobDetails) {
        this.jobDetails = jobDetails;
    }

    getJobDetails() {
        return this.jobDetails;
    }
}

module.exports = { BaseJob };
