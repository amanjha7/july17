const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
};

const parsed = Number.parseInt(process.env.CONCURRENT_BULLMQ_WORKER ?? "");
const concurrency = isNaN(parsed) ? 1 : parsed;

module.exports = {
    connection,
    concurrency
};
