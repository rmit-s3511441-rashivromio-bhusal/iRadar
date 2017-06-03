const bodyParser = require('body-parser');
const express    = require('express');
const router     = express.Router();
const model      = require('./model');
const userId     = '5692462144159744'; // Rashiv
const sys        = require('./sys');

router.use(bodyParser.json());

// GET /api/beacon-specials?major=12345&minor=54321
router.get('/', (request, response, next) => {
    
    var major = request.query.major ? String(request.query.major) : null;
    var minor = request.query.minor ? String(request.query.minor) : null;
    
    if (!major || !minor) {
        response.status(400).json({
            "error": "'major' and 'minor' query parameters must be present.",
            "details": "Example: https://iradar-dev.appspot.com/api/beacon-specials?major=00000&minor=11111"
        });
        return;
    }
    
    // Look up the Beacon
    var beaconFilters = [['active','=',true],['major','=',major],['minor','=',minor]];
    model.query2('Beacon', beaconFilters, function cb (err, beacons) {
        if (err) {
            response.status(500).json({
                "error": String(err)
            });
            return;
        }
        
        if (!beacons || !beacons[0]) {
            response.status(401).json({
                "error": "No Beacon found",
                "details": "No active Beacon matched the major and minor values that were provided.\nMajor: " + major + "\nMinor: " + minor
            });
            return;
        }
        
        var beaconId = String(beacons[0].id);
        var uniqueId = String(beacons[0].unique_id);
        
        // Look up the Specials - Cannot have filters one start and end dates
        // Error: Cannot have inequality filters on multiple properties: [end, start]
        var specialFilters = [['beacon','=',beaconId],['active','=',true]];
        model.query2('Special', specialFilters, function cb (err, specials) {
            if (err) {
                response.status(500).json({
                    "error": String(err)
                });
                return;
            }
            if (!specials) specials = [];
            
            var now = sys.getNow();
            
            var list = [], count = Number(specials.length), special;
            console.log('count: ' + count);
            for (var i = 0; i < count; i++) {
                special = specials[i];
                // Check date range
                if (special.start < now && special.end > now) {
                    list.push({
                        'id'       : String(special.id),
                        'name'     : String(special.name),
                        'proximity': String(special.proximity),
                        'url'      : String(special.url),
                        'beacon'   : uniqueId
                    });
                }
            }
            console.log('list: ' + JSON.stringify(list));
            
            response.status(200).json({
                "specials": list,
                "count"   : Number(list.length),
                'beacon'  : uniqueId
            });
        });
    });
});

// Basic 404 handler
router.use((request, response) => {
    response.status(404).json({
        "error": "Endpoint not found"
    });
});

// Errors on "/api/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;