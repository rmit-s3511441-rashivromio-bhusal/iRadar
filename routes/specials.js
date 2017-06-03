const express    = require('express');
const router     = express.Router();
const kind       = 'Special';
const bodyParser = require('body-parser');
const sys        = require('./sys');
const config     = require('./config');
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

// GET /specials
router.get('/', (request, response, next) => {
    var store   = String(request.session.store);
    var role    = String(request.session.role);
    var isAdmin = role == 'admin';
    
    var specialFilter = [];
    if (!isAdmin)
        specialFilter.push(['store', store]); // Store Access Control
    model.query('Special', specialFilter, function cb (err, specials) {
        if (err) return;
        if (!specials) specials = [];
        
        var beaconFilter = [];
        if (!isAdmin)
            beaconFilter.push(['store', store]); // Store Access Control
        model.query('Beacon', beaconFilter, function cb (err, beacons) {
            if (err) return;
            if (!beacons) beacons = [];
            
            var storeFilter = [];
            model.query('Store', storeFilter, function cb (err, stores) {
                if (err) return;
                if (!stores) stores = [];
                
                // Get Display values
                var storeList = {}, storeOptions = [];
                for (var i = 0; i < stores.length; i++) {
                    storeList[String(stores[i].id)] = String(stores[i].name);
                    storeOptions.push({
                        'label': String(stores[i].name),
                        'value': String(stores[i].id)
                    });
                }
                var beaconList = {}, beaconOptions = [];
                for (var i = 0; i < beacons.length; i++) {
                    beaconList[String(beacons[i].id)] = String(beacons[i].unique_id);
                    beaconOptions.push({
                        'label': String(beacons[i].unique_id),
                        'value': String(beacons[i].id)
                    });
                }
                
                var special;
                for (var i = 0; i < specials.length; i++) {
                    special = specials[i];
                    special.store_dv      = storeList[special.store];
                    special.beacon_dv     = beaconList[special.beacon];
                    special.active_dv     = special.active ? 'Yes' : 'No';
                    special.updated_on_dv = sys.getDisplayValue(special.updated_on);
                    special.start_dv      = sys.getDisplayValue(special.start);
                    special.end_dv        = sys.getDisplayValue(special.end);
                }
                
                var proxiOptions = [
                    {'label':'IMMEDIATE','value':'IMMEDIATE'},
                    {'label':'NEAR',     'value':'NEAR'},
                    {'label':'FAR',      'value':'FAR'}
                ];
                var activeOptions = [
                    {'label':'Yes','value':'true'},
                    {'label':'No', 'value':'false'}
                ];
                
                var searchFields = [];
                searchFields.push({'name':'name',  'label':'Name'});
                searchFields.push({'name':'proximity','label':'Proximity'});
                searchFields.push({'name':'start','label':'Start'});
                searchFields.push({'name':'end','label':'End'});
                
                var bulkFields = [];
                if (isAdmin)
                    bulkFields.push(sys.getFieldObj({}, 'ForeignKey', 'store', 'Store', false, false, storeOptions, 'Store'));
                bulkFields.push(sys.getFieldObj({}, 'ForeignKey', 'beacon', 'Beacon', false, false, beaconOptions, 'Beacon'));
                bulkFields.push(sys.getFieldObj({}, 'Select', 'proximity', 'Proximity', false, false, proxiOptions));
                bulkFields.push(sys.getFieldObj({}, 'DateTime', 'start', 'Start'));
                bulkFields.push(sys.getFieldObj({}, 'DateTime', 'end', 'End'));
                bulkFields.push(sys.getFieldObj({}, 'Select', 'active', 'Active', false, false, activeOptions));
                
                response.render('special-list.pug', {
                    user: {
                        id      : String(request.session.id),
                        name    : String(request.session.name),
                        initials: String(request.session.initials),
                        image   : String(request.session.image),
                        role    : String(request.session.role),
                        store   : String(request.session.store),
                        token   : String(request.session.token)
                    },
                    pageTitle   : "iRadar - Specials",
                    pageId      : "specials",
                    kind        : kind,
                    specials    : specials,
                    title       : 'Specials',
                    canCreate   : true,
                    canDelete   : true,
                    searchFields: searchFields,
                    start       : 1,
                    end         : Number(specials.length),
                    count       : Number(specials.length),
                    bulkFields  : bulkFields
                });
            });
        });
    });
});

