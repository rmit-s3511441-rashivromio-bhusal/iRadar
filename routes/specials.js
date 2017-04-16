const express = require('express');
const router = express.Router();
const kind = 'Special';
const bodyParser = require('body-parser');

function getModel () {
    return require('./model');
}

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

// GET /specials
router.get('/', (request, response, next) => {
    var limit = 10;
    var orderBy = 'name';
    var token = request.query.pageToken;
    
    getModel().list(kind, limit, orderBy, token, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        response.render('specials/list.jade', {
            entities : entities,
            pageTitle: "iRadar - Specials",
            pageId   : "special-list",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// GET /specials/add
router.get('/add', (request, response) => {
    response.render('specials/form.jade', {
        entity   : {},
        pageTitle: "iRadar - New Special",
        pageId   : "special",
        token    : request.session.token,
        id       : Number(request.session.id),
        image    : request.session.image,
        name     : request.session.name,
        initials : request.session.initials,
        role     : request.session.role
    });
});


// POST /specials/add
router.post('/add', (request, response, next) => {
    const data = request.body;
    
    // Save the data to the database.
    getModel().create(kind, data, (err, savedData) => {
        if (err) {
            next(err);
            return;
        }
        response.redirect(`${request.baseUrl}/${savedData.id}`);
    });
});

// GET /specials/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id = request.params.id;
    
    getModel().read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        response.render('specials/form.jade', {
            entity   : entity,
            pageTitle: "iRadar - Special",
            pageId   : "special",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// POST /specials/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data = request.body;
    var id = request.params.id;
    
    getModel().read(kind, id, (err, entity) => {
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
        
        getModel().update(kind, id, entity, (err, savedData) => {
            if (err) {
                next(err);
                return;
            }
            response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
        });
    });
});

// GET /specials/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    
    response.redirect(`/specials/${id}/edit`);
    /*
    getModel().read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        response.render('specials/form.jade', {
            special: entity
        });
    });
    */
});

// GET /specials/:id/delete
router.get('/:id/delete', (request, response, next) => {
    var id = request.params.id;
    
    getModel().delete(kind, id, (err) => {
        if (err) {
            next(err);
            return;
        }
        response.redirect(request.baseUrl);
    });
});

// Errors on "/specials/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
