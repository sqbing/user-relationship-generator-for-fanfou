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
    };
    callback_url = "127.0.0.1:3000";
});
// Setting environment for production online
app.configure('production', function(){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    redisdb = env['redis-2.2'][0]['credentials'];
    callback_url = "fflog.ap01.aws.af.cm";
});
// Setting static middleware
app.use(express.static(__dirname+"/static"));
// Setting cookie signed key
app.use(express.cookieParser("godintheheaven"));

// Now are path handler
app.get("/", function(req, res){
    res.render(__dirname+"/template/index.jade", {"pageTitle":"index"});
});
app.get("/do_oauth", function(req, res){
    if(req.signedCookies){
        if(req.signedCookies.userID){
            util.puts("userID: "+req.signedCookies.userID);
            var client = redis.createClient(redisdb["port"], redisdb["host"]);
            client.on("error", function(err){
                util.puts("Redis error" + err);
                res.redirect("/404");
                client.quit();
                //TODO
                res.end();
            });
            client.hget("users", req.signedCookies.userID, function(error, reply){
                if(error || reply == null){
                    // If userID not found, reauth.
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
                        if(error) {
                            util.puts('Get oauth token error :' + error);
                            client.quit();
                            //res.send("Sorry, something is wrong, please mailto sqbing#gmail.com.");
                            res.redirect("/404");
                            res.end();
                        }
                        else { 
                            util.puts('oauth_token :' + oauth_token);
                            util.puts('oauth_token_secret :' + oauth_token_secret);
                            // Save oauth_token&oauth_token_secret to db.
                            //var client = redis.createClient(redisdb["port"], redisdb["host"]);
                            client.on("error", function (err) {
                                console.log("Redis error " + err);
                                // TODO
                                res.end();
                            });
                            client.hset("oauth", oauth_token, oauth_token_secret, redis.print);
                            client.quit();
                            // Open oauth url
                            res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+callback_url+"/oauth_callback");
                            res.end();
                        }
                    });
                }
                else{
                    // TODO userID found, show fanfou log
                    //res.send("Authed");
                    res.redirect("/show_log");
                    client.quit();
                    res.end();
                }
            });
        }
        else{
            util.puts("signedCookies.user not found");
            var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                            "http://fanfou.com/oauth/access_token",
                            "60648e4719285ec6fb437785e655bda5",
                            "aed509928807eab4f1a615e4d422c724",
                            "1.0",
                            null,
                            "HMAC-SHA1"
                            );
            oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
                if(error){ 
                    util.puts('Get oauth token error :' + error);
                    res.redirect("/404");
                    res.end();
                }
                else { 
                    util.puts('oauth_token :' + oauth_token);
                    util.puts('oauth_token_secret :' + oauth_token_secret);
                    // Save oauth_token&oauth_token_secret to db.
                    var client = redis.createClient(redisdb["port"], redisdb["host"]);
                    client.on("error", function (err) {
                        console.log("Redis error " + err);
                        res.redirect("/404");
                        client.quit();
                        // TODO
                        res.end();
                    });
                    client.hset("oauth", oauth_token, oauth_token_secret, redis.print);
                    client.quit();
                    // Open oauth url
                    res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+callback_url+"/oauth_callback");
                    client.quit();
                    res.end();
                }
            });

        }
    }
    else{
        util.puts("signedCookies not found");
        var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                            "http://fanfou.com/oauth/access_token",
                            "60648e4719285ec6fb437785e655bda5",
                            "aed509928807eab4f1a615e4d422c724",
                            "1.0",
                            null,
                            "HMAC-SHA1"
                            );
        oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
            if(error) {
                util.puts('Get oauth token error :' + error);
                res.redirect("/404");
                res.end();
            }
            else { 
                util.puts('oauth_token :' + oauth_token);
                util.puts('oauth_token_secret :' + oauth_token_secret);
                // Save oauth_token&oauth_token_secret to db.
                var client = redis.createClient(redisdb["port"], redisdb["host"]);
                client.on("error", function (err) {
                    console.log("Redis error " + err);
                    res.redirect("/404");
                    // TODO
                    res.end();
                    client.quit();
                });
                client.hset("oauth", oauth_token, oauth_token_secret, redis.print);
                client.quit();
                // Open oauth url
                res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback=fflog.ap01.aws.af.cm:3000/oauth_callback");
                res.end();
            }
        });
    }

});
app.get("/oauth_callback", function(req, res){
    var oauth_token = req.query.oauth_token;
    if(oauth_token == undefined){
        util.puts("Input params error, oauth_token:" + oauth_token);
        //res.send("Are you kidding me?");
        res.redirect("/404");
        res.end();
    }
    else{
        var client = redis.createClient(redisdb["port"], redisdb["host"]);
        client.on("error", function(err){
            util.puts("Redis error" + err);
            res.redirect("/404");
            res.end();
        });
        client.hget("oauth", oauth_token, function (err, reply) {
            if(err){
                util.puts("oauth_token not found");
                client.quit();
                //res.send(oauth_token+" not authed");
                res.redirect("/do_oauth");
                res.end();
            }
            else{
                var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                    "http://fanfou.com/oauth/access_token",
                    "60648e4719285ec6fb437785e655bda5",
                    "aed509928807eab4f1a615e4d422c724",
                    "1.0",
                    null,
                    "HMAC-SHA1");
                util.puts("oauth_token："+oauth_token+" oauth_token_secret: "+reply);
                oa.getOAuthAccessToken(oauth_token, reply, function(error, oauth_access_token, oauth_access_token_secret, results2){
                    if(error){
                        util.puts("Get access token error"+error);
                        client.quit();
                        //res.send("Failed to get oauth access token.");
                        res.redirect("/404");
                        res.end();
                    }
                    else{
                        util.puts("oauth_access_token: "+oauth_access_token);
                        util.puts("oauth_access_token_secret: "+oauth_access_token_secret);
                        var userID = require("blueimp-md5").md5(oauth_access_token+oauth_access_token_secret);
                        util.puts("cookie userID: "+userID);
                        res.cookie("userID", userID, {secret:true, signed: true, maxAge: 900000});
                        //client.hmset("users", "userID", userID, "oauth_access_token", oauth_access_token, "oauth_access_token_secret", oauth_access_token_secret, redis.print);
                        client.hset("users", userID, oauth_access_token, redis.print);
                        client.hset("access_token", oauth_access_token, oauth_access_token_secret, redis.print);
                        client.quit();
                        //res.send("Authed.");
                        res.redirect("/show_log");
                        res.end();
                    }
                });
            }
        });
    }

});

app.get("/show_log", function(req, res){
    res.send("Coming very soon.");
    res.end();
});
app.get("/404", function(req, res){
    res.send("Page not found.");
    res.end();
});

// Now let's rock
app.listen(process.env.VCAP_APP_PORT || 3000);
