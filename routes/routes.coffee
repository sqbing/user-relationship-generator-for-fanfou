index = require "./index"
user = require "./user"
auth = require "./auth"
about = require "./about"
internal_server_error = require "./500"
not_found = require "./404"
module.exports = (app) ->
    app.get('/', index)
    app.get("/index", index)
    ###
    app.get("/user/map", user.map, index);
    app.get("/user/fetch_map", user.fetch_map, index);
    app.get("/user/export_messages", user.export_messages);
    app.get("/user/export_messages_status", user.export_messages_status);
    app.get("/user/exported_messages", user.exported_messages, index);
    app.get("/user/user_info_span", user.user_info_span);
    app.get("/unauth", oauth.unauth)
    app.get("/oauth/callback", oauth.oauth_callback, index);
    app.get("/oauth/is_oauthed", oauth.is_oauthed);
    ###

    # show user info
    app.get("/user/info", auth.auth_filter, user.info, internal_server_error)
    # user sign out
    app.get("/user/sign_out", user.sign_out)

    # do oauth
    app.get('/auth/do_oauth', auth.do_oauth, internal_server_error)
    # oauth callback
    app.get('/auth/oauth_callback', auth.oauth_callback, internal_server_error)
    # do xauth
    app.post('/auth/do_xauth', auth.do_xauth, internal_server_error)
    # show xauth page
    app.get('/auth/start_xauth', auth.start_xauth, internal_server_error)

    # show maintainer info
    app.get("/about", about.show)

    # server error related
    app.get("/500", internal_server_error)
    app.get("/404", not_found)
