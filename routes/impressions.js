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
    var limit = 100;
    var orderBy = 'created_on';
    var token = request.query.pageToken;
    
    model.list(kind, limit, orderBy, token, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        response.render('impressions/list.jade', {
            entities : entities,
            pageTitle: "iRadar - Impressions",
            pageId   : "impression-list",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

/*/ GET /impressions/add
router.get('/add', (request, response) => {
    response.render('impressions/form.jade', {
        entity    : {},
        pageTitle: "iRadar - New Impression",
        pageId   : "new-impression",
        token    : request.session.token,
        id       : Number(request.session.id),
        image    : request.session.image,
        name     : request.session.name,
        initials : request.session.initials,
        role     : request.session.role
    });
});

// POST /impressions/add
router.post('/add', (request, response, next) => {
    const data = request.body;
    
    // Save the data to the database.
    model.create(kind, data, (err, savedData) => {
        if (err) {
            next(err);
            return;
        }
        response.redirect(`${request.baseUrl}/${savedData.id}`);
    });
});*/

// GET /impressions/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id = request.params.id;
    
    model.read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        response.render('impressions/form.jade', {
            entity   : entity,
            entities : [],
            pageTitle: "iRadar - Impression",
            pageId   : "impression",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// POST /impressions/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data = request.body;
    var id = request.params.id;
    
    model.read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        
        for (var key in data) {
            if (key != 'id') {
                console.log(key + ': ' + entity[key] + ', ' + data[key]);
                entity[key] = data[key];
            }
        }
        
        model.update(kind, id, entity, (err, savedData) => {
            if (err) {
                next(err);
                return;
            }
            response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
        });
    });
});

// GET /impressions/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    response.redirect(`/impressions/${id}/edit`);
});

/*/ GET /impressions/:id/delete
router.get('/:id/delete', (request, response, next) => {
    var id = request.params.id;
    
    model.delete(kind, id, (err) => {
        if (err) {
            next(err);
            return;
        }
        response.redirect(request.baseUrl);
    });
});*/

// Errors on "/impressions/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
