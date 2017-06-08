// Import Beacons from Kontakt.io portal
const bodyParser = require('body-parser');
const config     = require('./config');
const Client     = require('node-rest-client').Client;
const rest       = new Client();
const express    = require('express');
const router     = express.Router();
const sys        = require('./sys');
const model      = require('./model');
const args       = { headers: config.kontaktHeaders };

// Automatically parse request body as form data
router.use(bodyParser.urlencoded({ extended: false }));

// GET /kontakt/beacons 
router.get('/beacons', (request, response) => {
    
    var limit   = 100;
    var orderBy = 'unique_id';
    var token   = request.query.pageToken;
    var userId  = request.session.id;
    
    var beaconFilter = [];
    model.query('Beacon', beaconFilter, function cb (err, beacons) {
        if (err) return;
        if (!beacons) beacons = [];
        
        // Populate the list
        var idList = {};
        for (var i = 0; i < beacons.length; i++) {
            if (beacons[i] && beacons[i].unique_id) {
                idList[String(beacons[i].unique_id)] = String(beacons[i].id);
            }
        }
        
        var endpoint = 'https://api.kontakt.io/device?deviceType=BEACON';
        
        rest.get(endpoint, args, function (data, response) {
            
            data = JSON.parse(data.toString()); // re-parse because weird stuff - possibly different charset encoding
            
            beacons = data.devices || [];
            
            for (var i = 0; i < beacons.length; i++) {
                var beacon = beacons[i];
                
                var id = null;
                if (idList[beacon.uniqueId]) {
                    id = Number(idList[beacon.uniqueId]);
                }
                
                var obj = {};
                obj.active        = true;
                obj.unique_id     = String(beacon.uniqueId);
                obj.uuid          = String(beacon.secureProximity);
                obj.minor         = String(beacon.minor); // Storing as a Number will break queries
                obj.major         = String(beacon.major);
                
                model.update('Beacon', id, obj, userId, function cb (err, savedData) {
                    // noop
                });
            } // end of for loop
        });
        response.redirect('/beacons');
    });
});

// Errors on "/kontakt/*" routes.
router.use((err, request, response, next) => {
    // Format error and forward to generic error handler for logging and
    // responding to the request
    err.response = err.message;
    next(err);
});

module.exports = router;
