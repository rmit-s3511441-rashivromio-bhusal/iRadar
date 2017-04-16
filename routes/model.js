'use strict';

const Datastore = require('@google-cloud/datastore');
const config = require('./config');
  
const ds = Datastore({
    projectId: String(config.projectId)
});

/*
 * Translates from Datastore's entity format to the format expected by the application
 * 
 * Datastore format: 
 * {
 *     key: [kind, id],
 *     data: {
 *         property: value
 *     }
 * }
 *
 * Application format:
 * {
 *     id: id,
 *     property: value
 * }
 */
function fromDatastore (obj) {
    obj.data.id = obj.key.id;
    return obj.data;
}

/*
 * Translates from the application's format to the datastore's
 * extended entity property format. It also handles marking any
 * specified properties as non-indexed. Does not translate the key.
 *
 * Application format:
 * {
 *     id: id,
 *     property: value,
 *     unindexedProperty: value
 * } 
 *
 * Datastore extended format:
 * [
 *     {
 *         name: property,
 *         value: value
 *     },{
 *         name: unindexedProperty,
 *         value: value,
 *         excludeFromIndexes: true
 *     }
 * ]
 */
function toDatastore (obj, nonIndexed) {
    nonIndexed = nonIndexed || [];
    const results = [];
    Object.keys(obj).forEach((k) => {
        if (obj[k] === undefined) {
            return;
        }
        results.push({
            name: k,
            value: obj[k],
            excludeFromIndexes: nonIndexed.indexOf(k) !== -1
        });
    });
    return results;
}

// Lists all Entities in the Datastore sorted alphabetically by orderBy.
// The "limit" argument determines the maximum amount of results to
// return per page. The "token" argument allows requesting additional
// pages. The callback is invoked with "(err, entity, nextPageToken)".
function list (kind, limit, orderBy, token, cb) {
    const q = ds.createQuery([kind])
        .limit(limit)
        .order(orderBy)
        .start(token);
    
    ds.runQuery(q, (err, entities, nextQuery) => {
        if (err) {
            cb(err);
            return;
        }
        const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
        cb(null, entities.map(fromDatastore), hasMore);
    });
}

function read (kind, id, cb) {
    const key = ds.key([kind, parseInt(id, 10)]);
    ds.get(key, (err, entity) => {
        if (err) {
            cb(err);
            return;
        }
        if (!entity) {
            cb({
                code: 404,
                message: 'Not found'
            });
            return;
        }
        cb(null, fromDatastore(entity));
    });
}

// Creates a new entity or updates an existing entity with new data. The provided
// data is automatically translated into Datastore format. The entity will be
// queued for background processing.
function update (kind, id, newData, cb) {
    
    console.log('update('+kind+', '+id+', '+JSON.stringify(newData)+')');
    
    var nonIndexedFields = [];
    if (kind == 'Beacon')
        nonIndexedFields = ['actions_count', 'kontakt_id', 'last_sync', 'order_id', 'shuffled', 'created_on', 'updated_on'];
    else if (kind == 'Special')
        nonIndexedFields = ['proximity', 'url', 'created_on', 'updated_on'];
    else if (kind == 'Property')
        nonIndexedFields = ['type', 'value', 'created_on', 'updated_on'];
    else if (kind == 'Store')
        nonIndexedFields = ['description', 'devices_count', 'created_on', 'updated_on'];
    else if (kind == 'User')
        nonIndexedFields = ['avatar', 'bad_passwords', 'image', 'last_login', 'locked_out', 'password', 'password_needs_reset', 'created_on', 'updated_on'];
    else if (kind == 'Impression')
        nonIndexedFields = ['created_on', 'updated_on'];
        
    if (newData.id) {
        delete newData.id; // do not save id into a non-key field
    }
    
    newData.updated_on = new Date();
    
    if (id) {
        read(kind, id, function (err, currentData) {
            if (err) {
                cb(err);
                return;
            }

            for (var prop in newData) {
                if (currentData[prop] != newData[prop]) {
                    // log change
                    currentData[prop] = newData[prop];
                }
            }
            
            if (currentData.id) {
                delete currentData.id; // do not save id into a non-key field
            }
            
            let key = ds.key([kind, parseInt(id, 10)]);

            const entity = {
                key: key,
                data: toDatastore(currentData, nonIndexedFields)
            };
            //console.log('entity: '+JSON.stringify(entity)+')');
            ds.save(entity, (err) => {
                if (err)
                    cb(err);
                else
                    read(kind, id, cb);
            });
        });
    } else {
        
        let key = ds.key(kind);
        const entity = {
            key: key,
            data: toDatastore(newData, nonIndexedFields)
        };

        ds.save(entity, (err) => {
            cb(err, err ? null : newData);
        });
    }
}
/*
function update2 (id, data, cb) {
  let key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['description'])
  };

  ds.save( entity, (err) => {
      data.id = entity.key.id;
      cb(err, err ? null : data);
    }
  );
}
*/
function create (kind, data, cb) {
    if (data) {
        data.created_on = new Date();
    }
    update(kind, null, data, cb);
}

function _delete (kind, id, cb) {
    const key = ds.key([kind, parseInt(id, 10)]);
    ds.delete(key, cb);
}

function get (kind, property, value, callback) {
    if (!kind || !property || !callback) {
        console.log('get parameters incomplete');
        return null;
    }
    
    var query = ds.createQuery([kind]).filter(property, '=', value).limit(1);
    
    ds.runQuery(query, (err, entities, nextQuery) => {
        if (err) {
            console.error(err);
            callback(null);
        } else if (!entities[0]) {
            console.log('no result from get');
            callback(null);
        } else {
            callback(fromDatastore(entities[0]));
        }
    });
}

function query (kind, filters, callback) {
    console.log('query('+kind+', '+filters+')');
    var query = ds.createQuery(kind);
    
    for (var i = 0; i < filters.length; i++) {
        query.filter(filters[i][0], '=', filters[i][1]);
        console.log('query.filter('+filters[i][0]+'='+filters[i][1]+')');
    }
    
    ds.runQuery(query, function (err, entities, nextQuery) {
        if (err) {
            console.error('runQuery error: ' + err);
            callback(err);
        } else if (!entities[0]) {
            callback(null, null);
        } else {
            callback(null, entities.map(fromDatastore));
        }
    });
}

module.exports = {
    create,
    read,
    update,
    delete: _delete,
    list,
    get,
    query
};
