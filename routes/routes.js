var index = require("./index");
var user = require("./user");
var oauth = require("./oauth");
var about = require("./about");
module.exports = function(app)
{
    app.get('/', index);
    app.get("/index", index);

    app.get("/user", user.show, index);
    app.get('/user/info', user.info);
    app.get("/user/map", user.map, index);
    app.get("/user/fetch_map", user.fetch_map, index);
    app.get("/user/export_messages", user.export_messages);
    app.get("/user/export_messages_status", user.export_messages_status);
    app.get("/user/exported_messages", user.exported_messages, index);
    app.get("/user/user_info_span", user.user_info_span);
    
    app.get('/oauth', oauth.do_oauth, index);
    app.get("/unauth", oauth.unauth)
    app.get("/oauth/callback", oauth.oauth_callback, index);
    app.get("/oauth/is_oauthed", oauth.is_oauthed);

    app.get("/about", about.show);
};
