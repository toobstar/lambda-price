require('dotenv').load();

var Cloudant = require('cloudant');
var PriceService = require('price-service');
var Processor = require('./price-processor');

var username =    process.env.cloudant_username;
var password =    process.env.cloudant_password;
//var apiKey =      process.env.cloudant_api_key;
//var apiPassword = process.env.cloudant_api_password;
var priceUrl =    process.env.priceUrl;

exports.handler = function (event, context, callback) {

    console.log('config', username, password, priceUrl);

    var cloudant = Cloudant({account:username, password:password, plugin:'promises'});
    //var cloudant = Cloudant({account:username, key:apiKey, password:apiPassword, plugin:'promises'});
    var priceService = PriceService();

    priceService.fetch(priceUrl, function(result) {
        Processor.process(result, cloudant);
    })

    if (callback) {
        callback(null, event);
    }
    // callback( 'some error type' );
};

//exports.handler(); // just for local testing