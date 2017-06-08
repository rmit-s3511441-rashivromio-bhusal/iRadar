// CRUD methods for Beacons

const kind       = 'Beacon';
const config     = require('./config');
const model      = require('./model');
const sys        = require('./sys');
const bodyParser = require('body-parser');
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

// GET /beacons
router.get('/', (request, response, next) => {
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    
    // URL query parameters
    var rows  = request.query.rows  ? Number(request.query.rows)  : 20;
    var start = request.query.start ? Number(request.query.start) : 1;
    var order = request.query.order ? String(request.query.order) : 'unique_id';
    var query = request.query.query ? String(request.query.query) : null;
    
    model.query3(kind, storeAC, function cb (err, beaconList) {
        if (err) sys.addError(request, err);
        if (!beaconList) beaconList = [];
        
        // Reference data only
        model.query3('Store', null, function cb (err, storeList) {
            if (err) sys.addError(request, err);
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
                beacon.store_dv      = storeNames[beacon.store];
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
            
            // Define Select Options
            var activeOptions = [
                {'label':'Yes','value':'true'},
                {'label':'No', 'value':'false'}
            ];
            
            // List headers
            var headers = [
                {'name':'unique_id','label':'Unique ID'},
                {'name':'alias','label':'Alias'},
                {'name':'uuid','label':'UUID'},
                {'name':'major','label':'Major'},
                {'name':'minor','label':'Minor'},
                {'name':'store','label':'Store'},
                {'name':'active','label':'Active'},
                {'name':'updated_on','label':'Updated on'}
            ];
            
            // Fields used on the Bulk Update modal
            var bulkFields = [];
            if (isAdmin)
                bulkFields.push(sys.getFieldObj({}, 'ForeignKey', 'store', 'Store', false, false, storeOptions, 'Store'));
            bulkFields.push(sys.getFieldObj({}, 'String', 'alias', 'Alias'));
            bulkFields.push(sys.getFieldObj({}, 'Select', 'active', 'Active', false, false, activeOptions));
            
            // Datastore has very limited query functionality - so we'll filter via our own script here
            var urlQueries = [], crumbs = [];
            
            // URL for filter breadcrumbs
            var url = '/beacons';
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
                
                // look through beaconList and push any matching Beacons into filteredList
                var j, b, entityValue, filteredList = [];
                for (j = 0; j < beaconList.length; j++) {
                    if (!beaconList[j] || beaconList[j][field] === undefined) {
                        continue;
                    }
                    entityValue = String(beaconList[j][field]);
                    if (entityValue === 'true')
                        entityValue = true;
                    if (entityValue === 'false')
                        entityValue = false;
                    
                    if (operator == '>=') {
                        if (entityValue >= searchValue) {
                            filteredList.push(beaconList[j]);
                        }
                    } else if (operator == '<=') {
                        if (entityValue <= searchValue) {
                            filteredList.push(beaconList[j]);
                        }
                    } else if (operator == '>') {
                        if (entityValue > searchValue) {
                            filteredList.push(beaconList[j]);
                        }
                    } else if (operator == '<') {
                        if (entityValue < searchValue) {
                            filteredList.push(beaconList[j]);
                        }
                    } else if (operator == '!*') {
                        if (entityValue.indexOf(searchValue) == -1) {
                            filteredList.push(beaconList[j]);
                        }
                    } else if (operator == '=*') {
                        if (entityValue.indexOf(searchValue) != -1) {
                            filteredList.push(beaconList[j]);
                        }
                    } else if (operator == '!=') {
                        if (entityValue !== searchValue) {
                            filteredList.push(beaconList[j]);
                        }
                    } else if (operator == '=') {
                        if (entityValue === searchValue) {
                            filteredList.push(beaconList[j]);
                        }
                    }
                }
                beaconList = filteredList;
            }
            
            // Sort
            if (order && beaconList.length > 1) {
                var orderBy = String(order);
                var isAsc = true;
                if (order.match(/DESC$/) != null) {
                    orderBy = orderBy.replace(/DESC$/, '');
                    isAsc = false;
                }
                if (isAsc) {
                    beaconList.sort(function(a, b) {
                        if (a[orderBy] < b[orderBy]) return -1;
                        if (a[orderBy] > b[orderBy]) return 1;
                        return 0;
                    });
                } else {
                    beaconList.sort(function(a, b) {
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
            var count = Number(beaconList.length);
            var startIndex = start - 1;
            var endIndex = startIndex + rows - 1;
            var maxIndex = count - 1;
            if (count == 0)
                endIndex = 0;
            else if (endIndex > maxIndex)
                endIndex = maxIndex;
            
            var list  = [];
            for (var i = startIndex; i <= endIndex && i < beaconList.length; i++) {
                list.push(beaconList[i]);
            }
            beaconList = list;
            
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
                beacons     : beaconList,
                title       : 'Beacons',
                canCreate   : false,
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

// GET /beacons/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id        = request.params.id;
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var canEdit   = false;
    
    model.read(kind, id, (err, beacon) => {
        if (err) sys.addError(request, err);
        
        // Access Control: User must be admin or belong to the Beacon's Store
        canEdit = isAdmin || userStore == beacon.store;
        
        model.query3('Store', null, function cb (err, stores) {
            if (err) sys.addError(request, err);
            if (!stores) stores = [];
            
            var specialFilter = [['beacon', String(beacon.id)], ['active', true]];
            model.query('Special', specialFilter, function cb (err, specials) {
                if (err) sys.addError(request, err);
                if (!specials) specials = [];
                
                model.query3('User', null, function cb (err, users) {
                    if (err) sys.addError(request, err);
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
                    col1.push(sys.getFieldObj(beacon, 'String', 'alias', 'Alias', !canEdit));
                    col1.push(sys.getFieldObj(beacon, 'Color', 'color', 'Report colour', !canEdit));
                    col1.push(sys.getFieldObj(beacon, 'String', 'lat', 'Latitude', !canEdit));
                    col1.push(sys.getFieldObj(beacon, 'String', 'long', 'Longitude', !canEdit));
                    col1.push(sys.getFieldObj(beacon, 'Boolean', 'active', 'Active', !canEdit));
                    col2.push(sys.getFieldObj(beacon, 'String', 'uuid', 'UUID', true));
                    col2.push(sys.getFieldObj(beacon, 'String', 'major', 'Major', true));
                    col2.push(sys.getFieldObj(beacon, 'String', 'minor', 'Minor', true));
                    col2.push(sys.getFieldObj(beacon, 'ForeignKey', 'created_by', 'Created by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(beacon, 'DateTime',   'created_on', 'Created on', true));
                    col2.push(sys.getFieldObj(beacon, 'ForeignKey', 'updated_by', 'Updated by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(beacon, 'DateTime',   'updated_on', 'Updated on', true));
                    
                    var messages = sys.getMessages(request);
                    
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
                        canEdit     : canEdit,
                        canDelete   : isAdmin,
                        entity      : beacon,
                        specials    : specials,
                        col1        : col1,
                        col2        : col2,
                        messages    : messages
                    });
                });
            });
        });
    });
});

// POST /beacons/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data   = request.body;
    var id     = request.params.id;
    var userId = String(request.session.id);
    
    data.active = Boolean(data.active);
    
    model.update(kind, id, data, userId, (err, savedData) => {
        if (err) sys.addError(request, err);
        else sys.addMessage(request, 'Beacon updated');
        
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
    
    var newData = {};
    if (data.store)
        newData.store = String(data.store);
    if (data.alias)
        newData.alias = String(data.alias);
    if (data.active)
        newData.active = data.active == 'true';
    
    for (var i = 0; i < len; i++) {
        model.update(kind, list[i], newData, userId, function cb(err, savedData) {
            if (err) sys.addError(request, err);
            
            if (i == len-1) {
                sys.addMessage(request, len + ' Beacon' + (len==1?'':'s') + ' updated');
                response.redirect('/beacons'); // beacons list
            }
        });
    }
    sys.addMessage(request, len + ' Beacon' + (len==1?'':'s') + ' updated');
    response.redirect('/beacons');
});

// POST /beacons/bulk-delete
router.post('/bulk-delete', (request, response, next) => {
    console.log('/bulk-delete');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list   = data.bulkList2 ? String(data.bulkList2).split(',') : [];
    var len    = list.length;
    console.log('list: ' + list.join(', '));
    
    for (var i = 0; i < len; i++) {
        model.delete(kind, list[i], userId, function cb(err) {
            if (err) sys.addError(request, err);
            
            if (i == len-1) {
                sys.addMessage(request, len + ' Beacon' + (len==1?'':'s') + ' deleted');
                response.redirect('/beacons'); // beacons list
            }
        });
    }
    sys.addMessage(request, len + ' Beacon' + (len==1?'':'s') + ' deleted');
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
    var userId = String(request.session.id);
    
    model.delete(kind, id, userId, (err) => {
        if (err) sys.addError(request, err);
        else sys.addMessage(request, 'Beacon deleted');
        
        response.redirect(request.baseUrl);
    });
});

// Errors on "/beacons/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    //err.response = err.message;
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
    //next(err);
});

module.exports = router;
