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

// GET /reports
router.get('/', (request, response) => {
    response.render('reports.pug', {
        pageTitle: "iRadar - Reports",
        pageId   : "reports",
        user     : {
            id       : String(request.session.id),
            name     : String(request.session.name),
            initials : String(request.session.initials),
            image    : String(request.session.image),
            role     : String(request.session.role),
            store    : String(request.session.store),
            token    : String(request.session.token)
        }
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
