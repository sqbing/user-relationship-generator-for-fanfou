var OAuth = require("oauth").OAuth;
exports.show = function(req, res, next){
    if(req.session.user == null 
        || req.session.user.oauth_access_token == null 
        || req.session.user.oauth_access_token_secret == null){
        next();
        return;
    }
    var user = req.session.user;
    var config = req.global_config;
    if(user.user_info == null){
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
                                        return;
                                    }
                                    var user_info = JSON.parse(data);
                                    req.session.user["user_info"] = user_info;
                                    exports.show(req, res, next);
                                });        
    }
    else{
        //console.log("User info valid.");
        //var user_info = req.session.user.user_info;
        var access_token = req.session.user.oauth_access_token;
        var access_secret = req.session.user.oauth_access_token_secret;
        var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                        "http://fanfou.com/oauth/access_token",
                        config.customer_key,
                        config.customer_secret,
                        "1.0",
                        null,
                        "HMAC-SHA1");
        oa.getProtectedResource("http://api.fanfou.com/statuses/user_timeline.json", 
                                "GET", 
                                access_token, 
                                access_secret,  
                                function (error, data, response) {
                                    if(error)
                                    {
                                        console.log("Failed to get user's latest 20 statuses in /user. data: "+data);
                                        res.render("user",{"messages":[]});
                                        return;
                                    }
                                    else
                                    {
                                        var messages = JSON.parse(data);
                                        for(var message_index in messages)
                                        {
                                            var new_date_string = "";
                                            var created_at = new Date(messages[message_index].created_at);
                                            new_date_string = created_at.getFullYear()+"年 "+created_at.getMonth()+"月 "+created_at.getDate()+"日 "+created_at.getHours()+":"+created_at.getMinutes()+":"+created_at.getSeconds();
                                            messages[message_index].created_at = new_date_string;
                                        }
                                        res.render("user", {"messages":messages});
                                        return;
                                    }
                                });
    }
};
exports.info = function(req, res, next){
    if(req.session.user == null || req.session.user.oauth_access_token == null || req.session.user.oauth_access_token_secret == null)
    {
        res.redirect("/oauth");
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
                                    return;
                                }
                                var user_info = JSON.parse(data);
                                req.session.user["user_info"] = user_info;
                                res.send("User "+req.session.user.user_info.id+" authorized.");
                                // TODO
                            });
};
exports.map = function(req, res, next){
    if(req.session.user == null || req.session.user.oauth_access_token == null || req.session.user.oauth_access_token_secret == null){
        res.redirect("/");
        return;
    }
    res.render("map");
    return;
};
exports.export_messages_status = function(req, res)
{
    var responseJSON = {};
    if(!req.session || !req.session.user)
    {
        console.log("Failed to export messages, user not authed.");
        responseJSON["result"] = "fail";
        responseJSON["reason"] = "User not authed.";
        res.send(responseJSON);
        return;
    }
    var config = req.global_config;
    if(!config.redis.client)
    {
        console.log("Failed to export messages, redis not connected.");
        responseJSON["result"] = "fail";
        responseJSON["reason"] = "Redis not connected.";
        res.send(responseJSON);
        return;
    }
    var redis_client = config.redis.client;
    redis_client.hgetall("user_info:"+req.session.user.user_info.id, function(err, obj){
        if(err)
        {
            console.log("user_info:"+req.session.user.user_info.id+" not found, "+err);
            responseJSON["result"] = "fail";
            responseJSON["reason"] = "Redis error.";
            res.send(responseJSON);
            return;
        }
        if(obj)
        {
            if(obj.export_status == "completed")
            {
                console.log(req.session.user.user_info.id+" messages all exported.");
                responseJSON["result"] = "completed";
                responseJSON["reason"] = "Export completed.";
                res.send(responseJSON);
                return;
            }
            else if(obj.export_status == "waiting")
            {
                console.log(req.session.user.user_info.id+" waiting in queue.");
                responseJSON["result"] = "waiting";
                responseJSON["reason"] = "Waiting in queue.";
                res.send(responseJSON);
                return;
            }
            else if(obj.export_status == "fetching")
            {
                console.log(req.session.user.user_info.id+" in fetching messages.");
                responseJSON["result"] = "fetching";
                responseJSON["reason"] = "Export not completed.";
                res.send(responseJSON);
                return;
            }
        }
        console.log("User export messages status invalid.");
        responseJSON["result"] = "invalid";
        res.send(responseJSON);
        return;
    });
}
exports.export_messages = function(req, res)
{
    var responseJSON = {};
    if(!req.session || !req.session.user)
    {
        console.log("Failed to export messages, user not authed.");
        responseJSON["result"] = "fail";
        responseJSON["reason"] = "User not authed.";
        res.send(responseJSON);
        return;
    }
    // TODO fetch user info
    // if(!req.session.user.user_info)
    // {
    // }
    var config = req.global_config;
    if(!config.redis.client)
    {
        console.log("Failed to export messages, redis not connected.");
        responseJSON["result"] = "fail";
        responseJSON["reason"] = "Redis not connected.";
        res.send(responseJSON);
        return;
    }
    var redis_client = config.redis.client;
    redis_client.hgetall("user_info:"+req.session.user.user_info.id, function(err, obj){
        if(err)
        {
            console.log("user_info:"+req.session.user.user_info.id+" not found, "+err);
            responseJSON["result"] = "fail";
            responseJSON["reason"] = "Redis error.";
            res.send(responseJSON);
            return;
        }
        if(obj)
        {
            if(obj.export_status == "completed")
            {
                console.log(req.session.user.user_info.id+" messages all exported.");
                responseJSON["result"] = "completed";
                responseJSON["reason"] = "Export completed.";
                res.send(responseJSON);
                return;
            }
            else if(obj.export_status == "waiting")
            {
                console.log(req.session.user.user_info.id+" waiting in queue.");
                responseJSON["result"] = "waiting";
                responseJSON["reason"] = "Waiting in queue.";
                res.send(responseJSON);
                return;
            }
            else if(obj.export_status == "fetching")
            {
                console.log(req.session.user.user_info.id+" in fetching messages.");
                responseJSON["result"] = "fetching";
                responseJSON["reason"] = "Export not completed.";
                res.send(responseJSON);
                return;
            }
            /*
            else
            {
                console.log(req.session.user.user_info.id+" export status invalid.");
                redis_client.lpush("export_waiting_queue", req.session.user.user_info.id);
                responseJSON["result"] = "waiting";
                responseJSON["reason"] = "Waiting in queue.";
                res.send(responseJSON);
                return;
            }
            */
        }
        /*
        else
        {
            // 将用户加入等待队列
            //redis_client.HMSET("user_info:"+req.session.user.user_info.id, req.session.user.user_info);
            redis_client.hmset("user_info:"+req.session.user.user_info.id, 
                    "export_status", "waiting", 
                    "access_token", req.session.user.oauth_access_token, 
                    "access_secret", req.session.user.oauth_access_token_secret);
            redis_client.lpush("export_waiting_queue", req.session.user.user_info.id);
            responseJSON["result"] = "success";
            responseJSON["reason"] = "Waiting in queue.";
            res.send(responseJSON);
            return;
        }
        */
        // 将用户加入等待队列
        //redis_client.HMSET("user_info:"+req.session.user.user_info.id, req.session.user.user_info);
        redis_client.hmset("user_info:"+req.session.user.user_info.id, 
                "export_status", "waiting", 
                "access_token", req.session.user.oauth_access_token, 
                "access_secret", req.session.user.oauth_access_token_secret);
        redis_client.lpush("export_waiting_queue", req.session.user.user_info.id);
        responseJSON["result"] = "success";
        responseJSON["reason"] = "Waiting in queue.";
        res.send(responseJSON);
        return;
    });
};
exports.fetch_map = function(req, res, next){
    if(req.session.user  == null|| req.session.user.oauth_access_token == null || req.session.user.oauth_access_token_secret == null)
    {
        res.redirect("/oauth");
        return;
    }
    if(req.session.user.following && req.session.user.followed)
    {
        var following = req.session.user.following;
        var followed = req.session.user.followed;
        var responseJSON = {};
        responseJSON["following"] = req.session.user.following;
        responseJSON["followed"] = req.session.user.followed;
        responseJSON["me"] = req.session.user.user_info;
        res.send(responseJSON);
        //res.send("User "+req.session.user.user_info.id+" following "+req.session.user.following.length+" followed by "+req.session.user.followed.length+" users");
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
                                        return;
                                    }
                                    var user_info = JSON.parse(data);
                                    req.session.user["user_info"] = user_info;
                                    exports.fetch_map(req, res, next);
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
                                    var responseJSON = {};
                                    responseJSON["me"] = req.session.user.user_info;
                                    responseJSON["following"] = req.session.user.following;
                                    responseJSON["followed"] = req.session.user.followed;
                                    res.send(responseJSON);
                                    return;
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
exports.exported_messages = function(req, res, next)
{
    var responseJSON = {};
    if(!req.session || !req.session.user)
    {
        console.log("Failed to export messages, user not authed.");
        next();
        return;
    }
    // TODO fetch user info
    // if(!req.session.user.user_info)
    // {
    // }
    var config = req.global_config;
    if(!config.redis.client)
    {
        console.log("Failed to show exported messages, redis not connected.");
        //res.send("");
        next();
        return;
    }
    var redis_client = config.redis.client;
    redis_client.hgetall("user_info:"+req.session.user.user_info.id, function(err, obj){
        if(err)
        {
            console.log("Failed to show exported messages, redis return err."+err);
            res.send("");
            return;
        }
        if(obj)
        {
            if(obj.export_status == "completed")
            {
                // TODO
                console.log("All messages exported.");
                redis_client.llen("user_messages:"+req.session.user.user_info.id, function(err, messages_length){
                    if(err)
                    {
                        console.log("Failed to get user_messages:"+req.session.user.user_info.id+" lenght");
                        res.send("");
                        return;
                    }
                    redis_client.lrange("user_messages:"+req.session.user.user_info.id, 0, messages_length-1, function(err, messages){
                        if(err)
                        {
                            console.log("Failed to get user_messages:"+req.session.user.user_info.id+" all messages.");
                            res.send("");
                            return;
                        }

                        for(var message_index in messages)
                        {
                            messages[message_index] = JSON.parse(messages[message_index]);
                            // 转换时间
                            var new_date_string = "";
                            var created_at = new Date(messages[message_index].created_at);
                            new_date_string = created_at.getFullYear()+"年 "+created_at.getMonth()+"月 "+created_at.getDate()+"日 "+created_at.getHours()+":"+created_at.getMinutes()+":"+created_at.getSeconds();
                            messages[message_index].created_at = new_date_string;
                        }
                        res.render("exported_messages", {"messages":messages});
                        //res.send("Not implemented.");
                        return;
                    });
                });
            }
            else
            {
                console.log("Messages not all exported.");
                res.send("");
                return;
            }
        }
        else
        {
            console.log("Messages not all exported.");
            res.send("");
            return;
        }
    });
};
