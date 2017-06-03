const kind       = 'Beacon';
const bodyParser = require('body-parser');
const config     = require('./config');
const express    = require('express');
const router     = express.Router();
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

// GET /beacons
router.get('/', (request, response, next) => {
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    
    var errors     = [];
    var bulkFields = [];
    var crumbs     = [];
    var list       = []; // Beacons
    var messages   = [];
    
    var rows  = request.query.rows  ? Number(request.query.rows)  : null;
    var start = request.query.start ? Number(request.query.start) : null;
    var order = request.query.order ? String(request.query.order) : 'unique_id';
    var query = request.query.query ? String(request.query.query) : null;
    
    model.query3(kind, storeAC, order, function cb (err, beaconList) {
        if (err) errors.push(String(err));
        if (!beaconList) beaconList = [];
        
        // Reference data only
        model.query3('Store', false, 'name', function cb (err, storeList) {
            if (err) errors.push(String(err));
            if (!storeList) storeList = [];
            
            // Get display values and Options list for Stores
            var i, store, storeNames = {}, storeOptions = [];
            for (i = 0; i < storeList.length; i++) {
                store = storeList[i];
                
                storeNames[String(store.id)] = String(store.name); // Display value
                
                storeOptions.push({
                    'label': String(store.name),
                    'value': String(store.id)
                });
            }      
            
            // Get display values for Beacons
            var beacon;
            for (i = 0; i < beaconList.length; i++) {
                beacon = beaconList[i];
                beacon.store_dv      = storeList[beacon.store];
                beacon.active_dv     = beacon.active ? 'Yes' : 'No';
                beacon.updated_on_dv = sys.getDisplayValue(beacon.updated_on);
            }
            
            // List of fields for Search bar
            var searchFields = [
                {'name':'unique_id','label':'Unique ID'},
                {'name':'alias',    'label':'Alias'},
                {'name':'uuid',     'label':'UUID'},
                {'name':'major',    'label':'Major'},
                {'name':'minor',    'label':'Minor'}
            ];
            
            var activeOptions = [
                {'label':'Yes','value':'true'},
                {'label':'No', 'value':'false'}
            ];
            
            if (isAdmin)
                bulkFields.push(sys.getFieldObj({}, 'ForeignKey', 'store', 'Store', false, false, storeOptions, 'Store'));
            bulkFields.push(sys.getFieldObj({}, 'String', 'alias', 'Alias'));
            bulkFields.push(sys.getFieldObj({}, 'Select', 'active', 'Active', false, false, activeOptions));
            
            // Datastore has very limited query functionality - so we'll filter via our own script here
            var urlQueries = [];
            
            // URL for filter breadcrumbs
            var url = '/beacons';
            if (rows)
                urlQueries.push('rows=' + rows);
            if (start)
                urlQueries.push('start=' + start);
            if (order)
                urlQueries.push('order=' + order);
            if (query)
                urlQueries.push('query=');
            
            if (urlQueries.length > 0)
                url += '?' + urlQueries.join('&'));
            
            var filters = query ? query.split('^') : [];
            var filter, field, operator, value;
            for (i = 0; i < filters.length; i++) {
                filter = String(filters[i]);
                console.log('filter: ' + filter);
                
                // Breadcrumbs
                if (i != 0)
                    url += '^';
                url += filter;
                crumbs.push({
                    'label': String(filter),
                    'url'  : String(url)
                });
                
                // Filters
                field    = String(filter.match(/^[a-z_]+/i)[0]);
                operator = String(filter.match(/(>=|<=|>|<|!\*|=\*|!=|=)/)[0]); // Operators: = != > >= < <= !* =*
                value    = String(filter.match(/[^\=\!\>\<\*]+$/)[0]);
                
                console.log(field + ', ' + operator + ', ' + value);
                
            }
            console.log('beaconFilter: ' + JSON.stringify(beaconFilter));

    
            // Pagination
            var count = Number(beaconList.length);
            var pages = [];
            var list  = [];
            var s = start-1;
            var e = s + rows;
            if (e > count)
                e = count;
            for (var i = s; i < e; i++) {
                list.push(beaconList[i]);
            }
            var num = 1;
            for (var s = 1; s <= count; s += rows) {
                pages.push({
                    'num'   : Number(num),
                    'start' : Number(s),
                    'active': s == start
                });
                num++;
            }
            console.log('pages: ' + JSON.stringify(pages));
            
            messages.push('Do you want ants? Because that\'s how you get ants.');
            
            response.render('beacon-list.pug', {
                user: {
                    id      : String(request.session.id),
                    name    : String(request.session.name),
                    initials: String(request.session.initials),
                    image   : String(request.session.image),
                    role    : String(request.session.role),
                    store   : String(request.session.store),
                    token   : String(request.session.token)
                },
                pageTitle   : 'iRadar - Beacon',
                pageId      : 'beacons',
                kind        : 'Beacon',
                beacons     : list,
                title       : 'Beacons',
                canCreate   : false,
                canDelete   : isAdmin,
                searchFields: searchFields,
                actions     : actions,
                start       : start,
                end         : (start + rows),
                count       : count,
                bulkFields  : bulkFields,
                crumbs      : crumbs,
                rows        : rows,
                pages       : pages,
                order       : order,
                messages    : messages
            });
        });
    });
});

