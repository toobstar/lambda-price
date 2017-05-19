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

    var mydb = cloudant.db.use(dbname);
    //console.log("mydb", mydb);

    mydb.list().then(function(data) {
        console.log("list", data);
        processStockForDb(stockEntry, mydb);
    }).catch(function(err) {
        console.log('something went wrong - trying to create', err);
        cloudant.db.create(dbname, function(err, data) {
            console.log("Error:", err);
            console.log("Data:", data);
            mydb = cloudant.db.use(dbname);
            //callback(err, data);
            processStockForDb(stockEntry, mydb);
        });
    })
}

function processStockForDb(stockEntry, db) {
    console.log('processStockForDb', stockEntry);
    var priceDate = stockEntry.date;
    //var priceClose = stockEntry.close;
    //var priceHigh = stockEntry.high;
    //var priceLow = stockEntry.low;
    //var priceSplit = stockEntry.split;
    //var priceVolume = stockEntry.volume;
    //console.log('priceDate', priceDate);
    //console.log('priceClose', priceClose);
    //console.log('priceHigh', priceHigh);
    //console.log('priceLow', priceLow);
    //console.log('priceSplit', priceSplit);
    //console.log('priceVolume', priceVolume);

    db.get(priceDate, { revs_info: true }, function(err, body) {
        //console.log("check existing", err, body);
        if (!err) {
            console.log("value already existing");
            showAll(db);
        }
        else {
            insertPrice(stockEntry, db);
        }
    });
}

function insertPrice(stockEntry, db) {
    console.log("insertPrice", stockEntry);
    var priceDate = stockEntry.date;
    db.insert(stockEntry, priceDate, function(err, body, header) {
        if (err) {
            return console.log('insert error ', err.message);
        }
        console.log('you have inserted stockEntry.', body);
        showAll(db);
    });
}

function showAll(db) {

    console.log('fetch one');
    db.get('2017-05-18', { revs_info: true }, function(err, body) {
        console.log('fetch one', err, body);
    });

    console.log('showAll');
    db.list(function(err, body) {
        if (!err) {
            //console.log('showAll body', body);
            body.rows.forEach(function(doc) {
                console.log('doc', doc);
                console.log('val ', doc.value);

                var p = doc.value;
                for (var key in p) {
                    if (p.hasOwnProperty(key)) {
                        console.log(key + " -> " + p[key]);
                    }
                }
            });
        }
        else {
            return console.log('list error ', err);
        }
    });
}

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