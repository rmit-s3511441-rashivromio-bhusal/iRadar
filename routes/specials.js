// CRUD methods for Specials

const kind       = 'Special';
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

// GET /specials
router.get('/', (request, response, next) => {
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    
    // URL query parameters
    var rows  = request.query.rows  ? Number(request.query.rows)  : 20;
    var start = request.query.start ? Number(request.query.start) : 1;
    var order = request.query.order ? String(request.query.order) : 'name';
    var query = request.query.query ? String(request.query.query) : null;
    
    model.query3(kind, storeAC, function cb (err, specialList) {
        if (err) sys.addError(request, err);
        if (!specialList) specialList = [];
        
        // Reference data only
        model.query3('Beacon', null, function cb (err, beaconList) {
            if (err) sys.addError(request, err);
            if (!beaconList) beaconList = [];
            
            // Reference data only
            model.query3('Store', null, function cb (err, storeList) {
                if (err) sys.addError(request, err);
                if (!storeList) storeList = [];
                
                // Get Display values
                var store, storeNames = {}, storeOptions = [];
                for (var i = 0; i < storeList.length; i++) {
                    store = storeList[i];
                    storeNames[String(store.id)] = String(store.name);
                    storeOptions.push({
                        'label': String(store.name),
                        'value': String(store.id)
                    });
                }
                
                // Get a list of display names and Select Options for the Beacons
                var beacon, beaconNames = {}, beaconOptions = [];
                for (var i = 0; i < beaconList.length; i++) {
                    beacon = beaconList[i];
                    beaconNames[String(beacon.id)] = String(beacon.unique_id);
                    beaconOptions.push({
                        'label': String(beacon.unique_id),
                        'value': String(beacon.id)
                    });
                }
                
                // Set display values
                var special;
                for (var i = 0; i < specialList.length; i++) {
                    special = specialList[i];
                    special.store_dv      = storeNames[special.store];
                    special.beacon_dv     = beaconNames[special.beacon];
                    special.active_dv     = special.active ? 'Yes' : 'No';
                    special.updated_on_dv = sys.getDisplayValue(special.updated_on);
                    special.start_dv      = sys.getDisplayValue(special.start);
                    special.end_dv        = sys.getDisplayValue(special.end);
                }
                
                // Define Select Options
                var proxiOptions = [
                    {'label':'IMMEDIATE','value':'IMMEDIATE'},
                    {'label':'NEAR',     'value':'NEAR'},
                    {'label':'FAR',      'value':'FAR'}
                ];
                var activeOptions = [
                    {'label':'Yes','value':'true'},
                    {'label':'No', 'value':'false'}
                ];
                
                // List headers
                var headers = [
                    {'name':'name','label':'Name'},
                    {'name':'proximity','label':'Proximity'},
                    {'name':'store','label':'Store'},
                    {'name':'beacon','label':'Beacon'},
                    {'name':'start','label':'Start'},
                    {'name':'end','label':'End'},
                    {'name':'active','label':'Active'},
                    {'name':'updated_on','label':'Updated on'}
                ];
                
                // Fields that can be searched by the Search bar
                var searchFields = [];
                searchFields.push({'name':'name',  'label':'Name'});
                searchFields.push({'name':'proximity','label':'Proximity'});
                searchFields.push({'name':'start','label':'Start'});
                searchFields.push({'name':'end','label':'End'});
                
                // Fields that appear on the bulk update modal
                var bulkFields = [];
                if (isAdmin)
                    bulkFields.push(sys.getFieldObj({}, 'ForeignKey', 'store', 'Store', false, false, storeOptions, 'Store'));
                bulkFields.push(sys.getFieldObj({}, 'ForeignKey', 'beacon', 'Beacon', false, false, beaconOptions, 'Beacon'));
                bulkFields.push(sys.getFieldObj({}, 'Select', 'proximity', 'Proximity', false, false, proxiOptions));
                bulkFields.push(sys.getFieldObj({}, 'DateTime', 'start', 'Start'));
                bulkFields.push(sys.getFieldObj({}, 'DateTime', 'end', 'End'));
                bulkFields.push(sys.getFieldObj({}, 'Select', 'active', 'Active', false, false, activeOptions));
                
                // Datastore has very limited query functionality - so we'll filter via our own script here
                var urlQueries = [], crumbs = [];

                // URL for filter breadcrumbs
                var url = '/specials';
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

                    // look through specialList and push any matching Specials into filteredList
                    var j, b, entityValue, filteredList = [];
                    for (j = 0; j < specialList.length; j++) {
                        if (!specialList[j] || specialList[j][field] === undefined) {
                            continue;
                        }
                        entityValue = String(specialList[j][field]);
                        if (entityValue === 'true')
                            entityValue = true;
                        if (entityValue === 'false')
                            entityValue = false;

                        if (operator == '>=') {
                            if (entityValue >= searchValue) {
                                filteredList.push(specialList[j]);
                            }
                        } else if (operator == '<=') {
                            if (entityValue <= searchValue) {
                                filteredList.push(specialList[j]);
                            }
                        } else if (operator == '>') {
                            if (entityValue > searchValue) {
                                filteredList.push(specialList[j]);
                            }
                        } else if (operator == '<') {
                            if (entityValue < searchValue) {
                                filteredList.push(specialList[j]);
                            }
                        } else if (operator == '!*') {
                            if (entityValue.indexOf(searchValue) == -1) {
                                filteredList.push(specialList[j]);
                            }
                        } else if (operator == '=*') {
                            if (entityValue.indexOf(searchValue) != -1) {
                                filteredList.push(specialList[j]);
                            }
                        } else if (operator == '!=') {
                            if (entityValue !== searchValue) {
                                filteredList.push(specialList[j]);
                            }
                        } else if (operator == '=') {
                            if (entityValue === searchValue) {
                                filteredList.push(specialList[j]);
                            }
                        }
                    }
                    specialList = filteredList;
                }

                // Sort
                if (order && specialList.length > 1) {
                    var orderBy = String(order);
                    var isAsc = true;
                    if (order.match(/DESC$/) != null) {
                        orderBy = orderBy.replace(/DESC$/, '');
                        isAsc = false;
                    }
                    if (isAsc) {
                        specialList.sort(function(a, b) {
                            if (a[orderBy] < b[orderBy]) return -1;
                            if (a[orderBy] > b[orderBy]) return 1;
                            return 0;
                        });
                    } else {
                        specialList.sort(function(a, b) {
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
                var count = Number(specialList.length);
                var startIndex = start - 1;
                var endIndex = startIndex + rows - 1;
                var maxIndex = count - 1;
                if (count == 0)
                    endIndex = 0;
                else if (endIndex > maxIndex)
                    endIndex = maxIndex;

                var list  = [];
                for (var i = startIndex; i <= endIndex && i < specialList.length; i++) {
                    list.push(specialList[i]);
                }
                specialList = list;

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
                    specials    : specialList,
                    title       : 'Specials',
                    canCreate   : true,
                    canDelete   : true,
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
});

// GET /specials/add
router.get('/add', (request, response) => {
    var id        = request.params.id;
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    
    // Default values
    var special = {
        'active': true,
        'store' : userStore
    };
    
    model.query3('Beacon', storeAC, function cb (err, beaconList) {
        if (err) sys.addError(request, err);
        if (!beaconList) beaconList = [];

        model.query3('Store', null, function cb (err, storeList) {
            if (err) sys.addError(request, err);
            if (!storeList) storeList = [];

            model.query3('User', null, function cb (err, userList) {
                if (err) sys.addError(request, err);
                if (!userList) userList = [];

                // Get options for Store field
                var store, storeOptions = [];
                for (var i = 0; i < storeList.length; i++) {
                    store = storeList[i];
                    storeOptions.push({
                        'label': String(store.name),
                        'value': String(store.id)
                    });
                }
                
                var beaconOptions = [], storeBeacons = {}, beacon;
                for (var i = 0; i < beaconList.length; i++) {
                    beacon = beaconList[i];
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
                
                var user, userOptions = [];
                for (var i = 0; i < userList.length; i++) {
                    user = userList[i];
                    userOptions.push({
                        'label': user.first_name + ' ' + user.last_name,
                        'value': String(user.id)
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

                var messages = sys.getMessages(request);
                
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
                    isNew       : true,
                    canEdit     : true,
                    messages    : messages
                });
            });
        });
    });
});

// POST /specials/add
router.post('/add', (request, response, next) => {
    var data      = request.body;
    var userId    = String(request.session.id);
    var userStore = String(request.session.store);
    
    data.active = Boolean(data.active);
    data.start  = sys.getValue(data.start);
    data.end    = sys.getValue(data.end);
    if (!data.store)
        data.store = userStore;
    
    // Save the data to the database.
    model.create(kind, data, userId, (err, savedData) => {
        if (err) sys.addError(request, err);
        else sys.addMessage(request, 'Special created');
        
        // We don't have the ID to navigate straight to the new Special
        response.redirect('/specials');
    });
});

// GET /specials/:id/edit
router.get('/:id/edit', (request, response, next) => {
    var id        = request.params.id;
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    var canEdit   = false;
    
    model.read(kind, id, (err, special) => {
        if (err || !special) {
            sys.addError(request, err);
            next(err);
            return;
        }
        
        canEdit = isAdmin || userStore == special.store;
        
        model.query3('Beacon', storeAC, function cb (err, beaconList) {
            if (err) sys.addError(request, err);
            if (!beaconList) beaconList = [];

            // Reference data only
            model.query3('Store', null, function cb (err, storeList) {
                if (err) sys.addError(request, err);
                if (!storeList) storeList = [];

                // Reference data only
                model.query3('User', null, function cb (err, userList) {
                    if (err) sys.addError(request, err);
                    if (!userList) userList = [];
                    
                    // Get options for Store field
                    var store, storeOptions = [];
                    for (var i = 0; i < storeList.length; i++) {
                        store = storeList[i];
                        storeOptions.push({
                            'label': String(store.name),
                            'value': String(store.id)
                        });
                    }
                    
                    var beaconOptions = [], storeBeacons = {}, beacon;
                    for (var i = 0; i < beaconList.length; i++) {
                        beacon = beaconList[i];
                        beaconOptions.push({
                            'label': String(beacon.unique_id),
                            'value': String(beacon.id)
                        });
                        var s = String(beacon.store);
                        if (!storeBeacons[s])
                            storeBeacons[s] = [];
                        storeBeacons[s].push(String(beacon.id));
                    }
                    
                    var user, userOptions = [];
                    for (var i = 0; i < userList.length; i++) {
                        user = userList[i];
                        userOptions.push({
                            'label': user.first_name + ' ' + user.last_name,
                            'value': String(user.id)
                        });
                    }
                    
                    var proxiOptions = [
                        {'label':'IMMEDIATE','value':'IMMEDIATE'},
                        {'label':'NEAR',     'value':'NEAR'},
                        {'label':'FAR',      'value':'FAR'}
                    ];
                    
                    // Form fields: entity, type, name, label, isDisabled, isMandatory, options, foreignKind
                    var col1 = [], col2 = [];
                    col1.push(sys.getFieldObj(special, 'String', 'name', 'Name', !canEdit, canEdit));
                    col1.push(sys.getFieldObj(special, 'Select', 'proximity', 'Proximity', !canEdit, canEdit, proxiOptions));
                    col1.push(sys.getFieldObj(special, 'ForeignKey', 'store', 'Store', !isAdmin, isAdmin, storeOptions, 'Store'));
                    col1.push(sys.getFieldObj(special, 'ForeignKey', 'beacon', 'Beacon', !canEdit, canEdit, beaconOptions,'Beacon'));
                    col1.push(sys.getFieldObj(special, 'DateTime', 'start', 'Start', !canEdit, canEdit));
                    col1.push(sys.getFieldObj(special, 'DateTime', 'end', 'End', !canEdit, canEdit));
                    col1.push(sys.getFieldObj(special, 'URL', 'url', 'Image URL', !canEdit, canEdit));
                    col2.push(sys.getFieldObj(special, 'String', 'id', 'ID', true));
                    col2.push(sys.getFieldObj(special, 'ForeignKey', 'created_by', 'Created by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(special, 'DateTime', 'created_on', 'Created on', true));
                    col2.push(sys.getFieldObj(special, 'ForeignKey', 'updated_by', 'Updated by', true, false, userOptions, 'User'));
                    col2.push(sys.getFieldObj(special, 'DateTime', 'updated_on', 'Updated on', true));
                    col2.push(sys.getFieldObj(special, 'Boolean', 'active', 'Active', !canEdit));
                    
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
                        storeBeacons: storeBeacons,
                        canEdit     : canEdit,
                        canDelete   : canEdit
                    });
                });
            });
        });
    });
});

// POST /specials/:id/edit
router.post('/:id/edit', (request, response, next) => {
    var data   = request.body;
    var id     = request.params.id;
    var userId = request.session.id;
    
    if (data.start)
        data.start = sys.getValue(data.start);
    if (data.end)
        data.end = sys.getValue(data.end);
    
    data.active = Boolean(data.active);
    
    model.update(kind, id, data, userId, (err, savedData) => {
        if (err) sys.addError(request, err);
        else sys.addMessage(request, 'Special updated');
        
        response.redirect(`${request.baseUrl}/${savedData.id}/edit`);
    });
});

// POST /specials/bulk-update
router.post('/bulk-update', (request, response, next) => {
    console.log('/specials/bulk-update');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list = data.bulkList ? String(data.bulkList).split(',') : [];
    var len  = list.length;
    
    var newData = {};
    if (data.store)
        newData.store = String(data.store);
    if (data.beacon)
        newData.beacon = String(data.beacon);
    if (data.proximity)
        newData.proximity = String(data.proximity);
    if (data.start)
        newData.start = sys.getValue(data.start);
    if (data.end)
        newData.end = sys.getValue(data.end);
    if (data.active)
        newData.active = data.active == 'true';
    
    for (var i = 0; i < len; i++) {
        model.update(kind, list[i], newData, userId, function cb(err, savedData) {
            if (err) sys.addError(request, err);
            
            if (i == len-1) {
                sys.addMessage(request, len + ' Special' + (len==1?'':'s') + ' updated');
                response.redirect('/specials'); // beacons list
            }
        });
    }
    sys.addMessage(request, len + ' Special' + (len==1?'':'s') + ' updated');
    response.redirect('/specials');
});

// POST /specials/bulk-delete
router.post('/bulk-delete', (request, response, next) => {
    console.log('/specials/bulk-delete');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list   = data.bulkList2 ? String(data.bulkList2).split(',') : [];
    var len    = list.length;
    
    for (var i = 0; i < len; i++) {
        model.delete(kind, list[i], userId, function cb(err) {
            if (err) sys.addError(request, err);
            
            if (i == len-1) {
                sys.addMessage(request, len + ' Special' + (len==1?'':'s') + ' deleted');
                response.redirect('/specials'); // beacons list
            }
        });
    }
    sys.addMessage(request, len + ' Special' + (len==1?'':'s') + ' deleted');
    response.redirect('/specials');
});

// GET /specials/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    
    response.redirect(`/specials/${id}/edit`);
});

// GET /specials/:id/delete
router.get('/:id/delete', (request, response, next) => {
    var id = request.params.id;
    var userId = String(request.session.id);
    
    model.delete(kind, id, userId, (err) => {
        if (err) sys.addError(request, err);
        else sys.addMessage(request, 'Special deleted');
        
        response.redirect(request.baseUrl);
    });
});

// Errors on "/specials/*" routes.
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
