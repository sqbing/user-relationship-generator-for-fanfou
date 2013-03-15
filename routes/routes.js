var index = require("./index");
var user = require("./user");
var oauth = require("./oauth");
module.exports = function(app)
{
    app.get('/', index);

    app.get("/user", user.show);
    app.get('/user/info', user.info);
    app.get("/user/map", user.map);
    
    app.get('/oauth', oauth.do_oauth, index);
    app.get("/oauth/callback", oauth.oauth_callback, index);
};
