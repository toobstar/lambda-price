require('dotenv').load();

var Cloudant = require('cloudant');
var mysql = require("mysql");
var Processor = require('./price-processor');

var username =    process.env.cloudant_username;
var password =    process.env.cloudant_password;

var dbHost =    process.env.dbHost;
var dbUser =    process.env.dbUser;
var dbPass =    process.env.dbPass;
var dbDb =      process.env.dbDb;

exports.handler = function (event, context, callback) {

    console.log('config', dbHost, dbUser, dbDb);

    var cloudant = Cloudant({account:username, password:password, plugin:'promises'});

    var con = mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPass,
        database: dbDb
    });

    var ticker = 'CBA';
    var query = "select ticker, ROUND(closingPrice, 2) as close, LEFT(tradingDate , 10) as date, splitFactor as split " +
    "from CompanyDetails,CompanyEndOfDayPrice " +
    "where CompanyEndOfDayPrice.company_fk = CompanyDetails.id and ticker = '" + ticker + "';";

    con.query(query,function(err,result){
        if(err) throw err;
        //console.log('Data received from Db:');
        var jsonRes = [];
        result.forEach(function(item) {

            var priceObj = {date: item.date, close: item.close};
            if (item.split) {
                priceObj.split = item.split;
            }
            jsonRes.push(priceObj);

        });
        //console.log(jsonRes);
        Processor.processBulk({ticker:ticker, dataArray:jsonRes}, cloudant);
    });

    con.end(function(err) {
        // The connection is terminated gracefully
        // Ensures all previously enqueued queries are still
        // before sending a COM_QUIT packet to the MySQL server.
        if (err) {
            console.log('Connection end error', err);
        }
    });

    //

    if (callback) {
        callback(null, event);
    }
    // callback( 'some error type' );
};

exports.handler(); // just for local testing