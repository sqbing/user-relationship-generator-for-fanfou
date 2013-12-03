OAuth = require("oauth").OAuth;
exports.do_xauth = (req, res, next) ->
    if !req.body || !req.body.username || !req.body.password
        console.log "Username: "+req.body.username
        console.log "Password: "+req.body.password
        next()
        return
    config = req.global_config;
    oa = new OAuth( "http://fanfou.com/oauth/request_token",
                    "http://fanfou.com/oauth/access_token",
                    config.customer_key,
                    config.customer_secret,
                    "1.0",
                    null,
                    "HMAC-SHA1");
    xauth_params = 
        x_auth_username : req.body.username
        x_auth_password : req.body.password
        x_auth_mode : "client_auth"

    oa.getOAuthRequestToken(xauth_params,
        (error, token, secret, results) ->
            if error
                console.log "Failed to get xauth params."
                console.log "Error: "+error
                console.log "Results: "+results
                next()
                return
            console.log "token "+token
            console.log "secret "+secret
            if !req.session.user
                req.session.user = {}
            req.session.user["oauth_access_token"] = oauth_access_token;
            req.session.user["oauth_access_token_secret"] = oauth_access_token_secret;
            res.send "token "+token+" secret "+secret
            return
    )
exports.start_xauth = (req, res, next) ->
    res.render "start_xauth.jade"
