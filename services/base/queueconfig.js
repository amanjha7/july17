const { ConnectionOptions } = require("bullmq");

const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
};

const concurrency = parseInt(process.env.CONCURRENT_BULLMQ_WORKER);

module.exports = {
    connection,
    concurrency
};
