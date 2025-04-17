// Importing required modules
const { plainToInstance } = require("class-transformer");
const { HelloJob } = require("../testservice/jobs/hellojob");

// Creating a job dictionary map
const JobDictonary = new Map([
    [HelloJob.name, HelloJob]
]);

// Function to get job instance from dictionary and transform it
const getJobInstance = (data) => {
    const jobClass = JobDictonary.get(data.name);
    if (jobClass) {
        return plainToInstance(jobClass, data);
    }
    return {};
};

// Exporting the dictionary and function
module.exports = {
    JobDictonary,
    getJobInstance
};
