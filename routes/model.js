const sys       = require('./sys');
const Datastore = require('@google-cloud/datastore');
const config    = require('./config');
  
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
function update (kind, id, newData, userId, cb) {
    
    console.log('update('+kind+', '+id+', '+JSON.stringify(newData)+', '+userId+')');
    
    var nonIndexedFields = [];
    if (kind == 'User')
        nonIndexedFields = ['password'];
    /*
    else if (kind == 'Beacon')
        nonIndexedFields = [];
    else if (kind == 'Special')
        nonIndexedFields = [];
    else if (kind == 'Property')
        nonIndexedFields = [];
    else if (kind == 'Store')
        nonIndexedFields = [];
    else if (kind == 'Impression')
        nonIndexedFields = [];
    */
    
    if (newData.id) {
        delete newData.id; // do not save id into a non-key field
    }
    
    newData.updated_on = sys.getNow();
    newData.updated_by = userId;
    
    if (id) {
        read(kind, id, function (err, currentData) {
            if (err) {
                if (cb) {
                    cb(err);
                }
                return;
            }
            
            if (!currentData.created_on) {
                currentData.created_on = sys.getNow();
            }
            if (!currentData.created_by) {
                currentData.created_by = userId;
            }
            
            for (var prop in newData) {
                if (currentData[prop] != newData[prop]) {
                    /*/ log change
                    if (prop != 'created_on' && prop != 'created_by' && prop != 'updated_on' && prop != 'updated_by') {
                        create('Audit', {
                            'kind'     : String(kind),
                            'key'      : String(id),
                            'property' : String(prop),
                            'user'     : String(userId),
                            'new_value': String(newData[prop]),
                            'old_value': String(currentData[prop])
                        }, userId);
                    }*/
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
                if (err) {
                    if (cb) {
                        cb(err);
                    }
                } else {
                    read(kind, id, cb);
                }
            });
        });
    } else {
        
        let key = ds.key(kind);
        const entity = {
            key: key,
            data: toDatastore(newData, nonIndexedFields)
        };

        ds.save(entity, (err, a) => {
            // We don't know the id of the new Entity, so look up the last one to be created
            try {
                console.log('a: ' + a);
                console.log('a obj: ' + JSON.stringify(a));
            } catch (ex) {
                console.log(ex);
            }
            if (cb)
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

function create (kind, data, userId, cb) {
    console.log('INSERT');
    if (!data)
        data = {};
    if (!data.created_on)
        data.created_on = sys.getNow();
    if (!data.created_by)
        data.created_by = userId;
    
    update(kind, null, data, userId, cb);
}

function _delete (kind, id, userId, cb) {
    if (!kind || !id || !userId)
        return false;
    
    console.log('DELETE: Key(' + kind + ',' + id + ') by ' + userId);
    
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

function query2 (kind, filters, callback) {
    console.log('query2()');
    var query = ds.createQuery(kind);
    
    for (var i = 0; i < filters.length; i++) {
        var field    = filters[i][0];
        var operator = filters[i][1];
        var value    = filters[i][2];
        
        query.filter(field, operator, value);
        console.log('query.filter('+field+operator+value+')');
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

function query3 (kind, storeId, callback) {
    console.log('query3('+kind+','+storeId+')');
    
    var query = ds.createQuery(kind);
    
    // Add Store filter for Access Control
    if (storeId) {
        if (kind == 'Store')
            query.filter('id', '=', storeId);
        else
            query.filter('store', '=', storeId);
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
    query,
    query2,
    query3
};