// GET /beacons/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id      = request.params.id;
    var store   = String(request.session.store);
    var role    = String(request.session.role);
    var isAdmin = role == 'admin';
    
    model.read(kind, id, (err, beacon) => {
        if (err) return;
        
        var storeFilter = [];
        model.query('Store', storeFilter, function cb (err, stores) {
            if (err) return;
            if (!stores) stores = [];
            
            var specialFilter = [['beacon', String(beacon.id)], ['active', true]];
            model.query('Special', specialFilter, function cb (err, specials) {
                if (err) return;
                if (!specials) specials = [];
                
                var userFilter = [];
                model.query('User', userFilter, function cb (err, users) {
                    if (err) return;
                    if (!users) users = [];
                    
                    // Get display values
                    var i, special;
                    for (var i = 0; i < specials.length; i++) {
                        special = specials[i];
                        special.start      = sys.getDisplayValue(special.start);
                        special.end        = sys.getDisplayValue(special.end);
                        special.updated_on = sys.getDisplayValue(special.updated_on);
                        special.created_on = sys.getDisplayValue(special.created_on);
                    }
                    
                    // Get options for User fields
                    var userList = {}, userOptions = [], user, name;
                    for (var i = 0; i < users.length; i++) {
                        user = users[i];
                        name = user.first_name + ' ' + user.last_name;
                        userList[String(user.id)] = String(name);
                        userOptions.push({
                            'label': String(name),
                            'value': String(user.id)
                        });
                    }
                    
                    // Get options for Store field
                    var storeOptions = [];
                    for (var i = 0; i < stores.length; i++) {
                        storeOptions.push({
                            'label': String(stores[i].name),
                            'value': String(stores[i].id)
                        });
                    }
                    
                    
                    // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
                    var col1 = [], col2 = [];
                    col1.push(sys.getFieldObj(beacon, 'String', 'unique_id', 'Unique ID', true));
                    col1.push(sys.getFieldObj(beacon, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
                    col1.push(sys.getFieldObj(beacon, 'String', 'alias', 'Alias'));
                    col1.push(sys.getFieldObj(beacon, 'String', 'uuid', 'UUID', true));
                    col1.push(sys.getFieldObj(beacon, 'String', 'major', 'Major', true));
                    col1.push(sys.getFieldObj(beacon, 'String', 'minor', 'Minor', true));
                    col2.push(sys.getFieldObj(beacon, 'ForeignKey', 'created_by', 'Created by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(beacon, 'DateTime',   'created_on', 'Created on', true));
                    col2.push(sys.getFieldObj(beacon, 'ForeignKey', 'updated_by', 'Updated by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(beacon, 'DateTime',   'updated_on', 'Updated on', true));
                    col2.push(sys.getFieldObj(beacon, 'Boolean', 'active', 'Active'));
                    
                    response.render('beacon-form.pug', {
                        user: {
                            id      : String(request.session.id),
                            name    : String(request.session.name),
                            initials: String(request.session.initials),
                            image   : String(request.session.image),
                            role    : String(request.session.role),
                            store   : String(request.session.store),
                            token   : String(request.session.token)
                        },
                        pageTitle   : 'iRadar - Beacon',
                        pageId      : 'beacon',
                        kind        : 'Beacon',
                        isAdmin     : isAdmin,
                        entity      : beacon,
                        specials    : specials,
                        col1        : col1,
                        col2        : col2
                    });
                });
            });
        });
    });
});

// POST /beacons/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data = request.body;
    var id = request.params.id;
    var userId = String(request.session.id);
    
    data.active = Boolean(data.active);
    
    model.update(kind, id, data, userId, (err, savedData) => {
        if (err) return;
        
        response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
    });
});


// POST /beacons/bulk-update
router.post('/bulk-update', (request, response, next) => {
    console.log('/bulk-update');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list = data.bulkList ? String(data.bulkList).split(',') : [];
    var len  = list.length;
    console.log('list: ' + list.join(', '));
    
    var newData = {};
    if (data.store)
        newData.store = String(data.store);
    if (data.alias)
        newData.alias = String(data.alias);
    if (data.active)
        newData.active = data.active == 'true';
    console.log('newData: ' + JSON.stringify(newData));
    
    for (var i = 0; i < len; i++) {
        model.update(kind, list[i], newData, userId, function cb(err, savedData) {
            if (i == len-1)
                response.redirect('/beacons'); // beacons list
        });
    }
    response.redirect('/beacons');
});

// POST /beacons/bulk-update
router.post('/bulk-delete', (request, response, next) => {
    console.log('/bulk-delete');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list   = data.bulkList2 ? String(data.bulkList2).split(',') : [];
    var len    = list.length;
    console.log('list: ' + list.join(', '));
    
    for (var i = 0; i < len; i++) {
        model.delete(kind, id, function cb(err) {
            if (i == len-1)
                response.redirect('/beacons'); // beacons list
        });
    }
    response.redirect('/beacons');
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
        if (err) return;
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
