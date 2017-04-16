const kind       = 'User';
const bodyParser = require('body-parser');
const model      = require('./model');
const fs         = require('fs');
const sys        = require('./sys');
const express    = require('express');
const router     = express.Router();

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

// GET /users
router.get('/', (request, response, next) => {
    var limit = 10;
    var orderBy = 'first_name';
    var token = request.query.pageToken;
    
    model.list(kind, limit, orderBy, token, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        
        /*/ truncate Avatar URL
        for (var i = 0; i < entities.length; i++) {
            if (entities[i].image && entities[i].image.length && entities[i].image.length > 40) {
                entities[i].image = entities[i].image.substring(0, 40) + '...';
            }
        }*/
        
        response.render('users/list.jade', {
            entities    : entities,
            pageTitle: "iRadar - Users",
            pageId   : "user-list",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// GET /users/add
router.get('/add', (request, response) => {
    response.render('users/form.jade', {
        entity     : {},
        action   : 'Add',
        pageTitle: "iRadar - Add User",
        pageId   : "user",
        token    : request.session.token,
        id       : Number(request.session.id),
        image    : request.session.image,
        name     : request.session.name,
        initials : request.session.initials,
        role     : request.session.role
    });
});


// POST /users/add
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

// GET /users/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id = request.params.id;
    
    model.read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        
        try {
            if (entity.last_login) {
                var formattedDate = sys.getDateTime(entity.last_login);
                console.log('formattedDate: ' + formattedDate);
            } else {
                console.log('No last_login'); 
            }
        } catch (ex) {
            console.log(ex);
        }
        
        response.render('users/form.jade', {
            entity     : entity,
            action   : 'Edit',
            pageTitle: "iRadar - Add User",
            pageId   : "user",
            token    : request.session.token,
            id       : Number(request.session.id),
            image    : request.session.image,
            name     : request.session.name,
            initials : request.session.initials,
            role     : request.session.role
        });
    });
});

// POST /users/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data = request.body;
    var id = request.params.id;
    console.log('request.files: ' + request.files);
    if (request.files && request.files.avatar) {
        console.log('request.files.avatar' + request.files.avatar);
        fs.readFile(request.files.avatar.path, function (err, fileData) {
            if (err) {
                console.log(err);
            } else {
                console.log('fileData: ' + fileData);
                data.avatar_data = fileData;
            }
            model.update(kind, id, data, (err, savedData) => {
                if (err) {
                    next(err);
                    return;
                }
                response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
            });
        });  
    } else {
        model.update(kind, id, data, (err, savedData) => {
            if (err) {
                next(err);
                return;
            }
            response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
        });
    }
});

// GET /users/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    
    response.redirect(`/users/${id}/edit`);
    /*
    model.read(kind, id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        response.render('users/form.jade', {
            user: entity
        });
    });
    */
});

// GET /users/:id/delete
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

// Errors on "/users/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
