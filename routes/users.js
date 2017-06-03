const kind       = 'User';
const bodyParser = require('body-parser');
const model      = require('./model');
const fs         = require('fs');
const sys        = require('./sys');
const bcrypt     = require('./bcrypt');

const format     = require('util').format;
const Multer     = require('multer');
const multer     = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    }
});

const Storage    = require('@google-cloud/storage');
const storage    = Storage();
const bucket     = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

const express    = require('express');
const router     = express.Router();

// Automatically parse request body as form data
router.use(bodyParser.urlencoded({ extended: false }));
//router.use(formidable());

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
    var store     = String(request.session.store);
    var role      = String(request.session.role);
    var isAdmin   = role == 'admin';
    var isManager = Boolean(isAdmin || role == 'manager');
    
    var userFilters = [];
    if (!isAdmin)
        userFilters.push(['store', store]); // Store Access Control
    model.query(kind, userFilters, function cb (err, users) {
        if (err) return;
        if (!users) users = [];
        
        var storeFilter = [];
        model.query('Store', storeFilter, function cb (err, stores) {
            if (err) return;
            if (!stores) stores = [];
            
            var storeList = {};
            for (var i = 0; i < stores.length; i++) {
                storeList[String(stores[i].id)] = String(stores[i].name);
            }
            
            // Set display values
            var i, user;
            for (i = 0; i < users.length; i++) {
                user = users[i];
                user.store_dv      = storeList[user.store];
                user.active_dv     = user.active ? 'Yes' : 'No';
                user.updated_on_dv = sys.getDisplayValue(user.updated_on);
            }
            
            var searchFields = [];
            searchFields.push({'name':'user_name', 'label':'Username'});
            searchFields.push({'name':'first_name','label':'First name'});
            searchFields.push({'name':'last_name', 'label':'Last name'});
            searchFields.push({'name':'email',     'label':'Email'});

            response.render('user-list.pug', {
                user: {
                    id      : String(request.session.id),
                    name    : String(request.session.name),
                    initials: String(request.session.initials),
                    image   : String(request.session.image),
                    role    : String(request.session.role),
                    store   : String(request.session.store),
                    token   : String(request.session.token)
                },
                pageTitle   : "iRadar - Users",
                pageId      : "users",
                users       : users,
                title       : 'Users',
                canCreate   : isManager,
                canDelete   : isAdmin,
                searchFields: searchFields,
                start       : 1,
                end         : Number(users.length),
                count       : Number(users.length)
            }); 
        });
    });
});