// GET /specials/add
router.get('/add', (request, response) => {
    var id      = request.params.id;
    var store   = String(request.session.store);
    var role    = String(request.session.role);
    var isAdmin = role == 'admin';
    
    // Default values
    var special = {
        'active': true,
        'store' : store
    };
    
    var beaconFilter = [];
    if (!isAdmin)
        beaconFilter.push(['store', store]); // Store Access Control
    model.query('Beacon', beaconFilter, function cb (err, beacons) {
        if (err) return;
        if (!beacons) beacons = [];

        var storeFilter = [];
        model.query('Store', storeFilter, function cb (err, stores) {
            if (err) return;
            if (!stores) stores = [];

            var userFilter = [];
            model.query('User', userFilter, function cb (err, users) {
                if (err) return;
                if (!users) users = [];

                // Get options for Store field
                var storeOptions = [];
                for (var i = 0; i < stores.length; i++) {
                    storeOptions.push({
                        'label': String(stores[i].name),
                        'value': String(stores[i].id)
                    });
                }
                var beaconOptions = [], storeBeacons = {}, beacon;
                for (var i = 0; i < beacons.length; i++) {
                    beacon = beacons[i];
                    var obj = {
                        'label': String(beacon.unique_id),
                        'value': String(beacon.id)
                    };
                    beaconOptions.push(obj);
                    var s = String(beacon.store);
                    if (!storeBeacons[s])
                        storeBeacons[s] = [];
                    storeBeacons[s].push(obj);
                }
                storeBeacons = JSON.stringify(storeBeacons);
                
                var userOptions = [];
                for (var i = 0; i < users.length; i++) {
                    userOptions.push({
                        'label': users[i].first_name + ' ' + users[i].last_name,
                        'value': String(users[i].id)
                    });
                }
                var proxiOptions = [
                    {'label':'IMMEDIATE','value':'IMMEDIATE'},
                    {'label':'NEAR',     'value':'NEAR'},
                    {'label':'FAR',      'value':'FAR'}
                ];

                // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
                var col1 = [], col2 = [];
                col1.push(sys.getFieldObj(special, 'String', 'name', 'Name', false, true));
                col1.push(sys.getFieldObj(special, 'Select', 'proximity', 'Proximity', false, true, proxiOptions));
                col1.push(sys.getFieldObj(special, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
                col1.push(sys.getFieldObj(special, 'ForeignKey', 'beacon', 'Beacon', false, true, beaconOptions,'Beacon'));
                col1.push(sys.getFieldObj(special, 'DateTime', 'start', 'Start', false, true));
                col1.push(sys.getFieldObj(special, 'DateTime', 'end', 'End', false, true));
                col1.push(sys.getFieldObj(special, 'URL', 'url', 'Image URL', false, true));
                col2.push(sys.getFieldObj(special, 'Boolean', 'active', 'Active'));

                response.render('special-form.pug', {
                    user: {
                        id      : String(request.session.id),
                        name    : String(request.session.name),
                        initials: String(request.session.initials),
                        image   : String(request.session.image),
                        role    : String(request.session.role),
                        store   : String(request.session.store),
                        token   : String(request.session.token)
                    },
                    special     : special,
                    pageTitle   : 'iRadar - Special',
                    pageId      : 'special',
                    kind        : 'Special',
                    isAdmin     : isAdmin,
                    col1        : col1,
                    col2        : col2,
                    storeBeacons: storeBeacons,
                    isNew       : true
                });
            });
        });
    });
});


// POST /specials/add
router.post('/add', (request, response, next) => {
    var data   = request.body;
    var userId = String(request.session.id);
    
    data.active = Boolean(data.active);
    data.start  = sys.getValue(data.start);
    data.end    = sys.getValue(data.end);
    
    // Save the data to the database.
    model.create(kind, data, userId, (err, savedData) => {
        if (err) console.log('/specials/add: ' + err);
        response.redirect(request.baseUrl); // `${request.baseUrl}/${savedData.id}`
    });
});

// GET /specials/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id      = request.params.id;
    var store   = String(request.session.store);
    var role    = String(request.session.role);
    var isAdmin = role == 'admin';
    
    model.read(kind, id, (err, special) => {
        if (err) return;
        
        var beaconFilter = [];
        if (!isAdmin)
            beaconFilter.push(['store', store]); // Store Access Control
        model.query('Beacon', beaconFilter, function cb (err, beacons) {
            if (err) return;
            if (!beacons) beacons = [];

            var storeFilter = [];
            model.query('Store', storeFilter, function cb (err, stores) {
                if (err) return;
                if (!stores) stores = [];

                var userFilter = [];
                model.query('User', userFilter, function cb (err, users) {
                    if (err) return;
                    if (!users) users = [];
                    
                    // Get options for Store field
                    var storeOptions = [];
                    for (var i = 0; i < stores.length; i++) {
                        storeOptions.push({
                            'label': String(stores[i].name),
                            'value': String(stores[i].id)
                        });
                    }
                    var beaconOptions = [], storeBeacons = {}, beacon;
                    for (var i = 0; i < beacons.length; i++) {
                        beacon = beacons[i];
                        beaconOptions.push({
                            'label': String(beacon.unique_id),
                            'value': String(beacon.id)
                        });
                        var s = String(beacon.store);
                        if (!storeBeacons[s])
                            storeBeacons[s] = [];
                        storeBeacons[s].push(String(beacon.id));
                    }
                    var userOptions = [];
                    for (var i = 0; i < users.length; i++) {
                        userOptions.push({
                            'label': users[i].first_name + ' ' + users[i].last_name,
                            'value': String(users[i].id)
                        });
                    }
                    var proxiOptions = [
                        {'label':'IMMEDIATE','value':'IMMEDIATE'},
                        {'label':'NEAR',     'value':'NEAR'},
                        {'label':'FAR',      'value':'FAR'}
                    ];
                    
                    // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
                    var col1 = [], col2 = [];
                    col1.push(sys.getFieldObj(special, 'String', 'name', 'Name', false, true));
                    col1.push(sys.getFieldObj(special, 'Select', 'proximity', 'Proximity', false, true, proxiOptions));
                    col1.push(sys.getFieldObj(special, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
                    col1.push(sys.getFieldObj(special, 'ForeignKey', 'beacon', 'Beacon', false, true, beaconOptions,'Beacon'));
                    col1.push(sys.getFieldObj(special, 'DateTime', 'start', 'Start', false, true));
                    col1.push(sys.getFieldObj(special, 'DateTime', 'end', 'End', false, true));
                    col1.push(sys.getFieldObj(special, 'URL', 'url', 'Image URL', false, true));
                    col2.push(sys.getFieldObj(special, 'String', 'id', 'ID', true));
                    col2.push(sys.getFieldObj(special, 'ForeignKey', 'created_by', 'Created by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(special, 'DateTime', 'created_on', 'Created on', true));
                    col2.push(sys.getFieldObj(special, 'ForeignKey', 'updated_by', 'Updated by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(special, 'DateTime', 'updated_on', 'Updated on', true));
                    col2.push(sys.getFieldObj(special, 'Boolean', 'active', 'Active'));
                    
                    response.render('special-form.pug', {
                        user: {
                            id      : String(request.session.id),
                            name    : String(request.session.name),
                            initials: String(request.session.initials),
                            image   : String(request.session.image),
                            role    : String(request.session.role),
                            store   : String(request.session.store),
                            token   : String(request.session.token)
                        },
                        pageTitle   : 'iRadar - Special',
                        pageId      : 'special',
                        kind        : 'Special',
                        entity      : special,
                        isAdmin     : isAdmin,
                        col1        : col1,
                        col2        : col2,
                        storeBeacons: storeBeacons
                    });
                });
            });
        });
    });
});

// POST /specials/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data = request.body;
    var id = request.params.id;
    var userId = request.session.id;
    
    if (data.start)
        data.start = sys.getValue(data.start);
    if (data.end)
        data.end = sys.getValue(data.end);
    
    data.active = Boolean(data.active);
    
    model.update(kind, id, data, userId, (err, savedData) => {
        if (err) console.log(`/specials/${id}/edit: ${err}`);
        response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
    });
});

// POST /specials/bulk-update
router.post('/bulk-update', (request, response, next) => {
    var data = request.body;
    var userId = String(request.session.id);
    
    console.log('Action: ' + data.bulkAction);
    console.log('list: ' + data.bulkList);
    response.redirect('/'); // users list
});

// GET /specials/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    
    response.redirect(`/specials/${id}/edit`);
});

// GET /specials/:id/delete
router.get('/:id/delete', (request, response, next) => {
    var id = request.params.id;
    
    model.delete(kind, id, (err) => {
        if (err) console.log(`/specials/${id}/delete: ${err}`);;
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
