const config     = require('./config');
const express    = require('express');
const router     = express.Router();

// Check for valid session
router.use((request, response, next) => {
    if (request.session && request.session.id)
        next();
    else
        response.redirect('/login');
});

// Set Content-Type for all responses for these routes
router.use((request, response, next) => {
    response.set('Content-Type', 'text/html');
    next();
});

router.use('/impressions', require('./impressions'));

// GET /reports
router.get('/', (request, response) => {
    response.render('reports.jade', {
        pageTitle: "iRadar - Reports",
        pageId   : "reports",
        token    : request.session.token,
        id       : Number(request.session.id),
        image    : request.session.image,
        name     : request.session.name,
        initials : request.session.initials,
        role     : request.session.role
    });
});

// Errors on "/reports/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
