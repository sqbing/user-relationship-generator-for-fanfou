var OAuth = require("oauth").OAuth;
exports.do_oauth = function(req, res, next){
    config = req.global_config;
    var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                                        "http://fanfou.com/oauth/access_token",
                                        config.customer_key,
                                        config.customer_secret,
                                        "1.0",
                                        null,
                                        "HMAC-SHA1"
                                        );
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
        if(error){
            console.log("Get oauth token error:"+error);
            for(var i in error)
            {
                console.log(""+error[i]);
            }
            var responseJSON = {};
            responseJSON["error"] = "Failed to get oauth token."
            res.send(responseJSON);
            return;
        }

        console.log('oauth_token :' + oauth_token);
        console.log('oauth_token_secret :' + oauth_token_secret);
        var user = {};
        user["oauth_token"] = oauth_token;
        user["oauth_token_secret"] = oauth_token_secret;
        req.session.user = user;
        //FIXME
        //res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+config.server_domain+":"+config.server_port+"/oauth/callback");
        var responseJSON = {};
        responseJSON["oauth_url"] = "http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+config.server_domain+":"+config.server_port+"/oauth/callback";
        res.send(responseJSON);
        return;
    });
};
exports.oauth_callback = function(req, res, next){
    if(req.query.oauth_token == null)
    {
        next();
        return;
    }
    if(req.session.user == null)
    {
        next();
        return;
    }
    if(req.session.user.oauth_token == null || req.session.user.oauth_token_secret == null)
    {
        next();
        return;
    }
     var oa = new OAuth( "http://fanfou.com/oauth/request_token",
                    "http://fanfou.com/oauth/access_token",
                    config.customer_key,
                    config.customer_secret,
                    "1.0",
                    null,
                    "HMAC-SHA1");

    var oauth_token = req.session.user["oauth_token"];
    var oauth_token_secret = req.session.user["oauth_token_secret"];

    oa.getOAuthAccessToken(oauth_token, oauth_token_secret, function(error, oauth_access_token, oauth_access_token_secret, results2){
        if(error){
            console.log("Get oauth token error:"+error);
            next();
            return;
        }
        console.log("oauth_access_token:"+oauth_access_token+" oauth_access_token_secret:"+oauth_access_token_secret);
        req.session.user["oauth_access_token"] = oauth_access_token;
        req.session.user["oauth_access_token_secret"] = oauth_access_token_secret;
        res.send("<h1>认证通过，请等待页面刷新……</h1>");
    });
};
exports.is_oauthed = function(req, res){
    var responseJSON = {};
    if(req.session.user && req.session.user.oauth_access_token && req.session.user.oauth_access_token_secret)
    {
        responseJSON["is_oauthed"] = true;
    }
    else
    { 
        responseJSON["is_oauthed"] = false;  
    }
    res.send(responseJSON);
};
exports.unauth = function(req, res){
    if(req.session && req.session.user)
    {
        console.log("User unauthed.");
        req.session.user = null;
    }
    res.end();
};
