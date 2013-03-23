/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , config = require('./config');

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

routes(app);
if(config.customer_key == null || config.customer_secret == null)
{
  console.log("customer_key or customer_secret null.");
  process.exit(1);
}
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
