var express = require("express");
var util = require("util");
var OAuth = require("oauth").OAuth;
var redis = require("redis");
var md5 = require("blueimp-md5").md5;
var app = express();
// Global variables
var redisdb = {};
var oauth_callback_url = "";
var node_port = 0;

// Setting environment for local development
app.configure('development', function(){
    redisdb = {
        "hostname":"localhost",
        "host":"127.0.0.1",
        "port":6379,
        "password":"",
        "name":""
    };
    node_port = 3000;
    oauth_callback_url = "127.0.0.1:"+node_port;
});

// Setting environment for production online
app.configure('production', function(){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    redisdb = env['redis-2.2'][0]['credentials'];
    node_port = process.env.VCAP_APP_PORT;
    oauth_callback_url = "fflog.ap01.aws.af.cm";
});

app.configure('heroku', function(){
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    redisdb = {
        "hostname":rtg.hostname,
        "port":rtg.port,
        "password":rtg.auth.split(":")[1]
    };
    node_port = process.env.PORT;
    oauth_callback_url = "fflog.herokuapp.com";
});

app.use(express.logger());
// Setting static middleware
app.use(express.static(__dirname+"/static"));
// Setting cookie signed key
app.use(express.cookieParser("godintheheaven"));
//app.use(express.cookieSession({cookie:{maxAge: 900000}}));

// Now are path handler
app.get("/", function(req, res){
    res.render(__dirname+"/template/index.jade", {"pageTitle":"index"});
});
app.get("/do_oauth", function(req, res){
    if(req.signedCookies){
        if(req.signedCookies.user_cookie){
            util.puts("user_cookie: "+req.signedCookies.user_cookie);
            client.hgetall("cookies:"+req.signedCookies.user_cookie, function(error, reply){
                if(error || reply == null){
                    // If user cookie not found, reauth.
                    util.puts("Cookie found, user not logged in yet.");
                    var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                                        "http://fanfou.com/oauth/access_token",
                                        process.env.CUSTOMER_KEY,
                                        process.env.CUSTOMER_SECRET,
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
                            client.hmset("oauth_token:"+oauth_token, "oauth_token", oauth_token, "oauth_token_secret",oauth_token_secret, redis.print);
                            
                            // Open oauth url
                            res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+oauth_callback_url+"/oauth_callback");
                            res.end();
                        }
                    });
                }
                else{
                    // user cookie found.
                    util.puts("Cookie found, user logged in.");
                    res.redirect("/show_user");
                    res.end();
                }
            });
        }
        else{
            util.puts("User cookie not set yet.");
            var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                            "http://fanfou.com/oauth/access_token",
                            process.env.CUSTOMER_KEY,
                            process.env.CUSTOMER_SECRET,
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
                    client.hmset("oauth_token:"+oauth_token, "oauth_token", oauth_token, "oauth_token_secret", oauth_token_secret, redis.print);

                    // Open oauth url
                    res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+oauth_callback_url+"/oauth_callback");

                    res.end();
                }
            });

        }
    }
    else{
        util.puts("Signed cookie not set.");
        var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                            "http://fanfou.com/oauth/access_token",
                            process.env.CUSTOMER_KEY,
                            process.env.CUSTOMER_SECRET,
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
                client.hmset("oauth_token:"+oauth_token, "oauth_token", oauth_token, "oauth_token_secret", oauth_token_secret, redis.print);

                // Open oauth url
                res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+oauth_callback_url+"/oauth_callback");
                res.end();
            }
        });
    }

});

// 饭否认证回调
app.get("/oauth_callback", function(req, res){
    var oauth_token = req.query.oauth_token;
    if(oauth_token === undefined){
        util.puts("Input params error, oauth_token: undefined");
        res.redirect("/404");
        res.end();
    }
    else{
        client.hget("oauth_token:"+oauth_token, "oauth_token_secret", function (err, reply) {
            if(err){
                util.puts("oauth_token not found");
                res.redirect("/do_oauth");
                res.end();
            }
            else{
                var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                    "http://fanfou.com/oauth/access_token",
                    process.env.CUSTOMER_KEY,
                    process.env.CUSTOMER_SECRET,
                    "1.0",
                    null,
                    "HMAC-SHA1");

                util.puts("oauth_token:"+oauth_token+" oauth_token_secret: "+reply);
                oa.getOAuthAccessToken(oauth_token, reply, function(error, oauth_access_token, oauth_access_token_secret, results2){
                    if(error){
                        util.puts("Get access token error"+error);
                        res.redirect("/404");
                        res.end();
                    }
                    else{
                        util.puts("oauth_access_token: "+oauth_access_token);
                        util.puts("oauth_access_token_secret: "+oauth_access_token_secret);

                        var user_cookie = md5(oauth_access_token+oauth_access_token_secret);
                        util.puts("cookie user cookie: "+user_cookie);

                        res.cookie("user_cookie", user_cookie, {secret:true, signed: true, maxAge: 900000});
                        client.hmset("cookies:"+user_cookie, "oauth_access_token", oauth_access_token, "oauth_access_token_secret", oauth_access_token_secret, redis.print);
                        client.del("oauth_token:"+oauth_token, redis.print);

                        // 获取用户信息
                        oa.getProtectedResource("http://api.fanfou.com/users/show.json", 
                            "GET", 
                            oauth_access_token, 
                            oauth_access_token_secret,  
                            function (error, data, response) {
                                if(error){
                                    util.puts("Failed to get user info.");
                                    util.puts("Data: "+data);
                                    util.puts("Error: "+error);
                                    util.puts("Response: "+response);
                                    res.redirect("/404");
                                    res.end();
                                }
                                else{
                                    if(JSON.parse(data).length != 0){
                                        // Succeeded to get user info.
                                        util.puts(data);
                                        if(JSON.parse(data).id)
                                        {
                                            // Save user info
                                            client.hmset("user:"+JSON.parse(data).id, "info", data, redis.print);
                                            client.hmset("cookies:"+user_cookie, "id", JSON.parse(data).id, redis.print);

                                            res.redirect("/show_user");
                                            res.end();   
                                        }
                                        else
                                        {
                                            res.send("Failed to save user info.");
                                            res.end();
                                        }
                                         
                                    }
                                    else{
                                        util.puts("Failed to get user info.");
                                        res.redirect("/404");
                                        res.end();
                                    }
                                }
                        });
                    }
                });
            }
        });
    }

});

