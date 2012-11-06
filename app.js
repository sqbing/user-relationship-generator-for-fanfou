var express = require("express");
var util = require("util");
var OAuth = require("oauth").OAuth;
var redis = require("redis");
var app = express();

// Setting environment for local development
app.configure('development', function(){
    redisdb = {
        "hostname":"localhost",
        "host":"127.0.0.1",
        "port":6379,
        "password":"",
        "name":""
    }
});
// Setting environment for production online
app.configure('production', function(){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    redisdb = env['redis-2.2'][0]['credentials'];
});

app.use(express.static(__dirname+"/static"));

app.get("/", function(req, res){
    res.render(__dirname+"/template/index.jade", {"pageTitle":"index"});
});
app.get("/do_oauth", function(req, res){
    if(req.signedCookies.user){
        var client = redis.createClient(redisdb["port"], redisdb["host"]);
        client.on("error", function(err){
            util.puts("Redis error" + err);
            //TODO
            res.end();
        });
        client.hkey("users", "userID", req.signedCookies.user, function(error, reply){
            if(error){
                util.puts("User not logged in yet.");
                var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                                    "http://fanfou.com/oauth/access_token",
                                    "60648e4719285ec6fb437785e655bda5",
                                    "aed509928807eab4f1a615e4d422c724",
                                    "1.0",
                                    null,
                                    "HMAC-SHA1"
                                    );
                oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
                    if(error) 
                        util.puts('Get oauth token error :' + error);
                    else { 
                        util.puts('oauth_token :' + oauth_token);
                        util.puts('oauth_token_secret :' + oauth_token_secret);
                        // Save oauth_token&oauth_token_secret to db.
                        var client = redis.createClient(redisdb["port"], redisdb["host"]);
                        client.on("error", function (err) {
                            console.log("Redis error " + err);
                            // TODO
                            res.end();
                        });
                        client.hmset("oauth", "oauth_token", oauth_token, "oauth_token_secret", oauth_token_secret, redis.print);
                        client.quit();
                        // Open oauth url
                        res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback=fflog.ap01.aws.af.cm/oauth_callback");
                        res.end();
                    }
                });
            }
            else{
                // TODO Show fanfou log
                res.send("Authed");
                res.end();
            }
        });
        
        res.end();
        return;
    }
    else{
        var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                            "http://fanfou.com/oauth/access_token",
                            "60648e4719285ec6fb437785e655bda5",
                            "aed509928807eab4f1a615e4d422c724",
                            "1.0",
                            null,
                            "HMAC-SHA1"
                            );
        oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
            if(error) 
                util.puts('Get oauth token error :' + error);
            else { 
                util.puts('oauth_token :' + oauth_token);
                util.puts('oauth_token_secret :' + oauth_token_secret);
                // Save oauth_token&oauth_token_secret to db.
                var client = redis.createClient(redisdb["port"], redisdb["host"]);
                client.on("error", function (err) {
                    console.log("Redis error " + err);
                    // TODO
                    res.end();
                });
                client.hmset("oauth", "oauth_token", oauth_token, "oauth_token_secret", oauth_token_secret, redis.print);
                client.quit();
                // Open oauth url
                res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback=fflog.ap01.aws.af.cm/oauth_callback");
                res.end();
            }
        });
    }

});
app.get("/oauth_callback", function(req, res){
    var oauth_token = req.query.oauth_token;
    if(oauth_token == undefined){
        util.puts("Input params error, oauth_token:" + oauth_token);
        res.send("Are you kidding me?");
        res.end();
    }
    else{
        var client = redis.createClient(redisdb["port"], redisdb["host"]);
        client.on("error", function(err){
            util.puts("Redis error" + err);
            //TODO
            res.end();
        });
        client.hkeys("oauth", function (err, replies) {
            replies.forEach(function(reply, i){
                if(reply["oauth_token"] != oauth_token){
                    return;
                }
                else{
                    got_auth_token = 1;
                    //TODO Now try to fetch access token&secret, then get user info, and store in db.
                    var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                        "http://fanfou.com/oauth/access_token",
                        "60648e4719285ec6fb437785e655bda5",
                        "aed509928807eab4f1a615e4d422c724",
                        "1.0",
                        null,
                        "HMAC-SHA1"
                        );
                    oa.getOAuthAccessToken(reply["oauth_token"], reply["oauth_token_secret"], function(error, oauth_access_token, oauth_access_token_secret, results2){
                        if(error){
                            util.puts("Get access token error"+error);
                        }
                        else{
                            util.puts("oauth_access_token"+oauth_access_token);
                            util.puts("oauth_access_token_secret"+oauth_access_token_secret);
                            var userID = require("blueimp-md5").md5(oauth_access_token+oauth_access_token_secret);
                            res.cookie("userID", userID, {signed: true, maxAge: 900000});
                            client.hmset("users", "userID", userID, "oauth_access_token", oauth_access_token, "oauth_access_token_secret", oauth_access_token_secret, redis.print);
                        }
                    });

                }
            });
        });
        client.end();
        res.send("Authed");
        res.end();
    }

});

app.listen(process.env.VCAP_APP_PORT || 3000);
