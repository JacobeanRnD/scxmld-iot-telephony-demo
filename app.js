'use strict';
// jshint node:true

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var swaggerClient = require('swagger-client');
var fs = require('fs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var SCXMLD_URL = process.env.SCXMLD_URL || 'http://localhost:8002';
var SCXMLD_SC_NAME = 'index';

module.exports = function init(cb){
  var swagger = new swaggerClient.SwaggerClient({
    url: SCXMLD_URL + '/smaas.json',
    success: function(){
      onSwaggerSuccess(swagger,cb);
    },
    fail : function(){
      console.log('here');
    }
  });
}

function onSwaggerSuccess(swagger,cb){

  var myscxml = fs.readFileSync('index.scxml','utf8');

  //create sc definition
  var requestOptions = { parameterContentType: 'application/xml', scxmlDefinition: myscxml, StateChartName: SCXMLD_SC_NAME };
  swagger.default.createOrUpdateStatechartDefinition(requestOptions, onStatechartSuccess, onStatechartError);

  function onStatechartSuccess (data) {
    console.log('Statechart saved, StateChartName:', data.headers.normalized.Location);
    installMiddlewares(swagger,cb);
  }

  function onStatechartError (data) {
    console.log('Error saving statechart', data.data.toString());
    cb({message : 'Error saving statechart'});
  }


}

function installMiddlewares(swagger, cb){
  app.get('/',function(req,res){
    res.json({"twilio-protocol-adapter" : "1.0.0"});
  });

  app.get('/call/*',function(req, res){
    var id = req.query.CallSid;
    var relativePath = req.path;
    var phone = req.query.From;
    phone = Array(phone.length - 3).join('*') + phone.slice(phone.length - 3);

    swagger.default.getInstance({ StateChartName: SCXMLD_SC_NAME, InstanceId: id}, function (data) {
      if(relativePath === '/call/ended') {
        console.log('Call ended');

        swagger.default.deleteInstance({ StateChartName: SCXMLD_SC_NAME, InstanceId: id }, function () {
          console.log('Deleted instance');
        }, function (data) {
          console.error('Error deleting instance', data.data.toString());
        });

        res.end();
        return;
      }

      afterGetInstance(data);
    },function(data){
      //create
      console.log('Creating new instance');
      swagger.default.createNamedInstance({ StateChartName: SCXMLD_SC_NAME, InstanceId: id }, afterGetInstance, function(){
        console.log('Error creating instance');
        res.send();
      });
    });

    function afterGetInstance(data){

      var eventName = relativePath.substring(1).split('/').join('.');
      var event = { name: eventName, data: { params: req.query }};

      swagger.default.sendEvent(
        {  
          StateChartName: SCXMLD_SC_NAME,
          InstanceId: id,
          Event: event
        }, function (data) {
          res.send(data.data.toString());
      }, function (data) {
          res.send(500,{message : data.data.toString()});
      });
    }
  });

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
  });

  // error handlers

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
      app.use(function(err, req, res, next) {
          res.status(err.status || 500);
          res.render('error', {
              message: err.message,
              error: err
          });
      });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
          message: err.message,
          error: {}
      });
  });

  cb(null, app);
}
