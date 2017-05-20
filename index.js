require('dotenv').load();

var Cloudant = require('cloudant');
var PriceService = require('price-service');

var username = process.env.cloudant_username;
var password = process.env.cloudant_password;
var priceUrl = process.env.priceUrl;

function processResult(resJson, cloudant) {

    cloudant.db.list().then(function(existingDbs) {
        resJson.forEach(function(stockEntry) {
            var ticker = stockEntry.ticker;
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
                    processStockForDb(stockEntry, db);
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
    console.log("insertPrice", pk, stockEntry);
    db.insert(stockEntry, pk).then(function(data) {
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
    var priceService = PriceService();

    priceService.fetch(priceUrl, function(result) {
        processResult(result, cloudant);
    })

    if (callback) {
        callback(null, event);
    }
    // callback( 'some error type' );
};

exports.handler(); // just for local testing