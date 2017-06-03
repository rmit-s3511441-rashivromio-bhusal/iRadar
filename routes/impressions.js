const express    = require('express');
const router     = express.Router();
const kind       = 'Impression';
const bodyParser = require('body-parser');
const model      = require('./model');

// Automatically parse request body as form data
router.use(bodyParser.urlencoded({ extended: false }));

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

// GET /impressions
router.get('/', (request, response, next) => {
    
    var impressionFilter = [];
    if (request.session.role != 'admin')
        impressionFilter.push(['store', String(request.session.store)]); // Store Access Control
    model.query(kind, impressionFilter, function cb (err, impressions) {
        if (err) return;
        if (!impressions) impressions = [];
        
        var searchFields = [];
        searchFields.push({'name':'beacon',  'label':'Beacon'});
        searchFields.push({'name':'special', 'label':'Special'});
        searchFields.push({'name':'customer','label':'Customer'});
        
        response.render('impression-list.pug', {
            pageTitle   : "iRadar - Impressions",
            pageId      : "impressions",
            user: {
                id      : String(request.session.id),
                name    : String(request.session.name),
                initials: String(request.session.initials),
                image   : String(request.session.image),
                role    : String(request.session.role),
                store   : String(request.session.store),
                token   : String(request.session.token)
            },
            entities    : impressions,
            title       : 'Impressions',
            canCreate   : false,
            searchFields: searchFields,
            start       : 1,
            end         : Number(impressions.length),
            count       : Number(impressions.length)
        });
    });
});

// GET /impressions/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    response.redirect(`/impressions/${id}/edit`);
});

// GET /impressions/:id/delete
router.get('/:id/delete', (request, response, next) => {
    var id = request.params.id;
    
    model.delete(kind, id, (err) => {
        if (err) {
            next(err);
            return;
        }
        response.redirect(request.baseUrl);
    });
});

// Errors on "/impressions/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
