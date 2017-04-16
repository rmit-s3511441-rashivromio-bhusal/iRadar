module.exports = function (kind, orderBy) {
    
    const bodyParser = require('body-parser');
    const express    = require('express');
    const router     = express.Router();
    const model      = require('./model');
    
    router.use(bodyParser.json());
    
    // GET /api/kind
    router.get('/', (request, response, next) => {
        var limit = 100;
        var token = request.query.pageToken;
        
        model.list(kind, limit, orderBy, token, (err, entities, cursor) => {
            if (err) {
                next(err);
                return;
            }
            response.json({
                items: entities,
                nextPageToken: cursor
            });
        });
    });

    // POST /api/kind
    router.post('/', (request, response, next) => {
        
        var contentType = request.get('Content-Type');
        console.log('Content-Type: ' + contentType);
        if (!contentType) {
            response.status(400).json({
                "error": "'Content-Type' header must be present."
            });
            return;
        }
        
        model.create(kind, request.body, (err, entity) => {
            if (err) {
                next(err);
                return;
            }
            response.json(entity);
        });
    });

    // GET /api/kind/{id}
    router.get('/:id', (request, response, next) => {
        var id = request.params.id;

        model.read(kind, id, (err, entity) => {
            if (err) {
                next(err);
                return;
            }
            response.json(entity);
        });
    });

    // PUT /api/kind/{id}
    router.put('/:id', (request, response, next) => {
        var id   = request.params.id;
        var data = request.body;
        
        model.update(kind, id, data, (err, entity) => {
            if (err) {
                next(err);
                return;
            }
            response.json(entity);
        });
    });

    // DELETE /api/kind/{id}
    router.delete('/:id', (request, response, next) => {
        var id = request.params.id;

        model.delete(kind, id, (err) => {
            if (err) {
                next(err);
                return;
            }
            response.status(200).send('OK');
        });
    });

    // Basic 404 handler
    router.use((request, response) => {
        response.status(404).json({
            "error": "Endpoint not found"
        });
    });
    
    // Errors on "/api/kind/*" routes.
    router.use((err, request, response, next) => {
        // Format error and forward to generic error handler for logging and
        // responding to the request
        err.response = {
            message: err.message,
            internalCode: err.code
        };
        next(err);
    });
    
    return router;
};