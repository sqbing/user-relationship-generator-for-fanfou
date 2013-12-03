module.exports = (req, res, next) ->
    if req.session or req.session.user or req.session.user.oauth_access_token or req.session.oauth_access_secret
        res.redirect "/500"
        return
    next
