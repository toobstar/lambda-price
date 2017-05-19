require('dotenv').load();

var Cloudant = require('cloudant');
var PriceService = require('price-service');

var username = process.env.cloudant_username;
var password = process.env.cloudant_password;
var priceUrl = process.env.priceUrl;

function processBody(resJson, cloudant) {
    for (var ticker in resJson) {
        if (resJson.hasOwnProperty(ticker)) {
            console.log(ticker);
            var stockEntry = resJson[ticker];
            stockEntry.ticker = ticker;
            processStock(stockEntry, cloudant);
        }
    }
}

function processStock(stockEntry, cloudant) {
    var ticker = stockEntry.ticker;

    //if (ticker != 'NZM') {
    //    return;
    //}

    var dbname = 'stock_'+ticker.toLowerCase();
    console.log('processStock', dbname);

    var db = cloudant.db.use(dbname);

    db.list().then(function(data) {
        console.log("list", data);
        processStockForDb(stockEntry, db);
    }).catch(function(err) {
        console.log('something went wrong - trying to create', err);

        cloudant.db.create(dbname).then(function(data) {
            console.log("create result", dbname, data);
            db = cloudant.db.use(dbname);
            processStockForDb(stockEntry, db);
        }).catch(function(err) {
            console.log('create db error ', dbname, err);
        });
    })

}

function processStockForDb(stockEntry, db) {
    console.log('processStockForDb', stockEntry);
    var pk = priceKey(stockEntry);
    db.get(pk).then(function(data) {
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

//function showAll(db) {
//
//    console.log('fetch one');
//    db.get('2017-05-18', { revs_info: true }, function(err, body) {
//        console.log('fetch one', err, body);
//    });
//
//    console.log('showAll');
//    db.list(function(err, body) {
//        if (!err) {
//            //console.log('showAll body', body);
//            body.rows.forEach(function(doc) {
//                console.log('doc', doc);
//                console.log('val ', doc.value);
//
//                var p = doc.value;
//                for (var key in p) {
//                    if (p.hasOwnProperty(key)) {
//                        console.log(key + " -> " + p[key]);
//                    }
//                }
//            });
//        }
//        else {
//            return console.log('list error ', err);
//        }
//    });
//}

exports.handler = function (event, context, callback) {
    //console.log('Running index.handler');
    //console.log('==================================');
    //console.log('event', event);
    //console.log('context', context);
    //console.log('callback', callback);
    //console.log('==================================');
    //console.log('Stopping index.handler');

    console.log('config', username, password, priceUrl);
    var cloudant = Cloudant({account:username, password:password, plugin:'promises'});

    var priceService = PriceService();
    priceService.fetch(priceUrl, function(result) {
        processBody(result, cloudant);
    })

    if (callback) {
        callback(null, event);
    }
    // or
    // callback( 'some error type' );
};

exports.handler();