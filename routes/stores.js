const express    = require('express');
const router     = express.Router();
const kind       = 'Store';
const bodyParser = require('body-parser');
const config     = require('./config');
const model      = require('./model');
const sys        = require('./sys');

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
    
    var storeFilters = [];
    model.query('Store', storeFilters, function cb (err, stores) {
        if (err) return;
        if (!stores) stores = [];
        
        var i, store;
        for (i = 0; i < stores.length; i++) {
            store = stores[i];
            store.description_dv = String(store.description).replace(/\n.*/g, ''); // Get the first line only
            store.active_dv      = store.active ? 'Yes' : 'No';
            store.updated_on_dv  = sys.getDisplayValue(store.updated_on);
        }
        
        var searchFields = [];
        searchFields.push({'name':'name',       'label':'Name'});
        searchFields.push({'name':'description','label':'Description'});
        
        response.render('store-list.pug', {
            user: {
                id      : String(request.session.id),
                name    : String(request.session.name),
                initials: String(request.session.initials),
                image   : String(request.session.image),
                role    : String(request.session.role),
                store   : String(request.session.store),
                token   : String(request.session.token)
            },
            pageTitle   : "iRadar - Stores",
            pageId      : "store-list",
            stores      : stores,
            title       : 'Stores',
            newURL      : '/stores/add',
            newText     : 'New',
            searchFields: searchFields,
            start       : 1,
            end         : Number(stores.length),
            count       : Number(stores.length)
        });
    });
});

// GET /stores/add
router.get('/add', (request, response) => {
    var id      = request.params.id;
    var store   = String(request.session.store);
    var role    = String(request.session.role);
    var isAdmin = role == 'admin';
    
    var store = {
        active: true
    };
    
    var stateOptions = [
        {'label':'NSW','value':'NSW'},
        {'label':'VIC','value':'VIC'},
        {'label':'QLD','value':'QLD'},
        {'label':'TAS','value':'TAS'},
        {'label':'SA', 'value':'SA'},
        {'label':'NT', 'value':'NT'},
        {'label':'WA', 'value':'WA'},
        {'label':'ACT','value':'ACT'}
    ];

    // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
    var col1 = [], col2 = [];
    col1.push(sys.getFieldObj(store, 'String', 'name', 'Name', false, true));
    col1.push(sys.getFieldObj(store, 'String', 'street', 'Street'));
    col1.push(sys.getFieldObj(store, 'String', 'suburb', 'Suburb'));
    col1.push(sys.getFieldObj(store, 'Select', 'state', 'State', false, false, stateOptions));
    col1.push(sys.getFieldObj(store, 'String', 'postcode', 'Post code'));
    col1.push(sys.getFieldObj(store, 'String', 'phone', 'Phone number'));
    col1.push(sys.getFieldObj(store, 'Textarea', 'description', 'Description'));
    col2.push(sys.getFieldObj(store, 'Boolean', 'active', 'Active', !isAdmin));

    response.render('store-form.pug', {
        user: {
            id      : String(request.session.id),
            name    : String(request.session.name),
            initials: String(request.session.initials),
            image   : String(request.session.image),
            role    : String(request.session.role),
            store   : String(request.session.store),
            token   : String(request.session.token)
        },
        pageTitle   : 'iRadar - Store',
        pageId      : 'store',
        kind        : 'Store',
        isAdmin     : isAdmin,
        store       : store,
        isNew       : true,
        col1        : col1,
        col2        : col2
    });
});


// POST /stores/add
router.post('/add', (request, response, next) => {
    var data = request.body;
    var userId = request.session.id;
    
    // Save the data to the database.
    model.create(kind, data, userId, (err, savedData) => {
        if (err) console.log('/stores/add: ' + err);
        response.redirect(request.baseUrl); // `${request.baseUrl}/${savedData.id}`
    });
});

