var keypadMap = {
    2 : ['a','b','c'],
    3 : ['d','e','f'],
    4 : ['g','h','i'],
    5 : ['j','k','l'],
    6 : ['m','n','o'],
    7 : ['p','q','r','s'],
    8 : ['t','u','v'],
    9 : ['w','x','y','z']
};

var searchNumberToLabelMap = {
    1 : "creator",  //artist
    2 : "title"  //song
};

function performSearch(searchNumber, searchTerm, uuid){
    var self = this;
    //ok, first compute all combinations of letters from the search term.
    var letters = [];
    var failed = false;
    for(var i = 0; i < searchTerm.length; i++){
        var letter = keypadMap[searchTerm.charAt(i)];
        if(!letter) {
            var errorResult =    '<Response>' +
                                    '<Say>Please only enter digits between two and nine.</Say>' +
                                    '<Redirect method="GET">invalid-digits</Redirect>' + 
                                '</Response>';
            //res.writeHead(200, {'Content-Type': 'application/xml'});
            self.send({
              type:'http://scxml.io/httpLifecycle',
              targetexpr:'scxml://response/' + uuid,
              event:'response',
              data : errorResult
            });
            failed = true;
            break;
        }
        letters.push(letter);
    }
    if(failed) return;
    console.log("letters",letters);
    var combinations = [];
    for(i=0; i < letters[0].length; i++){
        for(var j=0; j < letters[1].length; j++){
            for(var k=0; k < letters[2].length; k++){
                combinations.push([letters[0][i],letters[1][j],letters[2][k]]);
            }
        }
    }
    //craft the query!
    var combinationStrings = combinations.map(function(c){return c.join("") + "*";});
    var q = searchNumberToLabelMap[searchNumber] + ':(' +   combinationStrings.join(" OR ")  + ') AND mediatype:etree';
    var url = 'https://archive.org/advancedsearch.php?&fl[]=identifier,title&rows=10&output=json&q=' + encodeURIComponent(q); 
    https.get(url,function(req){
        var s = "";
        req.on("data",function(data){
            s += data;
        });
        req.on("end",function(){
            var results = JSON.parse(s);
            //get the identifiers out and play the results
            //get details
            var docs = results.response.docs;
            var noMatchTxt = '<Response>' +
                                '<Say>Sorry, nothing matched that search.</Say>' +
                                '<Redirect method="GET">artist-not-found</Redirect>' + 
                            '</Response>';
            if(!docs.length){
                res.writeHead(200, {'Content-Type': 'application/xml'});
                res.end(noMatchTxt);
            }else{
    
                var tryDoc = function(){
                    var doc = docs.pop();
                    if(doc){
                        archive.getDetail(doc.identifier,function(err,detail){
                            var urls = archive.getUrlsFromDetail(detail).
                                        filter(function(url){return url.match(/.mp3$/);}).
                                        filter(function(url){return !url.match(/_vbr.mp3$/);});  //filter out vbr-encoded mp3s
                            if(urls.length){
                                console.log("urls to play",urls); 
                                var result = '<Response>' +
                                        '<Say>Playing the songs you selected.</Say>' +
                                        '<Say>Press star to listen to the next song. Press a digit to return to the main menu.</Say>' +
                                        '<Say>' +  doc.title.replace("&"," and ") + '</Say>' +
                                        '<Say>Please wait while the songs are loaded</Say>' +
                                        urls.map(function(url){return '<Gather numDigits="1" finishOnKey="*" action="started" method="GET" ><Play>' + url + "</Play></Gather>";}).join("\n")  + 
                                        '<Redirect method="GET">search-complete</Redirect>' + 
                                    '</Response>';
                                //res.writeHead(200, {'Content-Type': 'application/xml'});
                                self.send({
                                  type:'http://scxml.io/httpLifecycle',
                                  targetexpr:'scxml://response/' + uuid,
                                  event:'response',
                                  data : result
                                });
                            }else{
                                //try the next doc
                                tryDoc();
                            }
                        });
                    }else{
                        //res.writeHead(200, {'Content-Type': 'application/xml'});
                        self.send({
                          type:'http://scxml.io/httpLifecycle',
                          targetexpr:'scxml://response/' + uuid,
                          event:'response',
                          data : noMatchTxt
                        });
                    }
                };
                tryDoc();
            }
        });
    });
}

