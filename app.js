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
app.use(express.cookieParser("godintheheaven"));

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
                            client.hset("oauth", oauth_token, oauth_token_secret, redis.print);
                            client.quit();
                            // Open oauth url
                            res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback=127.0.0.1:3000/oauth_callback");
                            res.end();
                        }
                    });
                }
                else{
                    // TODO userID found, show fanfou log
                    res.send("Authed");
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
                    client.hset("oauth", oauth_token, oauth_token_secret, redis.print);
                    client.quit();
                    // Open oauth url
                    res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback=127.0.0.1:3000/oauth_callback");
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
                client.hset("oauth", oauth_token, oauth_token_secret, redis.print);
                client.quit();
                // Open oauth url
                res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback=127.0.0.1:3000/oauth_callback");
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
        client.hget("oauth", oauth_token, function (err, reply) {
            if(err){
                util.puts("oauth_token not found");
                client.end();
                res.send(oauth_token+" not authed");
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
                        client.end();
                        res.send("Failed to get oauth access token.");
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
                        client.end();
                        res.send("Authed.");
                        res.end();
                    }
                });
            }
            /*
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
                        "HMAC-SHA1");
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
            */
        });
        /*
        client.end();
        res.send("Authed");
        res.end();
        */
    }

});
app.get("/get_all_oauth_token", function(req, res){
    var client = redis.createClient(redisdb["port"], redisdb["host"]);
    client.on("error", function(err){
        util.puts("Redis error" + err);
        //TODO
        res.end();
    });
    client.hkeys("oauth", function(error, replies){
        if(error){
        }
        else{
            replies.forEach(function(reply, i){
                res.send("oauth_token: "+reply.oauth_token+" oauth_token_secret: "+reply.oauth_token_secret);
            })
            res.end();
            client.end();
        }
    });
    //client.end();
});

app.listen(process.env.VCAP_APP_PORT || 3000);