// GET /users/add
router.get('/add', (request, response) => {
    var id        = request.params.id;
    var store     = String(request.session.store);
    var role      = String(request.session.role);
    var isAdmin   = role == 'admin';
    var isManager = Boolean(isAdmin || role == 'manager');
    
    // Default values
    var user = {
        'active': true,
        'password_needs_reset': true,
        'password': 'Welcome1',
        'bad_passwords': 0
    };
    
    var userFilter = [];
    model.query('User', userFilter, function cb (err, users) {
        if (err) return;
        if (!users) users = [];

        var storeFilter = [];
        model.query('Store', storeFilter, function cb (err, stores) {
            if (err) return;
            if (!stores) stores = [];

            // Get options for Store field
            var storeOptions = [];
            for (var i = 0; i < stores.length; i++) {
                storeOptions.push({
                    'label': String(stores[i].name),
                    'value': String(stores[i].id)
                });
            }
            var userOptions = [];
            for (var i = 0; i < users.length; i++) {
                userOptions.push({
                    'label': users[i].first_name + ' ' + users[i].last_name,
                    'value': String(users[i].id)
                });
            }
            var roleOptions = [
                {'label':'Employee','value':'employee'},
                {'label':'Manager', 'value':'manager'},
                {'label':'Admin',   'value':'admin'}
            ];
            
            // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
            var col1 = [], col2 = [];
            col1.push(sys.getFieldObj(user, 'String', 'first_name', 'First name', false, true));
            col1.push(sys.getFieldObj(user, 'String', 'last_name', 'Last name', false, true));
            col1.push(sys.getFieldObj(user, 'String', 'user_name', 'Username', false, true));
            if (isManager)
                col1.push(sys.getFieldObj(user, 'Password', 'password', 'Password'));
            col1.push(sys.getFieldObj(user, 'String', 'email', 'Email', false, true));
            col1.push(sys.getFieldObj(user, 'Select', 'role', 'Role', !isManager, isManager, roleOptions));
            col1.push(sys.getFieldObj(user, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
            col1.push(sys.getFieldObj(user, 'URL', 'image', 'Avatar'));
            col2.push(sys.getFieldObj(user, 'Boolean', 'active', 'Active', !isManager));
            col2.push(sys.getFieldObj(user, 'Boolean', 'locked_out', 'Locked out', !isManager));
            col2.push(sys.getFieldObj(user, 'Boolean', 'password_needs_reset','Password needs reset',!isManager));

            response.render('user-form.pug', {
                user: {
                    id      : String(request.session.id),
                    name    : String(request.session.name),
                    initials: String(request.session.initials),
                    image   : String(request.session.image),
                    role    : String(request.session.role),
                    store   : String(request.session.store),
                    token   : String(request.session.token)
                },
                pageTitle   : 'iRadar - User',
                pageId      : 'user',
                kind        : 'User',
                isAdmin     : isAdmin,
                isManager   : isManager,
                entity      : user,
                col1        : col1,
                col2        : col2,
                isNew       : true
            });
        });
    });
});


// POST /users/add
router.post('/add', (request, response, next) => {
    var data = request.body;
    var userId = String(request.session.id);
    
    data.active = Boolean(data.active);
    data.locked_out = Boolean(data.locked_out);
    data.password_needs_reset = Boolean(data.password_needs_reset);
    
    if (data.password) {
        console.log('password: ' + data.password);
        bcrypt.cryptPassword(String(data.password), function(err, hash) {
            if (err) {
                console.log('cryptPassword error: ' + err);
                return;
            }
            console.log('hash: ' + hash);
            data.password = hash;
            model.create(kind, data, userId, (err, savedData) => {
                if (err) return;
                response.redirect(`${request.baseUrl}/${savedData.id}`);
            });
        });
    } else {
        // Save the data to the database.
        model.create(kind, data, userId, (err, savedData) => {
            if (err) return;
            response.redirect(request.baseUrl); // `${request.baseUrl}/${savedData.id}`
        });
    }
});

// POST /users/bulk-update
router.post('/bulk-update', (request, response, next) => {
    var data = request.body;
    var userId = String(request.session.id);
    
    console.log('Action: ' + data.bulkAction);
    console.log('list: ' + data.bulkList);
    response.redirect('/'); // users list
});

// GET /users/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id        = request.params.id;
    var store     = String(request.session.store);
    var role      = String(request.session.role);
    var isAdmin   = role == 'admin';
    var isManager = isAdmin || role == 'manager';
    
    model.read(kind, id, (err, user) => {
        if (err) return;
        
        var userFilter = [];
        model.query('User', userFilter, function cb (err, users) {
            if (err) return;
            if (!users) users = [];
            
            var storeFilter = [];
            model.query('Store', storeFilter, function cb (err, stores) {
                if (err) return;
                if (!stores) stores = [];

                // Get options for Store field
                var storeOptions = [];
                for (var i = 0; i < stores.length; i++) {
                    storeOptions.push({
                        'label': String(stores[i].name),
                        'value': String(stores[i].id)
                    });
                }
                var userOptions = [];
                for (var i = 0; i < users.length; i++) {
                    userOptions.push({
                        'label': users[i].first_name + ' ' + users[i].last_name,
                        'value': String(users[i].id)
                    });
                }
                var roleOptions = [
                    {'label':'Employee','value':'employee'},
                    {'label':'Manager', 'value':'manager'},
                    {'label':'Admin',   'value':'admin'}
                ];
                
                delete user.password; // Do not show
                
                // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
                var col1 = [], col2 = [];
                col1.push(sys.getFieldObj(user, 'String', 'first_name', 'First name', false, true));
                col1.push(sys.getFieldObj(user, 'String', 'last_name', 'Last name', false, true));
                col1.push(sys.getFieldObj(user, 'String', 'user_name', 'Username', false, true));
                if (isManager)
                    col1.push(sys.getFieldObj(user, 'Password', 'password', 'Password'));
                col1.push(sys.getFieldObj(user, 'String', 'email', 'Email', false, true));
                col1.push(sys.getFieldObj(user, 'Select', 'role', 'Role', !isManager, isManager, roleOptions));
                col1.push(sys.getFieldObj(user, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
                col1.push(sys.getFieldObj(user, 'URL', 'image', 'Avatar'));
                col2.push(sys.getFieldObj(user, 'String', 'id', 'ID', true));
                col2.push(sys.getFieldObj(user, 'ForeignKey', 'created_by', 'Created by', true, false, userOptions, 'User'));
                col2.push(sys.getFieldObj(user, 'DateTime', 'created_on', 'Created on', true));
                col2.push(sys.getFieldObj(user, 'ForeignKey', 'updated_by', 'Updated by', true, false, userOptions, 'User'));
                col2.push(sys.getFieldObj(user, 'DateTime', 'updated_on', 'Updated on', true));
                col2.push(sys.getFieldObj(user, 'Boolean', 'active', 'Active', !isManager));
                col2.push(sys.getFieldObj(user, 'Boolean', 'locked_out', 'Locked out', !isManager));
                col2.push(sys.getFieldObj(user, 'Boolean', 'password_needs_reset','Password needs reset',!isManager));
                
                response.render('user-form.pug', {
                    user: {
                        id      : String(request.session.id),
                        name    : String(request.session.name),
                        initials: String(request.session.initials),
                        image   : String(request.session.image),
                        role    : String(request.session.role),
                        store   : String(request.session.store),
                        token   : String(request.session.token)
                    },
                    pageTitle   : 'iRadar - User',
                    pageId      : 'user',
                    kind        : 'User',
                    isAdmin     : isAdmin,
                    isManager   : isManager,
                    entity      : user,
                    col1        : col1,
                    col2        : col2
                });
            });
        });
    });
});

// POST /users/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data   = request.body;
    var id     = String(request.params.id);
    var userId = String(request.session.id);
    
    data.active = Boolean(data.active);
    data.locked_out = Boolean(data.locked_out);
    data.password_needs_reset = Boolean(data.password_needs_reset);
    
    if (data.password) {
        console.log('password: ' + data.password);
        bcrypt.cryptPassword(String(data.password), function(err, hash) {
            if (err) {
                console.log('cryptPassword error: ' + err);
                return;
            }
            console.log('hash: ' + hash);
            data.password = hash;
            model.update(kind, id, data, userId, (err, savedData) => {
                if (err) return;
                response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
            });
        });
    } else {
        model.update(kind, id, data, userId, (err, savedData) => {
            if (err) return;
            response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
        });
    }
});



