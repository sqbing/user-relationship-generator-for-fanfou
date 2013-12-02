// Check if config.js exists.
var fs = require("fs");
if(!fs.existsSync("./config.js")){
    console.log("Config file not found. "+
    "Try to rename config.js.example to config.js and run again.");
    process.exit(1);
}
var redis = require("redis");
var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , config = require('./config')
  , observer = require("./observer");

var app = express();

app.configure(function(){
  app.set('port', config.server_port || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname+"/public/images/favicon.ico"));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session(
          {
              secret:config.session_secret
          })
      );
  app.use(function(req, res, next){
        req.global_config = config;
        res.locals.csrf = req.session?req.session._csrf:"";
        res.locals.session = req.session;
        res.locals.author = config.author;
        res.locals.contact = config.contact;
        next();
    });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// Some configure for Appfog
app.configure('production', function(){
        var env = JSON.parse(process.env.VCAP_SERVICES);
        config.redis = env['redis-2.2'][0]['credentials'];
});

// Connect to redis server
if(config.redis.host && config.redis.port)
{
    console.log("connect to redis...");
    config.redis["client"] = redis.createClient(config.redis.port, config.redis.host);
    config.redis.client.on("error", function(err){
        console.log("Redis error: "+err);
    });
    config.redis.client.on("ready", function(){
        console.log("succeeded to connect to redis client.");
        if(config.redis.password)
        {
            config.redis.client.auth(config.redis.password, function(err){
                // TODO auth callback function
                console.log("Redis auth error: "+err);
            });
        }
    })
    process.on("exit", function(){
        if(config.redis.client)
        {
            console.log("disconnect from redis.");
            config.redis.client.end();
            config.redis.client = null;
        }
    });
}
routes(app);
if(config.customer_key === null || config.customer_secret === null)
{
    console.log("customer_key or customer_secret null.");
    process.exit(1);
}
http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    observer.run(config);
});
