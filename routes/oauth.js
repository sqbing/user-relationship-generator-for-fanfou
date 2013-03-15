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
            next();
        }

        console.log('oauth_token :' + oauth_token);
        console.log('oauth_token_secret :' + oauth_token_secret);
        var user = {};
        user["oauth_token"] = oauth_token;
        user["oauth_token_secret"] = oauth_token_secret;
        req.session.user = user;

        res.redirect("http://m.fanfou.com/oauth/authorize?oauth_token="+oauth_token+"&oauth_callback="+config.server_domain+":"+config.server_port+"/oauth/callback");
        res.end();
    });
};
exports.oauth_callback = function(req, res, next){
    if(req.query.oauth_token == null)
    {
        next();
    }
    if(req.session.user == null)
    {
        next();
    }
    if(req.session.user.oauth_token == null || req.session.user.oauth_token_secret == null)
    {
        next();
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
        }
        console.log("oauth_access_token:"+oauth_access_token+" oauth_access_token_secret:"+oauth_access_token_secret);
        req.session.user["oauth_access_token"] = oauth_access_token;
        req.session.user["oauth_access_token_secret"] = oauth_access_token_secret;
        res.redirect("/user/info");
        res.end();
    });
};