const kind       = 'User';
const config     = require('./config');
const model      = require('./model');
const sys        = require('./sys');
const bcrypt     = require('./bcrypt');
const fs         = require('fs');
const bodyParser = require('body-parser');

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
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var isManager = Boolean(isAdmin || userRole == 'manager');
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    
    // URL query parameters
    var rows  = request.query.rows  ? Number(request.query.rows)  : 20;
    var start = request.query.start ? Number(request.query.start) : 1;
    var order = request.query.order ? String(request.query.order) : 'user_name';
    var query = request.query.query ? String(request.query.query) : null;
    
    model.query3(kind, storeAC, function cb (err, userList) {
        if (err) sys.addError(request, err);
        if (!userList) userList = [];
        
        // Reference data only
        model.query3('Store', null, function cb (err, storeList) {
            if (err) sys.addError(request, err);
            if (!storeList) storeList = [];
            
            var store, storeNames = {}, storeOptions = [];
            for (var i = 0; i < storeList.length; i++) {
                store = storeList[i];
                storeNames[String(store.id)] = String(store.name);
                storeOptions.push({
                    'label': String(store.name),
                    'value': String(store.id)
                });
            }
                
            // Get display values
            var i, user;
            for (i = 0; i < userList.length; i++) {
                user = userList[i];
                user.store_dv      = storeNames[user.store];
                user.active_dv     = user.active ? 'Yes' : 'No';
                user.updated_on_dv = sys.getDisplayValue(user.updated_on);
            }
            
            var activeOptions = [
                {'label':'Yes','value':'true'},
                {'label':'No', 'value':'false'}
            ];

            var headers = [
                {'name':'user_name', 'label':'Username'},
                {'name':'first_name', 'label':'First name'},
                {'name':'last_name', 'label':'Last name'},
                {'name':'email', 'label':'Email'},
                {'name':'image', 'label':'Avatar'},
                {'name':'store', 'label':'Store'},
                {'name':'active', 'label':'Active'},
                {'name':'updated_on', 'label':'Updated on'}
            ];
            
            var searchFields = [];
            searchFields.push({'name':'user_name', 'label':'Username'});
            searchFields.push({'name':'first_name','label':'First name'});
            searchFields.push({'name':'last_name', 'label':'Last name'});
            searchFields.push({'name':'email',     'label':'Email'});

            var bulkFields = [];
            if (isAdmin)
                bulkFields.push(sys.getFieldObj({}, 'ForeignKey', 'store', 'Store', false, false, storeOptions, 'Store'));
            if (isManager)
                bulkFields.push(sys.getFieldObj({}, 'Select', 'active', 'Active', false, false, activeOptions));
            
            // Datastore has very limited query functionality - so we'll filter via our own script here
            var urlQueries = [], crumbs = [];

            // URL for filter breadcrumbs
            var url = '/users';
            if (rows != 20)
                urlQueries.push('rows=' + rows);
            if (start != 1)
                urlQueries.push('start=' + start);
            if (order)
                urlQueries.push('order=' + order);

            crumbs.push({
                'label': 'All',
                'url'  : String(url)
            });

            if (query)
                urlQueries.push('query=');

            if (urlQueries.length > 0)
                url += '?' + urlQueries.join('&');
            var filters = query ? query.split('^') : [];
            var filter, field, operator, searchValue;

            for (i = 0; i < filters.length; i++) {
                filter = String(filters[i]);

                // Breadcrumbs
                if (i != 0)
                    url += '^';
                url += filter;
                crumbs.push({
                    'label': String(filter),
                    'url'  : String(url)
                });

                // Filters
                field       = String(filter.match(/^[a-z_]+/i)[0]);
                operator    = String(filter.match(/(>=|<=|>|<|!\*|=\*|!=|=)/)[0]); // Operators: = != > >= < <= !* =*
                searchValue = String(filter.match(/[^\=\!\>\<\*]+$/)[0]) || '';

                if (searchValue === 'true')
                    searchValue = true;
                if (searchValue === 'false')
                    searchValue = false;

                // look through userList and push any matching Specials into filteredList
                var j, b, entityValue, filteredList = [];
                for (j = 0; j < userList.length; j++) {
                    if (!userList[j] || userList[j][field] === undefined) {
                        continue;
                    }
                    entityValue = String(userList[j][field]);
                    if (entityValue === 'true')
                        entityValue = true;
                    if (entityValue === 'false')
                        entityValue = false;

                    if (operator == '>=') {
                        if (entityValue >= searchValue) {
                            filteredList.push(userList[j]);
                        }
                    } else if (operator == '<=') {
                        if (entityValue <= searchValue) {
                            filteredList.push(userList[j]);
                        }
                    } else if (operator == '>') {
                        if (entityValue > searchValue) {
                            filteredList.push(userList[j]);
                        }
                    } else if (operator == '<') {
                        if (entityValue < searchValue) {
                            filteredList.push(userList[j]);
                        }
                    } else if (operator == '!*') {
                        if (entityValue.indexOf(searchValue) == -1) {
                            filteredList.push(userList[j]);
                        }
                    } else if (operator == '=*') {
                        if (entityValue.indexOf(searchValue) != -1) {
                            filteredList.push(userList[j]);
                        }
                    } else if (operator == '!=') {
                        if (entityValue !== searchValue) {
                            filteredList.push(userList[j]);
                        }
                    } else if (operator == '=') {
                        if (entityValue === searchValue) {
                            filteredList.push(userList[j]);
                        }
                    }
                }
                userList = filteredList;
            }

            // Sort
            if (order && userList.length > 1) {
                var orderBy = String(order);
                var isAsc = true;
                if (order.match(/DESC$/) != null) {
                    orderBy = orderBy.replace(/DESC$/, '');
                    isAsc = false;
                }
                if (isAsc) {
                    userList.sort(function(a, b) {
                        if (a[orderBy] < b[orderBy]) return -1;
                        if (a[orderBy] > b[orderBy]) return 1;
                        return 0;
                    });
                } else {
                    userList.sort(function(a, b) {
                        if (a[orderBy] > b[orderBy]) return -1;
                        if (a[orderBy] < b[orderBy]) return 1;
                        return 0;
                    });
                }
            }

            // Pagination
            // from, to & count = display numbers
            // start = start index (parameter)
            // end = end index
            var count = Number(userList.length);
            var startIndex = start - 1;
            var endIndex = startIndex + rows - 1;
            var maxIndex = count - 1;
            if (count == 0)
                endIndex = 0;
            else if (endIndex > maxIndex)
                endIndex = maxIndex;

            var list  = [];
            for (var i = startIndex; i <= endIndex && i < userList.length; i++) {
                list.push(userList[i]);
            }
            userList = list;

            var from = (count == 0) ? 0 : start;
            var to   = (count == 0) ? 0 : endIndex + 1;

            // Pages object
            var pages = [];
            var num = 1;
            for (var s = 1; s <= count; s += rows) {
                pages.push({
                    'num'   : Number(num),
                    'start' : Number(s),
                    'active': s == start
                });
                num++;
            }

            var messages = sys.getMessages(request);

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
                kind        : kind,
                users       : userList,
                title       : 'Users',
                canCreate   : isManager,
                canDelete   : isAdmin,
                searchFields: searchFields,
                bulkFields  : bulkFields,
                pages       : pages,
                from        : from,
                to          : to,
                count       : count,
                crumbs      : crumbs,
                headers     : headers,
                rows        : rows,
                order       : order,
                messages    : messages
            }); 
        });
    });
});

