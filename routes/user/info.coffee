OAuth = require("oauth").OAuth
module.exports = (req, res, next) ->
    config = req.global_config
    access_token = req.session.user.oauth_access_token
    access_secret = req.session.user.oauth_access_token_secret
    oa = new OAuth( "http://fanfou.com/oauth/request_token",
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
                            (error, data, response) ->
                                if(error)
                                    console.log("Failed to get user info, error: "+error);
                                    next();
                                    return;
                                user_info = JSON.parse(data);
                                req.session.user["user_info"] = user_info;
                                res.send("User "+req.session.user.user_info.id+" authorized.");
    )
