const { v4: uuidv4 } = require('uuid'); // For generating unique correlation IDs
const { AsyncLocalStorage } = require('async_hooks'); // For maintaining per-request context
const { createLogger, format, transports } = require('winston');
const { combine, splat, timestamp, printf } = format;
const util = require('util');

// Create an AsyncLocalStorage instance
const asyncLocalStorage = new AsyncLocalStorage();

// Middleware to assign and store the correlation ID (to be used in your app)
function setCorrelationId(req, res, next) {
    const correlationId = uuidv4(); // Generate unique ID
    asyncLocalStorage.run(new Map(), () => {
        asyncLocalStorage.getStore().set('correlationId', correlationId); // Store correlation ID
        next();
    });
}

// Helper function to get correlation ID
function getCorrelationId() {
    const store = asyncLocalStorage.getStore();
    return store ? store.get('correlationId') : 'no-correlation-id';
}

// Modify the logger format to include correlation ID
const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let correlationId = getCorrelationId(); // Get the current correlation ID
    let msg = `${timestamp}|${level}|${correlationId}| : ${message} `;

    if (metadata) {
        if (typeof metadata !== 'string') {
            metadata = util.inspect(metadata, {
                depth: 5,
                colors: true,
                breakLength: Infinity,
                compact: true,
            });
        }
        msg += metadata;
    }
    return msg;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        format.colorize({ all: true }),
        splat(),
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.Console({ level: process.env.CONSOLE_LOG_TYPE }),
        new transports.File({ filename: 'log.out', level: process.env.FILE_LOG_TYPE }),
    ]
});

// Log query with correlation ID
logger.logQuery = function(modelName, queryString, timeTakenInMs) {
    if (process.env.CONSOLE_LOG_TYPE === 'debug') {
        logger.debug("Runtime of " + modelName + " in MS:" + timeTakenInMs + " Query:" + queryString);
    } else {
        if (timeTakenInMs > 100) {
            // In future we can log this to a separate file or we can read runtime value from environment files
            logger.info("Runtime of " + modelName + " in MS:" + timeTakenInMs + " Query:" + queryString.substring(0, 100));
        }
    }
}

// Helper to handle circular references in log objects
function getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
}

module.exports = {
    logger,
    setCorrelationId // Export the middleware for use in your app
};
