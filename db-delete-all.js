require('dotenv').load();

var Cloudant = require('cloudant');

var username =    process.env.cloudant_username;
var password =    process.env.cloudant_password;

exports.handler = function () {
    var cloudant = Cloudant({account:username, password:password, plugin:'promises'});
    cloudant.db.list(function(err, body) {
        body.forEach(function(db) {
            console.log(db);
            //cloudant.db.destroy(db).then(function (data) {
            //    console.log("destroy result",  data);
            //}).catch(function (err) {
            //    console.log('destroy db error ',  err);
            //});
        });
    });
};

exports.handler();