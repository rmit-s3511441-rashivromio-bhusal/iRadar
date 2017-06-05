const model   = require('./model');
const sys     = require('./sys');
const express = require('express');
const router  = express.Router();

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

// GET /reports
router.get('/', (request, response, next) => {
    var userStore = String(request.session.store);
    var userRole  = String(request.session.role);
    var isAdmin   = userRole == 'admin';
    var storeAC   = isAdmin ? false : userStore; // Store Access Control
    
    // URL query parameters
    var start = request.query.start ? String(request.query.start) : null;
    var end   = request.query.end   ? String(request.query.end)   : null;
    
    model.query3('Impression', storeAC, function cb (err, impressionList) {
        if (err || !impressionList) {
            sys.addError(request, err);
            next();
            return;
        }
        
        model.query3('Beacon', storeAC, function cb (err, beaconList) {
            if (err || !beaconList) {
                sys.addError(request, err);
                next();
                return;
            }
            
            model.query3('Special', storeAC, function cb (err, specialList) {
                if (err || !specialList) {
                    sys.addError(request, err);
                    next();
                    return;
                }

                sys.sort(beaconList, 'unique_id');

                // Counts by Beacon
                var i, key, beacon, beaconsByUniqueID = {}, countsByBeacon = {}, beaconNames = [], beaconCounts = [], bubbleChartDataSet = [];
                for (i = 0; i < beaconList.length; i++) {
                    //countsByBeacon[String(beaconList[i].unique_id)] = 0;
                    beacon = beaconList[i];
                    beaconsByUniqueID[String(beacon.unique_id)] = {
                        'hits' : 0,
                        'lat'  : Number(beacon.lat),
                        'long' : Number(beacon.long),
                        'color': String(beacon.color)
                    };
                }
                for (i = 0; i < impressionList.length; i++) {
                    //countsByBeacon[String(impressionList[i].beacon)]++;
                    beaconsByUniqueID[String(impressionList[i].beacon)].hits++;
                }
                
                var barChartData = {
                    'labels'  : []
                };
                var barChartDataSet = {
                    'label': 'Hits per beacon',
                    'backgroundColor': [],
                    'data': []
                };
                var bubbleDatasets = [{
                    'label': '',
                    'data': [{ x: 0, y: 0, r: 1 },{ x: 60, y: 40, r: 1 }],
                    'backgroundColor': "#fff"
                }];
                
                for (key in beaconsByUniqueID) {
                    //beaconNames.push(String(key));
                    //beaconCounts.push(Number(countsByBeacon[key]));
                    barChartData.labels.push(String(key));
                    barChartDataSet.backgroundColor.push(String(beaconsByUniqueID[key].color));
                    barChartDataSet.data.push(String(beaconsByUniqueID[key].hits));
                    bubbleDatasets.push({
                        'label': String(key),
                        'data': [{ 
                            x: Number(beaconsByUniqueID[key].long),
                            y: Number(beaconsByUniqueID[key].lat),
                            r: Number(beaconsByUniqueID[key].hits)
                        }],
                        'backgroundColor': String(beaconsByUniqueID[key].color)
                    });
                }
                barChartData.datasets = [barChartDataSet];
                barChartData = JSON.stringify(barChartData);
                bubbleDatasets = JSON.stringify(bubbleDatasets);
                
                //beaconNames = JSON.stringify(beaconNames);
                //beaconCounts = JSON.stringify(beaconCounts);

                
                
                
                // Hits per month
                var monthsList = [], countsByMonth = {}, month, monthNames = [], monthCounts = [];
                var MAX = 6;
                var oneMonth = 2628000000;
                var monthNumbers = ['01','02','03','04','05','06','07','08','09','10','11','12'];
                var monthNameLookup = {'01':'January','02':'February','03':'March','04':'April','05':'May','06':'June',
                                       '07':'July','08':'August','09':'September','10':'October','11':'November','12':'December'};
                var date = new Date();
                for (i = 0; i < MAX; i++) {
                    monthsList.push(date.getFullYear()+'-'+monthNumbers[date.getMonth()]);
                    date = new Date(date.getTime()-oneMonth);
                }
                monthsList.reverse();
                for (i = 0; i < monthsList.length; i++) {
                    countsByMonth[String(monthsList[i])] = 0;
                }
                for (i = 0; i < impressionList.length; i++) {
                    month = impressionList[i].created_on.substring(0,7); // YYYY-MM
                    if (countsByMonth[month] !== undefined)
                        countsByMonth[month]++;
                }
                for (key in countsByMonth) {
                    monthNames.push(String(key));
                    monthCounts.push(Number(countsByMonth[key]));
                }
                for (i = 0; i < monthNames.length; i++) {
                    monthNames[i] = monthNameLookup[monthNames[i].substring(5)];
                }
                monthNames = JSON.stringify(monthNames);
                monthCounts = JSON.stringify(monthCounts);
                
                /*/ Bubble Chart - Hits by Location
                {
            label: '',
            data: [{ x: 0, y: 0, r: 1 },{ x: 60, y: 40, r: 1 }],
            backgroundColor: "#fff"
        },{
            label: 'Beacon 1',
            data: [{ x: 20, y: 30, r: 15 }],
            backgroundColor: "#66ff66"
        }*/
                
                var messages = sys.getMessages(request);

                response.render('reports.pug', {
                    user: {
                        id      : String(request.session.id),
                        name    : String(request.session.name),
                        initials: String(request.session.initials),
                        image   : String(request.session.image),
                        role    : String(request.session.role),
                        store   : String(request.session.store),
                        token   : String(request.session.token)
                    },
                    pageTitle   : 'iRadar - Reports',
                    pageId      : 'reports',
                    barChartData: barChartData,
                    bubbleDatasets: bubbleDatasets,
                    monthNames  : monthNames,
                    monthCounts : monthCounts,
                    messages    : messages
                });
            });
        });
    });
});

// Errors on "/reports/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
