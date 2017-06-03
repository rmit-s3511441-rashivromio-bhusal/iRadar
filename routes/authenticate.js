const expressJWT = require('express-jwt');
const jwt        = require('jsonwebtoken');
const config     = require('./config');
const bcrypt     = require('./bcrypt');
const express    = require('express');
const router     = express.Router();
const sys        = require('./sys');
const model      = require('./model');

// Set Content-Type for all responses for these routes
router.use((request, response, next) => {
    response.set('Content-Type', 'application/json')
    next();
}); 

// GET /authenticate
router.get('/', (request, response) => {
    console.log('/authenticate');
    
    var auth, username, password;
    
    // Extract the username and password from the headers
    auth = request.get('Authorization');
    if (auth) {
        auth = String(auth).replace('Basic ', '');
        auth = String(Buffer.from(auth, 'base64')); // decode base64
        var index = auth.indexOf(':');
        if (index != -1) {
            username = auth.substring(0, index);
            password = auth.substring(index+1);
        }
    }
    
    if (!username || !password) {
        response.status(401).json({
            "authenticated": false,
            "error": "Username and password must be provided."
        });
        return;
    }
    
    var filters = [['active', true],['user_name', username]];
    model.query('User', filters, function callback (err, entities) {
        console.log('callback('+err+', '+entities+')');
        try {
            console.log('entities: ' + JSON.stringify(entities));
        } catch (ex) {
            console.log(ex);
        }
        
        if (err) {
            console.error('runQuery error: ' + err);
            return;
        }
        
        var user;
        if (entities && entities[0]) {
            user = entities[0];
        }
        
        if (!user || !user.password) {
            response.status(401).json({
                "authenticated": false,
                "error": "Invalid username or password."
            });
            request.session = null;
            return;
        }
        
        /*
        bcrypt.cryptPassword(password, function(err, hash) {
            if (err)
                console.log('cryptPassword error: ' + err);
            else
                console.log('hash: ' + hash);
        });
        */
        
        if (user.locked_out) {
            response.status(401).json({
                "authenticated": false,
                "locked_out": true,
                "error": "Account is locked."
            });
            request.session = null;
            return;
        }
        
        if (user.password_needs_reset) {
            response.status(401).json({
                "authenticated": false,
                "password_needs_reset": true,
                "error": "Password needs to be reset."
            });
            request.session = null;
            return;
        }
        
        bcrypt.comparePassword(password, user.password, function(err, isPasswordMatch) {
        //var err = false, isPasswordMatch = true;
        
            if (err) {
                console.error('comparePassword error: ' + err);
                return;
            }
            
            if (isPasswordMatch) {
                // Authorised - Create a token
                var payload = {
                    "iss": String(user.id),
                    "name": user.first_name + ' ' + user.last_name
                };
                var options = {
                    "expiresIn": "12h"
                };
                var token = jwt.sign(payload, config.tokenSecret, options);
                //console.log('token: ' + token);
                
                if (!request.session) {
                    request.session = {};
                }
                
                request.session.id       = Number(user.id);
                request.session.name     = user.first_name + ' ' + user.last_name;
                request.session.initials = String(user.first_name.charAt(0) + user.last_name.charAt(0));
                request.session.image    = String(user.image) || null;
                request.session.token    = token;
                request.session.role     = String(user.role);
                request.session.store    = String(user.store);
                
                response.status(200).json({
                    "authenticated": true,
                    "token": token
                });
                
                var data = { last_login: String(sys.getNow()) };
                
                model.update('User', user.id, data, user.id, function(err, entity) {
                    // noop
                });
                
            } else {
                // Unauthorised
                response.status(401).json({
                    "authenticated": false,
                    "error": "Invalid username or password."
                });
                request.session = null;
            }
        }); // bcrypt
    });
});

module.exports = router;
