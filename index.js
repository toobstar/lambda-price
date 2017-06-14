require('dotenv').load();

var Cloudant = require('cloudant');
var PriceService = require('price-service');

var username =    process.env.cloudant_username;
var password =    process.env.cloudant_password;
var apiKey =      process.env.cloudant_api_key;
var apiPassword = process.env.cloudant_api_password;
var priceUrl =    process.env.priceUrl;

function processResult(resJson, cloudant) {

    cloudant.db.list().then(function(existingDbs) {
        resJson.forEach(function(stockEntry) {
            var ticker = stockEntry.ticker;

            //if (ticker != 'BHP' && ticker != 'CBA' && ticker != 'COH' && ticker != 'ANZ' && ticker != 'TCL') {
            //    return; // limit tickers for now
            //}

            var dbname = 'stock_'+ticker.toLowerCase();

            if (existingDbs.indexOf(dbname) > -1) {
                console.log('dbname-existing', dbname);
                var db = cloudant.db.use(dbname);
                processStockForDb(stockEntry, db);
            }
            else {
                console.log('dbname-creating', dbname);
                cloudant.db.create(dbname).then(function(data) {
                    console.log("create result", dbname, data);
                    db = cloudant.db.use(dbname);
                    var security = {
                        nobody: [],
                        hologratchartheshourster: ['_reader', '_replicator'],
                        toobstar : [ '_reader' , '_writer', '_admin', '_replicator' ],
                        apiKey : [ '_reader' , '_writer', '_admin', '_replicator' ]
                    };
                    db.set_security(security, function(er, result) {
                        if (er) {
                            throw er;
                        }
                        console.log("set_security result", result);
                        processStockForDb(stockEntry, db);
                    });
                }).catch(function(err) {
                    console.log('create db error ', dbname, err);
                });
            }
        });
    }).catch(function(err) {
        console.log('db list error ', err);
    });
}

function processStockForDb(stockEntry, db) {
    console.log('processStockForDb', stockEntry);
    db.get(priceKey(stockEntry)).then(function(data) {
        console.log("value already existing");
        completeForStock(stockEntry, db);
    }).catch(function(err) {
        insertPrice(stockEntry, db);
    });
}

function priceKey(stockEntry) {
    return 'price_' + stockEntry.date;
}
function insertPrice(stockEntry, db) {
    var pk = priceKey(stockEntry);
    var minData = {}; // transform high/low/close JSON to minimal data needed
    minData.date = stockEntry.date;
    minData.close = stockEntry.close;
    if (stockEntry.split && stockEntry.split.length  > 0) {
        minData.split = stockEntry.split;
    }

    console.log("insertPrice", pk, minData);
    db.insert(minData, pk).then(function(data) {
        console.log('you have inserted stockEntry.', data);
        completeForStock(stockEntry, db);
    }).catch(function(err) {
        console.log('insert error ', err);
        completeForStock(stockEntry, db);
    });
}

function completeForStock(stockEntry, db) {
    var pk = priceKey(stockEntry);
    console.log('completeForStock', pk);
    db.get(pk).then(function(data) {
        console.log('validating', data);
    }).catch(function(err) {
        console.log('something went wrong', err);
    });
}

exports.handler = function (event, context, callback) {

    console.log('config', username, password, priceUrl);

    var cloudant = Cloudant({account:username, password:password, plugin:'promises'});
    //var cloudant = Cloudant({account:username, key:apiKey, password:apiPassword, plugin:'promises'});
    var priceService = PriceService();

    priceService.fetch(priceUrl, function(result) {
        processResult(result, cloudant);
    })

    if (callback) {
        callback(null, event);
    }
    // callback( 'some error type' );
};

//exports.handler(); // just for local testing