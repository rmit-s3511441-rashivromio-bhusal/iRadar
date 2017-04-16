const jwt     = require('jsonwebtoken');
const config  = require('./config');
const express = require('express');
const router  = express.Router();

// Set Content-Type for all responses for these routes
router.use((request, response, next) => {
    response.set('Content-Type', 'application/json');
    next();
}); 

// Set Content-Type for all responses for these routes
router.use((request, response, next) => {
    console.log('/api');
    var token = request.get('Authorization');
    var apiKey = request.get('Api-Key');
    
    if (apiKey && apiKey == config.apiKey) {
        next();
        return;
    }
    
    if (!token) {
        response.status(400).json({
            "error": "Token must be provided with the 'Authorization' header."
        });
        return;
    }
    
    try {
        var decoded = jwt.verify(token, config.tokenSecret);
        console.log('token.name: ' + decoded.name);
        next();
    } catch(err) {
        console.log(err);
        response.status(401).json({
            "error": "Invalid token"
        });
    }
}); 


router.use('/beacon',     require('./api-methods')('Beacon', 'uniqueId'));
router.use('/special',    require('./api-methods')('Special', 'name'));
router.use('/store',      require('./api-methods')('Store', 'name'));
router.use('/user',       require('./api-methods')('User', 'first_name'));
router.use('/impression', require('./api-methods')('Impression', 'customer'));

// Errors on "/api/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;