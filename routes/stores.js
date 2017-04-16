const express = require('express');
const router = express.Router();
const kind = 'Store';
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

// GET /stores
router.get('/', (request, response, next) => {
    var limit = 10;
    var orderBy = 'name';
    var token = request.query.pageToken;
    
    getModel().list(kind, limit, orderBy, token, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        response.render('stores/list.jade', {
            entities : entities,
            pageTitle: "iRadar - Stores",
            pageId   : "store-list",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// GET /stores/add
router.get('/add', (request, response) => {
    response.render('stores/form.jade', {
        entity    : {},
        pageTitle: "iRadar - New Store",
        pageId   : "new-store",
        token    : request.session.token,
        id       : Number(request.session.id),
        image    : request.session.image,
        name     : request.session.name,
        initials : request.session.initials,
        role     : request.session.role
    });
});


// POST /stores/add
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

// GET /stores/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id = request.params.id;
    
    getModel().read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        response.render('stores/form.jade', {
            entity   : entity,
            entities : [],
            pageTitle: "iRadar - Store",
            pageId   : "store",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// POST /stores/:id/edit
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

// GET /stores/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    
    response.redirect(`/stores/${id}/edit`);
    /*
    getModel().read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        response.render('stores/form.jade', {
            store: entity
        });
    });
    */
});

// GET /stores/:id/delete
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

// Errors on "/stores/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