// GET /users/add
router.get('/add', (request, response) => {
    var id        = request.params.id;
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var isManager = Boolean(isAdmin || userRole == 'manager');
    
    // Default values
    var user = {
        'active': true,
        'password_needs_reset': true,
        'password': 'Welcome1',
        'bad_passwords': 0,
        'store': userStore,
        'role': 'employee'
    };
    
    // Reference data only
    model.query3('User', null, function cb (err, userList) {
        if (err) sys.addError(request, err);
        if (!userList) userList = [];

        // Reference data only
        model.query3('Store', null, function cb (err, storeList) {
            if (err) sys.addError(request, err);
            if (!storeList) storeList = [];

            // Get options for Store field
            var store, storeOptions = [];
            for (var i = 0; i < storeList.length; i++) {
                store = storeList[i];
                storeOptions.push({
                    'label': String(store.name),
                    'value': String(store.id)
                });
            }
            
            var u, userOptions = [];
            for (var i = 0; i < userList.length; i++) {
                u = userList[i];
                userOptions.push({
                    'label': u.first_name + ' ' + u.last_name,
                    'value': String(u.id)
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
            col1.push(sys.getFieldObj(user, 'Select', 'role', 'Role', !isAdmin, isAdmin, roleOptions));
            col1.push(sys.getFieldObj(user, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
            col1.push(sys.getFieldObj(user, 'URL', 'image', 'Avatar'));
            col2.push(sys.getFieldObj(user, 'Boolean', 'active', 'Active'));
            col2.push(sys.getFieldObj(user, 'Boolean', 'locked_out', 'Locked out'));
            col2.push(sys.getFieldObj(user, 'Boolean', 'password_needs_reset','Password needs reset'));

            var messages = sys.getMessages(request);
            
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
                isNew       : true,
                canEdit     : isManager,
                messages    : messages
            });
        });
    });
});


// POST /users/add
router.post('/add', (request, response, next) => {
    var data      = request.body;
    var userId    = String(request.session.id);
    var userStore = String(request.session.store);
    
    data.active               = Boolean(data.active);
    data.locked_out           = Boolean(data.locked_out);
    data.password_needs_reset = Boolean(data.password_needs_reset);
    
    if (!data.store)
        data.store = userStore;
    
    if (data.password) {
        console.log('password: ' + data.password);
        bcrypt.cryptPassword(String(data.password), function(err, hash) {
            if (err) sys.addError(request, err);
            
            console.log('hash: ' + hash);
            data.password = String(hash);
            model.create(kind, data, userId, (err, savedData) => {
                if (err) sys.addError(request, err);
                else sys.addMessage(request, 'User created');
                
                response.redirect(request.baseUrl);
            });
        });
    } else {
        // Save the data to the database.
        model.create(kind, data, userId, (err, savedData) => {
            if (err) sys.addError(request, err);
            else sys.addMessage(request, 'User created');
            
            response.redirect(request.baseUrl); // `${request.baseUrl}/${savedData.id}`
        });
    }
});

// GET /users/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id        = request.params.id;
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var userId    = String(request.session.id);
    var isAdmin   = userRole == 'admin';
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    
    model.read(kind, id, (err, user) => {
        if (err) sys.addError(request, err);
        
        // Reference data only
        model.query3('User', null, function cb (err, userList) {
            if (err) sys.addError(request, err);
            if (!userList) userList = [];
            
            // Reference data only
            model.query3('Store', null, function cb (err, storeList) {
                if (err) sys.addError(request, err);
                if (!storeList) storeList = [];
                
                // Get options for Store field
                var store, storeOptions = [];
                for (var i = 0; i < storeList.length; i++) {
                    store = storeList[i];
                    storeOptions.push({
                        'label': String(store.name),
                        'value': String(store.id)
                    });
                }
                
                var u, userOptions = [];
                for (var i = 0; i < userList.length; i++) {
                    u = userList[i];
                    userOptions.push({
                        'label': u.first_name + ' ' + u.last_name,
                        'value': String(u.id)
                    });
                }
                
                var roleOptions = [
                    {'label':'Employee','value':'employee'},
                    {'label':'Manager', 'value':'manager'},
                    {'label':'Admin',   'value':'admin'}
                ];
                
                delete user.password; // Do not show
                
                var isManager = Boolean(isAdmin || (userRole == 'manager' && user.store == userStore));
                var isMe      = Boolean(user.id == userId);
                var canEdit   = Boolean(isManager || isMe);
                var canEditOther = isManager && !isMe;
                
                // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
                var col1 = [], col2 = [];
                col1.push(sys.getFieldObj(user, 'String', 'first_name', 'First name', !canEdit, canEdit));
                col1.push(sys.getFieldObj(user, 'String', 'last_name', 'Last name', !canEdit, canEdit));
                col1.push(sys.getFieldObj(user, 'String', 'user_name', 'Username', !canEditOther, canEditOther));
                if (canEdit)
                    col1.push(sys.getFieldObj(user, 'Password', 'password', 'Password'));
                col1.push(sys.getFieldObj(user, 'Email', 'email', 'Email', false, true));
                col1.push(sys.getFieldObj(user, 'Select', 'role', 'Role', !isAdmin, isAdmin, roleOptions));
                col1.push(sys.getFieldObj(user, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
                col1.push(sys.getFieldObj(user, 'URL', 'image', 'Avatar', !canEdit));
                col2.push(sys.getFieldObj(user, 'String', 'id', 'ID', true));
                col2.push(sys.getFieldObj(user, 'ForeignKey', 'created_by', 'Created by', true, false, userOptions, 'User'));
                col2.push(sys.getFieldObj(user, 'DateTime', 'created_on', 'Created on', true));
                col2.push(sys.getFieldObj(user, 'ForeignKey', 'updated_by', 'Updated by', true, false, userOptions, 'User'));
                col2.push(sys.getFieldObj(user, 'DateTime', 'updated_on', 'Updated on', true));
                col2.push(sys.getFieldObj(user, 'Boolean', 'active', 'Active', !canEditOther));
                col2.push(sys.getFieldObj(user, 'Boolean', 'locked_out', 'Locked out', !isManager));
                col2.push(sys.getFieldObj(user, 'Boolean', 'password_needs_reset','Password needs reset', !isManager));
                
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
                    canEdit     : canEdit,
                    canDelete   : Boolean(isAdmin && !isMe)
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
            if (err) sys.addError(request, err);
            
            console.log('hash: ' + hash);
            data.password = String(hash);
            
            model.update(kind, id, data, userId, (err, savedData) => {
                if (err) sys.addError(request, err);
                else sys.addMessage(request, 'User updated');
                
                response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
            });
        });
    } else {
        model.update(kind, id, data, userId, (err, savedData) => {
            if (err) sys.addError(request, err);
            else sys.addMessage(request, 'User updated');
            
            response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
        });
    }
});


// POST /users/bulk-update
router.post('/bulk-update', (request, response, next) => {
    console.log('/specials/bulk-update');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list = data.bulkList ? String(data.bulkList).split(',') : [];
    var len  = list.length;
    
    var newData = {};
    if (data.store)
        newData.store = String(data.store);
    if (data.active)
        newData.active = data.active == 'true';
    
    for (var i = 0; i < len; i++) {
        model.update(kind, list[i], newData, userId, function cb(err, savedData) {
            if (err) sys.addError(request, err);
            
            if (i == len-1) {
                sys.addMessage(request, len + ' User' + (len==1?'':'s') + ' updated');
                response.redirect('/specials'); // beacons list
            }
        });
    }
    sys.addMessage(request, len + ' User' + (len==1?'':'s') + ' updated');
    response.redirect('/users');
});

// POST /users/bulk-delete
router.post('/bulk-delete', (request, response, next) => {
    console.log('/users/bulk-delete');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list   = data.bulkList2 ? String(data.bulkList2).split(',') : [];
    var len    = list.length;
    
    for (var i = 0; i < len; i++) {
        model.delete(kind, list[i], userId, function cb(err) {
            if (err) sys.addError(request, err);
            
            if (i == len-1) {
                sys.addMessage(request, len + ' User' + (len==1?'':'s') + ' deleted');
                response.redirect('/users'); // beacons list
            }
        });
    }
    sys.addMessage(request, len + ' User' + (len==1?'':'s') + ' deleted');
    response.redirect('/users');
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
    var userId = String(request.session.id);
    
    model.delete(kind, id, userId, (err) => {
        if (err) sys.addError(request, err);
        else sys.addMessage(request, 'User deleted');
        
        response.redirect(request.baseUrl);
    });
});

// Errors on "/users/*" routes.
router.use((err, request, response, next) => {
    sys.addError(request, err.message);
    var messages = sys.getMessages(request);
    response.status(500).render('500.pug', {
        user : {
            id      : String(request.session.id),
            name    : String(request.session.name),
            initials: String(request.session.initials),
            image   : String(request.session.image),
            role    : String(request.session.role),
            store   : String(request.session.store),
            token   : String(request.session.token)
        },
        pageTitle   : "iRadar - 500",
        pageId      : "500",
        messages    : messages
    });
});

module.exports = router;
