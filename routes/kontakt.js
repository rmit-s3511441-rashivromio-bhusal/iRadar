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

/*/ Check for valid session
router.use((request, response, next) => {
    if (request.session && request.session.id)
        next();
    else
        response.redirect('/login');
});*/





// GET /kontakt/import  Import from Kontakt.io portal
router.get('/beacons', (request, response) => {
    
    var limit = 100;
    var orderBy = 'unique_id';
    var token = request.query.pageToken;
    
    // Get a list of existing Beacons with the id and uniqueId for matching later
    model.list('Beacon', limit, orderBy, token, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        
        // Populate the list
        var idList = {};
        for (var i = 0; i < entities.length; i++) {
            if (entities[i] && entities[i].unique_id) {
                idList[String(entities[i].unique_id)] = String(entities[i].id);
            }
        }
        
        //console.log('idList1: ' + JSON.stringify(idList));
        
        var endpoint = 'https://api.kontakt.io/device?deviceType=BEACON';
        
        rest.get(endpoint, args, function (data, response) {
            
            //console.log('idList2: ' + JSON.stringify(idList));
            
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
                obj.store         = (beacon.venue && beacon.venue.id) ? String(beacon.venue.id) : '(unassigned)';
                obj.minor         = Number(beacon.minor);
                obj.major         = Number(beacon.major);
                obj.actions_count = Number(beacon.actionsCount);
                obj.alias         = beacon.alias ? String(beacon.alias) : '';
                obj.kontakt_id    = String(beacon.id);
                obj.uuid          = String(beacon.secureProximity);
                //obj.shuffled      = Boolean(beacon.shuffled);
                //obj.interval      = Number(beacon.interval);
                //obj.order_id      = String(beacon.orderId);
                //obj.metadata      = (beacon.metadata) ? JSON.stringify(beacon.metadata) : '';
                //obj.ibeacon       = beacon.profiles.indexOf("IBEACON") > -1;
                //obj.txPower       = String(beacon.txPower);
                //obj.mac           = String(beacon.mac);
                //obj.firmware      = String(beacon.firmware);
                //obj.instanceId    = String(beacon.instanceId);
                //obj.model         = String(beacon.model);
                //obj.deviceType    = String(beacon.deviceType);
                //obj.eddystone     = beacon.profiles.indexOf("EDDYSTONE") > -1;
                //obj.specification = String(beacon.specification);
                //obj.url           = 'http://' + String(new Buffer(String(beacon.url), 'hex').toString('utf8')).replace('\u0002', '');
                //obj.tags          = (beacon.tags) ? beacon.tags.join(', ') : '';
                //obj.namespace     = String(beacon.namespace);
                
                model.update('Beacon', id, obj, function cb (err, savedData) {
                    //console.log('savedData: ' + JSON.stringify(savedData));
                    if (i == (beacons.length - 1)) {
                        response.redirect('/home');
                    }
                });
            } // end of for loop
        });
    });
});

// GET /kontakt/specials
router.get('/specials', (request, response, next) => {
    
    model.read('Beacon', id, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        
        // Get a list of existing Specials with id and kontaktId for matching later
        var filters = [['beacon', String(entity.unique_id)]];
        
        model.query('Special', filters, (err, entities, nextQuery) => {
            if (err) {
                console.error('runQuery error: ' + err);
                return;
            }
            
            // Populate the list
            var idList = {};
            for (var i = 0; i < entities.length; i++) {
                if (entities[i].kontakt_id) {
                    idList[String(entities[i].kontakt_id)] = Number(entities[i].id);
                }
            }
            
            const endpoint = 'https://api.kontakt.io/action?uniqueId=' + entity.unique_id;
            const store = entity.store ? String(entity.store): '(no store))';
            
            rest.get(endpoint, args, function (data, response) {
                data = JSON.parse(data.toString());
                var specials = data.actions || [];
                
                for (var i = 0; i < specials.length; i++) {
                    var special = specials[i];
                    
                    var id = null;
                    if (idList[specials.id]) {
                        id = Number(idList[specials.id]);
                    }
                    
                    var obj = {};
                    obj.active     = true;
                    obj.proximity  = special.proximity;
                    obj.kontakt_id = special.id;
                    obj.url        = special.url;
                    obj.beacon     = String(entity.unique_id);
                    obj.store      = store;
                    
                    model.update('Special', id, obj, function cb (err, savedData) {
                        //console.log('savedData: ' + JSON.stringify(savedData));
                    });
                } // end of for loop
            });
        });
    });
});


router.get('/stores', function (request, response, next) {
    
    var kind    = 'Store';
    var limit   = 100;
    var orderBy = 'name';
    var token   = request.query.pageToken;
    
    // Get a list of existing Beacons with the id and uniqueId for matching later
    model.list(kind, limit, orderBy, token, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        
        // Populate the list
        var idList = {};
        for (var i = 0; i < entities.length; i++) {
            if (entities[i] && entities[i].kontakt_id) {
                idList[String(entities[i].kontakt_id)] = Number(entities[i].id);
            }
        }
        
        console.log('Stores idList1: ' + JSON.stringify(idList));
        
        var endpoint = 'https://api.kontakt.io/venue';
        
        rest.get(endpoint, args, function (data, response) {
            
            data = JSON.parse(data.toString());
            stores = data.venues || [];
            
            for (var i = 0; i < stores.length; i++) {
                var store = stores[i];
                
                var id = null;
                if (idList[store.id]) {
                    id = Number(idList[store.id]);
                }
                
                var obj = {};
                obj.active        = true;
                obj.name          = String(store.name);
                obj.description   = String(store.description);
                obj.kontakt_id    = String(store.id);
                obj.devices_count = Number(store.devicesCount);
                
                model.update(kind, id, obj, function cb (err, savedData) {
                    if (i == (stores.length - 1)) {
                        response.redirect('/home');
                    }
                });
            } // end of for loop
        });
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