// 保存用户消息到redis
app.get("/save_all_log", function(req, res){
    if(req.signedCookies)
    {
        if(req.signedCookies.user_cookie)
        {
            client.hgetall("cookies:"+req.signedCookies.user_cookie, function(error, reply){
                if(error || reply === null){
                    res.redirect("/do_oauth");
                    res.end();
                }
                else
                {
                    var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                        "http://fanfou.com/oauth/access_token",
                        process.env.CUSTOMER_KEY,
                        process.env.CUSTOMER_SECRET,
                        "1.0",
                        null,
                        "HMAC-SHA1");
                    var url = "http://api.fanfou.com/statuses/user_timeline.json";
                    var all_status = [];
                    var page = 1;
                    if(reply.id === undefined)
                    {
                        res.redirect("/404");
                        res.end();
                    }

                    // 删除原来的消息列表
                    client.del("message:"+reply.id, redis.print);

                    var callback_func_get_status = function(error, data, response){
                        if(error){
                            util.puts("Error while fetch user log.");
                            util.puts("Data: "+data);
                            util.puts("Error: "+error);
                            util.puts("Response: "+response);
                            res.redirect("/404");
                            res.end();
                        }
                        else{
                            if(JSON.parse(data).length === 0)
                            {
                                client.llen("message:"+reply.id, function(err, list_length){
                                    if(err)
                                    {
                                        util.puts("Failed to get message list length.");
                                        res.redirect("/404");
                                        res.end();
                                    }else{
                                        res.send("Succeded to get "+list_length+" messages.");
                                        res.end();
                                    }
                                });                            
                            }
                            else
                            {
                                for(var i=0; i<JSON.parse(data).length; i++)
                                {
                                    // 保存消息到list
                                    client.rpush("message:"+reply.id, JSON.parse(data)[i], redis.print);                                    
                                }
                                util.puts("Page "+page+", "+JSON.parse(data).length+"messages saved.");
                                
                                // 继续获取下一页用户消息
                                page++;
                                url = "http://api.fanfou.com/statuses/user_timeline.json?page="+page;  
                                oa.getProtectedResource(url, 
                                    "GET", 
                                    reply.oauth_access_token, 
                                    reply.oauth_access_token_secret,
                                    callback_func_get_status);
                            }    
                        }
                    };
                    oa.getProtectedResource(url, 
                        "GET", 
                        reply.oauth_access_token, 
                        reply.oauth_access_token_secret,  
                        callback_func_get_status);
                    
                }
            });
        }
        else
        {
            // 若用户未认证
            res.redirect("/do_oauth");
            res.end();            
        }
    }
    else
    {
        // 若用户未认证
        res.redirect("/do_oauth");
        res.end();
    }
});

// 显示用户信息
app.get("/show_user", function(req, res){
    if(req.signedCookies){
        if(req.signedCookies.user_cookie){
            client.hgetall("cookies:"+req.signedCookies.user_cookie, function(error, reply){
                if(error || reply == null){
                    res.redirect("/do_oauth"); 
                    res.end();
                }
                else{
                    var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                        "http://fanfou.com/oauth/access_token",
                        process.env.CUSTOMER_KEY,
                        process.env.CUSTOMER_SECRET,
                        "1.0",
                        null,
                        "HMAC-SHA1");
                    oa.getProtectedResource("http://api.fanfou.com/users/show.json", 
                        "GET", 
                        reply.oauth_access_token, 
                        reply.oauth_access_token_secret,  
                        function (error, data, response) {
                            if(error){
                                util.puts("Failed to get user info.");
                                res.redirect("/404");
                                res.end();
                            }
                            else{
                                // Succeeded to get user info, now show welcome.
                                util.puts(data);
                                res.render(__dirname+"/template/show_user.jade", JSON.parse(data));
                                res.end();
                            }
                        });
                }
            });
        }
        else{
            // 用户未认证
            res.redirect("/do_oauth");
            res.end();
        }
    }
    else{
        // 用户未认证
        res.redirect("/do_oauth");
        res.end();
    }
});

app.get("/404", function(req, res){
    res.send("Page not found.");
    res.end();
});

// Without redis, nothing can we do.
var client = redis.createClient(redisdb["port"], redisdb["hostname"]);
// TODO Do something if redis error ocurrs.
client.on("error", function(err){
    util.puts("Redis error" + err);
});
if(redisdb.password)
{
    client.auth(redisdb.password);    
}

// Now let's rock!
app.listen(node_port);