// GET /stores/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id      = request.params.id;
    var store   = String(request.session.store);
    var role    = String(request.session.role);
    var isAdmin = role == 'admin';
    
    model.read(kind, id, (err, store) => {
        if (err) return;
        
        var beaconFilter = [];
        beaconFilter.push(['store', String(store.id)]);
        model.query('Beacon', beaconFilter, function cb (err, beacons) {
            if (err) return;
            if (!beacons) beacons = [];
            
            var userFilter = [];
            model.query('User', userFilter, function cb (err, users) {
                if (err) return;
                if (!users) users = [];
                
                // Get options for User fields
                var userOptions = [], storeUsers = [], user, name;
                for (var i = 0; i < users.length; i++) {
                    user = users[i];
                    name = user.first_name + ' ' + user.last_name;
                    userOptions.push({
                        'label': String(name),
                        'value': String(user.id)
                    });
                    if (user.store == store.id)
                        storeUsers.push(users[i]);
                }
                
                var stateOptions = [
                    {'label':'NSW','value':'NSW'},
                    {'label':'VIC','value':'VIC'},
                    {'label':'QLD','value':'QLD'},
                    {'label':'TAS','value':'TAS'},
                    {'label':'SA', 'value':'SA'},
                    {'label':'NT', 'value':'NT'},
                    {'label':'WA', 'value':'WA'},
                    {'label':'ACT','value':'ACT'}
                ];
                
                // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
                var col1 = [], col2 = [];
                col1.push(sys.getFieldObj(store, 'String', 'name', 'Name', false, true));
                col1.push(sys.getFieldObj(store, 'String', 'street', 'Street'));
                col1.push(sys.getFieldObj(store, 'String', 'suburb', 'Suburb'));
                col1.push(sys.getFieldObj(store, 'Select', 'state', 'State', false, false, stateOptions));
                col1.push(sys.getFieldObj(store, 'String', 'postcode', 'Post code'));
                col1.push(sys.getFieldObj(store, 'String', 'phone', 'Phone number'));
                col1.push(sys.getFieldObj(store, 'Textarea', 'description', 'Description'));
                col2.push(sys.getFieldObj(store, 'String', 'id', 'ID', true));
                col2.push(sys.getFieldObj(store, 'ForeignKey', 'created_by', 'Created by', true, false, userOptions, 'User'));
                col2.push(sys.getFieldObj(store, 'DateTime', 'created_on', 'Created on', true));
                col2.push(sys.getFieldObj(store, 'ForeignKey', 'updated_by', 'Updated by', true, false, userOptions, 'User'));
                col2.push(sys.getFieldObj(store, 'DateTime', 'updated_on', 'Updated on', true));
                col2.push(sys.getFieldObj(store, 'Boolean', 'active', 'Active', !isAdmin));
                
                response.render('store-form.pug', {
                    user: {
                        id      : String(request.session.id),
                        name    : String(request.session.name),
                        initials: String(request.session.initials),
                        image   : String(request.session.image),
                        role    : String(request.session.role),
                        store   : String(request.session.store),
                        token   : String(request.session.token)
                    },
                    pageTitle   : 'iRadar - Store',
                    pageId      : 'store',
                    kind        : 'Store',
                    canCreate   : isAdmin,
                    isAdmin     : isAdmin,
                    entity      : store,
                    beacons     : beacons,
                    users       : users,
                    storeUsers  : storeUsers,
                    col1        : col1,
                    col2        : col2
                });
            });
        });
    });
});

// POST /stores/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data   = request.body;
    var id     = request.params.id;
    var userId = request.session.id;
    
    model.update(kind, id, data, userId, (err, savedData) => {
        if (err) console.log(`/stores/${id}/edit: ${err}`);
        response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
    });
});

// GET /stores/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    response.redirect(`/stores/${id}/edit`);
});

// GET /stores/:id/delete
router.get('/:id/delete', (request, response, next) => {
    var id = request.params.id;
    var userId = String(request.session.id);
    
    model.delete(kind, id, userId, (err) => {
        if (err) console.log(`/stores/${id}/delete: ${err}`);
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