// Process the file upload and upload to Google Cloud Storage.
router.post('/:id/upload', multer.single('file'), (request, response, next) => {
    var id = request.params.id;
    
    try {
        console.log('bucket: ' + bucket);
        console.log('JSON.stringify(bucket): ' + JSON.stringify(bucket));
    } catch (err) {
        console.log(err);
    }
    
    
    console.log('/upload');
    if (!request.file) {
        console.log('no file');
        response.status(400).send('No file uploaded.');
        return;
    }
    console.log('file!!');
    
    // Create a new blob in the bucket and upload the file data
    const blob = bucket.file(request.file.originalname);
    
    try {
        console.log('blob: ' + blob);
        console.log('JSON.stringify(blob): ' + JSON.stringify(blob));
    } catch (err) {
        console.log(err);
    }
    
    
    const blobStream = blob.createWriteStream();
    
    blobStream.on('error', (err) => {
        next(err);
        return;
    });
    
    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        console.log('publicUrl: ' + publicUrl);
        
        var data = {
            "image": publicUrl
        };
        
        model.update(kind, id, data, userId, (err, savedData) => {
            if (err) {
                next(err);
                return;
            }
            response.redirect(`${request.baseUrl}/${id}/edit`);
        });
        
        //response.status(200).send(publicUrl);
    });
    
    blobStream.end(request.file.buffer);
});



// GET /users/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    response.redirect(`/users/${id}/edit`);
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
