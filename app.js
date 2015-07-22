#!/usr/bin/env node
'use strict';

var path = require('path');
var expresscion = require('expresscion'),
    urlModule = require('url'),
    SwaggerClient = require('swagger-client');

var express = require('express');

var hostUrl = process.env.HOST_URL || 'http://localhost:3000';
var parsedHostUrl = urlModule.parse(hostUrl);
var port = process.env.PORT || parsedHostUrl.port;

//start the server programmatically
expresscion.initExpress(__dirname + '/telephony.scxml', function (err, app) {
  var swagger;
  app.use('/app',express.static(path.join(__dirname, './app')));
  app.get('/',function(req,res){
    res.json({"twilio-protocol-adapter" : "1.0.0"});
  });
  app.get('/call/*',function(req, res){
    var id = req.query.CallSid;
    var relativePath = req.path;
    var phone = req.query.From;
    phone = Array(phone.length - 3).join('*') + phone.slice(phone.length - 3);

    swagger.scxml.getInstance({ InstanceId: id }, function (data) {
      if(relativePath === '/call/ended') {
        console.log('Call ended');

        swagger.scxml.deleteInstance({ InstanceId: id }, function () {
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
      swagger.scxml.createNamedInstance({ InstanceId: id }, 
      function(){
        console.log('instance created',id);
        //start the instance
        swagger.scxml.sendEvent(
          {  
            InstanceId: id,
            Event: {
              name : "system.start"
            }
          }, function(){
            console.log('instance started', id);
            afterGetInstance();
          }, 
          function (data) {
            res.send(500,{message : data.data.toString()});
          });

      },
      function(){
        console.log('Error creating instance');
        res.send(500);
      });
    });

    function afterGetInstance(){

      var eventName = relativePath.substring(1).split('/').join('.');
      var event = { name: eventName, data: { params: req.query }};
      console.log('event',event);

      swagger.scxml.sendEvent(
        {  
          InstanceId: id,
          Event: event
        }, function (data) {
          res.send(data.data.toString());
      }, function (data) {
          res.send(500,{message : data.data.toString()});
      });
    }
  });
  app.listen(port, function(){
    //use the swagger js client library to set up singleton instance
    swagger = new SwaggerClient({
      url: hostUrl + '/api/v3/smaas.json',
      success: function(){
        console.log('Successfully created swagger client');
      }
    }); 
  });
});

