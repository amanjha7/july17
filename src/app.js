// Load environment variables from .env file
require('dotenv').config({
    path: process.env.NODE_ENV ? `${process.env.NODE_ENV}.env` : '.env'
});

const cors = require('cors');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { router: appRouter } = require('./routes/approutes');
const { router: oauthRouter } = require('./routes/oauthroutes');
const { router: webtrackerRouter } = require('./routes/webtrackerroutes');
const mongoose = require('mongoose');
const app = express();
const {setCorrelationId} = require('./config/logger')
const { BaseService } =require("../services/base/baseservice");
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        return callback(null, origin);
    },
    credentials: true
}));
app.set('trust proxy', true);

// Use setCorrelationId middleware ( for logging statement relation)
app.use(setCorrelationId); // Set correlation ID for every request

// Session management
app.use(session({
    secret: 'ZFMV+ZDgi+D&mBI',  // Use a strong secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'none',   // Allow cross-origin cookies
      secure: true,       // Set to true for HTTPS
      httpOnly: true,     // Protect cookies from JavaScript access
      maxAge: 8600000     // Cookie expiration time
    }
  }));
  
  // Middleware to parse JSON bodies
app.use(express.json({ limit: '100mb' }));

// Use the webhook router
app.use('/app', appRouter);
app.use('/app/oauth', oauthRouter);
app.use('/app/webtracker', webtrackerRouter);

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

// Start BullMQ background services
BaseService.startServices(['PronnelOauthService', 'WebtrackerJobsService']).then(() => {
    console.log('Background job services started successfully.');
}).catch(err => {
    console.error('Failed to start background job services:', err);
});

let port = (Number(process.env.PORT)|| 22001) + (Number(process.env.SERVER_NUMBER) || 0)
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

