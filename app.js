var express = require("express");

var app = express();
app.get("/", function(req, res){
    res.send("hello world");
});
app.listen(process.env.VCAP_APP_PORT || 3000);
