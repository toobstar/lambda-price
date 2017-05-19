require('dotenv').load();

// Load the Cloudant library.
var Cloudant = require('cloudant');

// For development/testing purposes
exports.handler = function (event, context, callback) {
    console.log('Running index.handler');
    console.log('==================================');
    //console.log('event', event);
    //console.log('context', context);
    //console.log('callback', callback);
    console.log('==================================');
    //console.log('Stopping index.handler');

    var username = process.env.cloudant_username;
    var password = process.env.cloudant_password;

    var cloudant = Cloudant({account:username, password:password, plugin:'promises'});
    console.log('config', username, password);

    cloudant.db.list(function (err, allDbs) {
        console.log('All my databases: %s', allDbs)
    });

    var mydb = cloudant.db.use('alice');
    mydb.list().then(function(data) {
        console.log("list", data);
    }).catch(function(err) {
        console.log('something went wrong', err);
    });

    cloudant.db.destroy('alice', function(err) {
        console.log('destroy err', err);

        // Create a new "alice" database.
        cloudant.db.create('alice', function() {

            // Specify the database we are going to use (alice)...
            var alice = cloudant.db.use('alice');
            //console.log('alice', alice);

            // ...and insert a document in it.
            alice.insert({ crazy: true }, 'rabbit', function(err, body, header) {
                if (err) {
                    return console.log('[alice.insert] ', err.message);
                }

                console.log('You have inserted the rabbit.');
                console.log(body);
            });
        });
    });

    if (callback) {
        callback(null, event);
    }
    // or
    // callback( 'some error type' );
};

//exports.handler();