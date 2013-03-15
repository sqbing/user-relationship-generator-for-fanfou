var OAuth = require("oauth").OAuth;
exports.show = function(req, res, next){
    res.redirect("/index");
    res.end();
};
exports.info = function(req, res, next){
    if(req.session.user == null || req.session.user.oauth_access_token == null || req.session.user.oauth_access_token_secret == null)
    {
        res.redirect("/oauth");
        res.end();
        return;
    }

    var config = req.global_config;
    var access_token = req.session.user.oauth_access_token;
    var access_secret = req.session.user.oauth_access_token_secret;
     var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                    "http://fanfou.com/oauth/access_token",
                    config.customer_key,
                    config.customer_secret,
                    "1.0",
                    null,
                    "HMAC-SHA1");
     oa.getProtectedResource("http://api.fanfou.com/users/show.json", 
                            "GET", 
                            access_token, 
                            access_secret,  
                            function (error, data, response) {
                                if(error)
                                {
                                    console.log("Failed to get user info, error:"+error);
                                    next();
                                }
                                var user_info = JSON.parse(data);
                                req.session.user["user_info"] = user_info;
                                res.send("User "+req.session.user.user_info.id+" authorized.");
                                // TODO
                            });
};
exports.map = function(req, res, next){
    if(req.session.user  == null|| req.session.user.oauth_access_token == null || req.session.user.oauth_access_token_secret == null)
    {
        res.redirect("/oauth");
        res.end();
        return;
    }
    if(req.session.user.following && req.session.user.followed)
    {
        res.send("User "+req.session.user.user_info.id+" following "+req.session.user.following.length+" followed by "+req.session.user.followed.length+" users");
        return;
    }
    var config = req.global_config;
    if(req.session.user.user_info == null){
        // If haven't got user info
        console.log("User info invalid, get user info first.");
        var access_token = req.session.user.oauth_access_token;
        var access_secret = req.session.user.oauth_access_token_secret;
        var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                        "http://fanfou.com/oauth/access_token",
                        config.customer_key,
                        config.customer_secret,
                        "1.0",
                        null,
                        "HMAC-SHA1");
        oa.getProtectedResource("http://api.fanfou.com/users/show.json", 
                                "GET", 
                                access_token, 
                                access_secret,  
                                function (error, data, response) {
                                    if(error){
                                        // Failed to get user info, reoauth.
                                        console.log("Failed to get user info, error:"+error);
                                        res.redirect("/oauth");
                                        res.end();
                                    }
                                    var user_info = JSON.parse(data);
                                    req.session.user["user_info"] = user_info;
                                    exports.map(req, res, next);
                                });        
    }
    else{
        console.log("User info valid, fetch following.");
        var following = [], followed = [];

        // Fetch people follow you
        var fetch_followed = function(user_id, page){
        var fetch_url = "http://api.fanfou.com/users/followers.json";
        if(user_id){
            fetch_url += ("?id="+user_id);
        }
        if(page){
            fetch_url += ("&page="+page);
        }
        console.log("Fetch fans for "+user_id+" at page "+page+" url:"+fetch_url);
        var access_token = req.session.user.oauth_access_token;
        var access_secret = req.session.user.oauth_access_token_secret;
        var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                        "http://fanfou.com/oauth/access_token",
                        config.customer_key,
                        config.customer_secret,
                        "1.0",
                        null,
                        "HMAC-SHA1");
        oa.getProtectedResource(fetch_url, 
                            "GET", 
                            access_token, 
                            access_secret,  
                            function (error, data, response) {
                                if(error){
                                    // Failed to get user info, reoauth.
                                    console.log("Failed to get user info, error:"+error+" response:"+response+" data:"+data);
                                    res.send("Failed to get followed list.");
                                    res.end();
                                    return;
                                }
                                var followed_list = JSON.parse(data);
                                console.log("Fetched "+followed_list.length+" users.");
                                if(typeof followed_list != "object" || followed_list.length == 0)
                                {
                                    // Fetching end, show list.
                                    req.session.user["following"] = following;
                                    req.session.user["followed"] = followed;
                                    res.send("User "+req.session.user.user_info.id+" following "+following.length+" followed by "+followed.length+" users");
                                }
                                else{
                                    // Save result and fetch again.
                                    for(var i in followed_list){
                                        followed.push(followed_list[i]);
                                    }
                                    fetch_followed(user_id, ++page);
                                }
                            });
        };
        // Fetch people you are following
        var fetch_following = function(user_id, page){
            var fetch_url = "http://api.fanfou.com/users/friends.json";
            if(user_id){
                fetch_url += ("?id="+user_id);
            }
            if(page){
                fetch_url += ("&page="+page);
            }
            console.log("Fetch following for "+user_id+" at page "+page+" url:"+fetch_url);
            var access_token = req.session.user.oauth_access_token;
            var access_secret = req.session.user.oauth_access_token_secret;
            var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                            "http://fanfou.com/oauth/access_token",
                            config.customer_key,
                            config.customer_secret,
                            "1.0",
                            null,
                            "HMAC-SHA1");
            oa.getProtectedResource(fetch_url, 
                                "GET", 
                                access_token, 
                                access_secret,  
                                function (error, data, response) {
                                    if(error){
                                        // Failed to get user info, reoauth.
                                        console.log("Failed to get user info, error:"+error+" response:"+response+" data:"+data);
                                        res.send("Failed to get following list.");
                                        res.end();
                                        return;
                                    }
                                    var following_list = JSON.parse(data);
                                    console.log("Fetched "+following_list.length+" users.");
                                    if(typeof following_list != "object" || following_list.length == 0)
                                    {
                                        // Fetch followed
                                        fetch_followed(user_id, 1);
                                    }
                                    else{
                                        // Save result and fetch again.
                                        for(var i in following_list){
                                            following.push(following_list[i]);
                                        }
                                        fetch_following(user_id, ++page);
                                    }
                                });
    };
    fetch_following(req.session.user.user_info.id, 1);
    }
};