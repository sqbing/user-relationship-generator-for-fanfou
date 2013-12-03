module.exports = (req, res, next) ->
    if req.session
        if req.session.user
            req.session.user = null
        req.session = null
    res.redirect "/index"
    return
