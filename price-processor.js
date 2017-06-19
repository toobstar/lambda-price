require('dotenv').load();

module.exports = {
    process: function (resJson, cloudant) {
        processResult(resJson, cloudant);
    },
    processBulk: function (resJson, cloudant) {
        processBulk(resJson, cloudant);
    },
};

// resJson>> [{ticker: "CBA", dataArray: [{"ticker":"CBA","date":"2017-06-14","close":"82.30"}, {"ticker":"CBA","date":"2017-06-15","close":"82.30"}]}
function processBulk(resJson, cloudant) {
    cloudant.db.list().then(function(existingDbs) {

        var ticker = resJson.ticker;
        var dataArray = resJson.dataArray;

        //if (ticker != 'BHP' && ticker != 'CBA' && ticker != 'COH' && ticker != 'ANZ' && ticker != 'TCL') {
        if (ticker != 'CBA') {
            return; // limit tickers for now
        }

        if (!ticker) {
            console.log('missing ticker in input for ', resJson);
            return;
        }
        processEntry(cloudant, ticker, existingDbs, dataArray);

    }).catch(function(err) {
        console.log('db list error ', err);
    });
}

// resJson>> [{"ticker":"CBA","date":"2017-06-14","close":"82.30","high":"82.30","low":"81.30","split":"","volume":5736170},{"ticker":"BHP","date":"2017-06-14","close":"82.30","high":"82.30","low":"81.30","split":"","volume":5736170}]
function processResult(resJson, cloudant) {
    var count = 0;
    cloudant.db.list().then(function(existingDbs) {
        resJson.forEach(function(stockEntry) {

            var dataForSingleDate = stockEntry;
            var ticker = stockEntry.ticker;

            //if (ticker != 'BHP' && ticker != 'CBA' && ticker != 'COH' && ticker != 'ANZ' && ticker != 'TCL') {
            //if (ticker != 'CBA') {
            //    return; // limit tickers for now
            //}

            if (!ticker) {
                console.log('missing ticker in input for ', resJson);
                return;
            }
            count++;
            setTimeout(function(){
                processEntry(cloudant, ticker, existingDbs, [dataForSingleDate]);
            }, count * 100);

        });
    }).catch(function(err) {
        console.log('db list error ', err);
    });
}

function processEntry(cloudant, ticker, existingDbs, stockEntry) {
    var dbname = 'stock_' + ticker.toLowerCase();

    if (existingDbs.indexOf(dbname) > -1) {
        console.log('dbname-existing', dbname);
        var db = cloudant.db.use(dbname);
        processStockForDb(stockEntry, db);
    }
    else {
        console.log('dbname-creating', dbname);
        cloudant.db.create(dbname).then(function (data) {
            console.log("create result", dbname, data);
            db = cloudant.db.use(dbname);
            var security = {
                nobody: [],
                hologratchartheshourster: ['_reader', '_replicator'],
                toobstar: ['_reader', '_writer', '_admin', '_replicator'],
                apiKey: ['_reader', '_writer', '_admin', '_replicator']
            };
            db.set_security(security, function (er, result) {
                if (er) {
                    throw er;
                }
                console.log("set_security result", result);
                processStockForDb(stockEntry, db);
            });
        }).catch(function (err) {
            console.log('create db error ', dbname, err);
        });
    }
}

function processStockForDb(updatedPriceArray, db) {
    console.log('processStockForDb', updatedPriceArray  );
    db.get(dataKey()).then(function(data) {
        var existingPriceArray = data.dataArray;
        if (existingPriceArray) {
            console.log("values already existing", data.dataArray.length);
            existingPriceArray = data.dataArray;
        }
        else {
            console.log("creating new data array");
        }

        var existingPriceMap = existingPriceArray.reduce(function(result, item) {
            //console.log("switch data to be mapped by key", item.date);
            result[item.date] = item;
            return result;
        }, {});

        // overwrite existing from input
        updatedPriceArray.forEach(function(elem) {
            console.log("testing ", elem.close, typeof elem.close);
            if (typeof elem.close != "number") {
                elem.close = parseFloat(elem.close);
            }
            var existingEntry = existingPriceMap[elem.date];
            if (!existingEntry) {
                existingEntry = {};
                existingPriceMap[elem.date] = existingEntry;
                existingEntry.date = elem.date;
                existingEntry.close = elem.close;
                console.log("adding ", existingEntry);
            }
            else {
                if (elem.close !== existingEntry.close) {
                    existingEntry.close = elem.close;
                    console.log("overwriting with update", existingEntry);
                }
            }

        });

        // turn updated existingPriceMap back into dataArray
        var updatedDataArray = [];
        for (var date in existingPriceMap) {
            if (existingPriceMap.hasOwnProperty(date)) {
                updatedDataArray.push(existingPriceMap[date]);
            }
        }
        data.dataArray = updatedDataArray;

        insertPrice(data, db);
    }).catch(function(err) {
        var data = {};
        data.dataArray = updatedPriceArray;
        console.log("nothing existing so initialising data from input ", data);
        insertPrice(data, db);
    });
}

function dataKey() {
    return 'priceData';
}
function insertPrice(stockEntry, db) {
    var pk = dataKey();
    console.log("insertPrice stockEntry", pk, stockEntry.dataArray.length);
    db.insert(stockEntry, pk).then(function(data) {
        //console.log('you have inserted stockEntry.', data);
    }).catch(function(err) {
        console.log('insert error ', err);
    });
}
