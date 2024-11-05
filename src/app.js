// Load environment variables from .env file
require('dotenv').config();
const cors = require('cors');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { router: appRouter } = require('./routes/approutes');
const { router: oauthRouter } = require('./routes/oauthroutes');
const mongoose = require('mongoose');
const app = express();
const {setCorrelationId} = require('./config/logger')
app.use(cors())

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
app.use(bodyParser.json());


// Use the webhook router
app.use('/app', appRouter);
app.use('/app/oauth', oauthRouter);

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

let port = (Number(process.env.PORT)|| 22001) + (Number(process.env.SERVER_NUMBER) || 0)
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
