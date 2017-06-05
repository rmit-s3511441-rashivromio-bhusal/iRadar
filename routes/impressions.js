const kind       = 'Impression';
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

// GET /impressions
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
    
    model.query3(kind, storeAC, function cb (err, impressionList) {
        if (err) sys.addError(request, err);
        if (!impressionList) impressionList = [];
        
        // Reference data only
        model.query3('Store', null, function cb (err, storeList) {
            if (err) sys.addError(request, err);
            if (!storeList) storeList = [];
                
            // Reference data only
            model.query3('Special', null, function cb (err, specialList) {
                if (err) sys.addError(request, err);
                if (!specialList) specialList = [];

                var i, storeNames = {};
                for (i = 0; i < storeList.length; i++) {
                    storeNames[String(storeList[i].id)] = String(storeList[i].name);
                }

                var specialNames = {};
                for (i = 0; i < specialList.length; i++) {
                    specialNames[String(specialList[i].id)] = String(specialList[i].name);
                }

                var impression;
                for (var i = 0; i < impressionList.length; i++) {
                    impression = impressionList[i];
                    impression.store_dv      = storeNames[impression.store] || '(deleted)';
                    impression.special_dv    = specialNames[impression.special] || '(deleted)';
                    impression.created_on_dv = sys.getDisplayValue(impression.created_on);
                }

                var headers = [
                    {'name':'created_on','label':'Created on'},
                    {'name':'store_dv','label':'Store'},
                    {'name':'beacon','label':'Beacon'},
                    {'name':'special_dv','label':'Special'},
                    {'name':'customer','label':'Customer'}
                ];

                var searchFields = [];
                searchFields.push({'name':'created_on',  'label':'Created on'});
                searchFields.push({'name':'beacon',  'label':'Beacon'});
                searchFields.push({'name':'special_dv', 'label':'Special'});
                searchFields.push({'name':'customer','label':'Customer'});

                // Datastore has very limited query functionality - so we'll filter via our own script here
                var urlQueries = [], crumbs = [];

                // URL for filter breadcrumbs
                var url = '/impressions';
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

                    // look through impressionList and push any matching Specials into filteredList
                    var j, b, entityValue, filteredList = [];
                    for (j = 0; j < impressionList.length; j++) {
                        if (!impressionList[j] || impressionList[j][field] === undefined) {
                            continue;
                        }
                        entityValue = String(impressionList[j][field]);
                        if (entityValue === 'true')
                            entityValue = true;
                        if (entityValue === 'false')
                            entityValue = false;

                        if (operator == '>=') {
                            if (entityValue >= searchValue) {
                                filteredList.push(impressionList[j]);
                            }
                        } else if (operator == '<=') {
                            if (entityValue <= searchValue) {
                                filteredList.push(impressionList[j]);
                            }
                        } else if (operator == '>') {
                            if (entityValue > searchValue) {
                                filteredList.push(impressionList[j]);
                            }
                        } else if (operator == '<') {
                            if (entityValue < searchValue) {
                                filteredList.push(impressionList[j]);
                            }
                        } else if (operator == '!*') {
                            if (entityValue.indexOf(searchValue) == -1) {
                                filteredList.push(impressionList[j]);
                            }
                        } else if (operator == '=*') {
                            if (entityValue.indexOf(searchValue) != -1) {
                                filteredList.push(impressionList[j]);
                            }
                        } else if (operator == '!=') {
                            if (entityValue !== searchValue) {
                                filteredList.push(impressionList[j]);
                            }
                        } else if (operator == '=') {
                            if (entityValue === searchValue) {
                                filteredList.push(impressionList[j]);
                            }
                        }
                    }
                    impressionList = filteredList;
                }

                // Sort
                if (order && impressionList.length > 1) {
                    var orderBy = String(order);
                    var isAsc = true;
                    if (order.match(/DESC$/) != null) {
                        orderBy = orderBy.replace(/DESC$/, '');
                        isAsc = false;
                    }
                    if (isAsc) {
                        impressionList.sort(function(a, b) {
                            if (a[orderBy] < b[orderBy]) return -1;
                            if (a[orderBy] > b[orderBy]) return 1;
                            return 0;
                        });
                    } else {
                        impressionList.sort(function(a, b) {
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
                var count = Number(impressionList.length);
                var startIndex = start - 1;
                var endIndex = startIndex + rows - 1;
                var maxIndex = count - 1;
                if (count == 0)
                    endIndex = 0;
                else if (endIndex > maxIndex)
                    endIndex = maxIndex;

                var list  = [];
                for (var i = startIndex; i <= endIndex && i < impressionList.length; i++) {
                    list.push(impressionList[i]);
                }
                impressionList = list;

                var from = (count == 0) ? 0 : start;
                var to   = (count == 0) ? 0 : endIndex + 1;

                // Pages object
                var pages = [];
                var num = 1;
                var p1 = start - (3 * rows);
                var pn = start + (3 * rows);
                for (var s = 1; s <= count; s += rows) {
                    if (s >= p1 && s <= pn) {
                        pages.push({
                            'num'   : Number(num),
                            'start' : Number(s),
                            'active': s == start
                        });
                    }
                    num++;
                }

                var messages = sys.getMessages(request);

                response.render('impression-list.pug', {
                    user: {
                        id      : String(request.session.id),
                        name    : String(request.session.name),
                        initials: String(request.session.initials),
                        image   : String(request.session.image),
                        role    : String(request.session.role),
                        store   : String(request.session.store),
                        token   : String(request.session.token)
                    },
                    pageTitle   : "iRadar - Impressions",
                    pageId      : "impressions",
                    kind        : kind,
                    impressions : impressionList,
                    title       : 'Impressions',
                    canCreate   : false,
                    canDelete   : isAdmin,
                    searchFields: searchFields,
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

// GET /impressions/:id
router.get('/:id', (request, response, next) => {
    var id = request.params.id;
    response.redirect(`/impressions/${id}/edit`);
});

// GET /impressions/:id/delete
router.get('/:id/delete', (request, response, next) => {
    var id = request.params.id;
    var userId = String(request.session.id);
    
    model.delete(kind, id, userId, (err) => {
        if (err) sys.addError(request, err);
        else sys.addMessage(request, 'Impression deleted');
        
        response.redirect(request.baseUrl);
    });
});

// POST /impressions/bulk-delete
router.post('/bulk-delete', (request, response, next) => {
    console.log('/impressions/bulk-delete');
    var data   = request.body;
    var userId = String(request.session.id);
    
    var list   = data.bulkList2 ? String(data.bulkList2).split(',') : [];
    var len    = list.length;
    
    for (var i = 0; i < len; i++) {
        model.delete(kind, list[i], userId, function cb(err) {
            if (err) sys.addError(request, err);
            
            if (i == len-1) {
                sys.addMessage(request, len + ' Impression' + (len==1?'':'s') + ' deleted');
                response.redirect('/impressions'); // impressions list
            }
        });
    }
    sys.addMessage(request, len + ' Impression' + (len==1?'':'s') + ' deleted');
    response.redirect('/impressions');
});

// Errors on "/impressions/*" routes.
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
