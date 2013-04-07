var OAuth = require("oauth").OAuth;
var export_user_messages = function(config){
    if(!config || !config.redis || !config.redis.client)
    {
        return;
    }
    var redis_client = config.redis.client;
    redis_client.llen("export_waiting_queue", function(err, obj){
        if(err)
        {
            return;
        }
        if(obj > 0)
        {
            // 从等待队列中获取一个用户ID
            redis_client.rpop("export_waiting_queue", function(err, user_id){
                if(err)
                {
                    return;
                }
                // 删除已获取的用户消息
                redis_client.del("user_messages:"+user_id);
                console.log("Start fetching messages for user "+user_id);
                // 从用户信息map中获取用户的access_token等信息
                redis_client.hgetall("user_info:"+user_id, function(err, user_info){
                    if(err)
                    {
                        redis_client.hmset("user_info:"+user_id, "export_status", "error");
                        return;
                    }
                    if(!user_info.access_token || !user_info.access_secret)
                    {
                        console.log("Failed to export user "+user_id+" messages, access_token or access_secret null");
                        redis_client.hmset("user_info:"+user_id, "export_status", "error");
                        return;
                    }
                    var fetch_user_messages = function(page){
                        if(!page)
                        {
                            page = 0;
                        }
                        console.log("Fetchting user messages at page "+page);
                        var fetch_url = "http://api.fanfou.com/statuses/user_timeline.json?page="+page;
                        var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                                        "http://fanfou.com/oauth/access_token",
                                        config.customer_key,
                                        config.customer_secret,
                                        "1.0",
                                        null,
                                        "HMAC-SHA1");
                        oa.getProtectedResource(fetch_url, 
                                                "GET", 
                                                user_info.access_token, 
                                                user_info.access_secret,  
                                                function (error, data, response) {
                                                    if(error){
                                                        // Failed to get user info, reoauth.
                                                        console.log("Failed to get user info, error:"+error+"data: "+data+"response: "+response);
                                                        redis_client.hmset("user_info:"+user_id, "export_status", "interrupted");
                                                        return;
                                                    }
                                                    
                                                    console.log(user_id+"'s messages at page "+page+" all fetched.");
                                                    var user_timeline = JSON.parse(data);
                                                    if(user_timeline.length == 0)
                                                    {
                                                        console.log(user_id)+"'s message all exported.";
                                                        redis_client.hmset("user_info:"+user_id, "export_status", "completed");
                                                        return;
                                                    }
                                                    for(var message_index in user_timeline)
                                                    {
                                                        redis_client.rpush("user_messages:"+user_id, JSON.stringify(user_timeline[message_index]));
                                                    }
                                                    setTimeout(fetch_user_messages, 2500, ++page);
                                                });        
                    };
                    // 从第0页开始，逐页获取用户的消息
                    fetch_user_messages(0);
                });
            });
        }
    });
};
exports.run = function(config)
{
    if(!config)
    {
        console.log("Failed to run observers, config null.");
        return;
    }

    var observer_all = function(config){
        // All things need to be done periodicity, added below.
        // 检查是否有导出用户消息
        export_user_messages(config);

        setTimeout(observer_all, 500, config);
    };
    setTimeout(observer_all, 500, config);

    return;
}
