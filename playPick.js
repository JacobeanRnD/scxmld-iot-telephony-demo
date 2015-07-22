function playPick(uuid){
    var self = this;
    function handleError(err){
        //res.writeHead(500, {'Content-Type': 'text/plain'});
        self.send({
          type:'http://scxml.io/httpLifecycle',
          target:'scxml://response/' + uuid,
          event:'response',
          data : err.message
        });
    }
    archive.getPicksOfTheDay(function(err,picks){
        if(err) return handleError(err);
        archive.getDetail(picks.etree.identifier,function(err,detail){
            if(err) return handleError(err);
            var urls = archive.getUrlsFromDetail(detail).
                            filter(function(url){return url.match(/.mp3$/);}).
                            filter(function(url){return !url.match(/_vbr.mp3$/);});  //filter out vbr-encoded mp3s
            var result = '<Response>' +
                    '<Say>Playing the archive dot org Live music picks</Say>' +
                    '<Say>Press star to listen to the next song. Press a digit to return to the main menu.</Say>' +
                    '<Say>' +  picks.etree.title + '</Say>' +
                    '<Say>Please wait while the songs are loaded</Say>' +
                    urls.map(function(url){return '<Gather numDigits="1" finishOnKey="*" action="started" method="GET" ><Play>' + url + "</Play></Gather>";})  + 
                    '<Redirect method="GET">started</Redirect>' + 
                '</Response>';
            //res.writeHead(200, {'Content-Type': 'application/xml'});
            self.send({
              type:'http://scxml.io/httpLifecycle',
              target:'scxml://response/' + uuid,
              event:'response',
              data : result
            });
        });
    }); 
}
