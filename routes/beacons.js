const kind       = 'Beacon';
const bodyParser = require('body-parser');
const config     = require('./config');
const express    = require('express');
const router     = express.Router();
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

// GET /beacons
router.get('/', (request, response, next) => {
    var limit = 100;
    var orderBy = 'unique_id';
    var token = request.query.pageToken;
    
    model.list(kind, limit, orderBy, token, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        
        console.log('entities: ' + entities);
        
        response.render('beacons/list.jade', {
            entities : entities,
            pageTitle: "iRadar - Beacons",
            pageId   : "beacon-list",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// GET /beacons/add
router.get('/add', (request, response) => {
    response.render('beacons/form.jade', {
        entity   : {},
        action   : 'Add',
        pageTitle: "iRadar - Add Beacons",
        pageId   : "home",
        token    : request.session.token,
        id       : Number(request.session.id),
        image    : request.session.image,
        name     : request.session.name,
        initials : request.session.initials,
        role     : request.session.role
    });
});

// POST /beacons/add
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
});

// GET /beacons/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id = request.params.id;
    
    model.read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        
        var filters = [['beacon', String(entity.unique_id)]];
        model.query('Special', filters, function cb (err, entities) {
            if (err) {
                return;
            }
            console.log('entities: ' + entities);
            if (!entities) {
                entities = [];
            }
            
            response.render('beacons/form.jade', {
                entity   : entity,
                entities : entities,
                pageTitle: "iRadar - Beacon",
                pageId   : "beacon",
                token    : request.session.token,
                id       : Number(request.session.id),
                image    : request.session.image,
                name     : request.session.name,
                initials : request.session.initials,
                role     : request.session.role
            });
        });
    });
});

// POST /beacons/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data = request.body;
    var id = request.params.id;
    
    model.update(kind, id, data, (err, savedData) => {
        if (err) {
            next(err);
            return;
        }
        response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
    });
});

// GET /beacons/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    
    response.redirect(`/beacons/${id}/edit`);
});

// GET /beacons/:id/delete
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

// Errors on "/beacons/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
