var https = require('https'),
    urlModule = require('url');
var ar = "https://archive.org/";
var archive = {
    getPicksOfTheDay: function(cb){
        https.get(ar + "index.php?output=json", function(res){
            var s = "";
            res.on("data",function(data){
                s += data;
            });
            res.on("end",function(){
                var o = eval("(" + s + ")");    //this is evil, but there API doesn't return real JSON, so...
                cb(null,o.picks);
            });
        }).on("error",function(err){cb(err);});
    },
    getDetail: function(identifier,cb){
        https.get(ar + "details/" + identifier + "?output=json",function(res){
            var s = "";
            res.on("data",function(data){
                s += data;
            });
            res.on("end",function(){
                var o = JSON.parse(s);
                cb(null,o);
            });
        }).on("error",function(err){cb(err);});
    },
    getUrlsFromDetail: function(detail,cb){
        var server = detail.server;
        var dir = detail.dir;
        var urls = [];
        for(var file in detail.files){
            //TODO: filter files to make sure it's an mp3
            var url = "https://" + server + dir + file;
            urls.push(url);
        }
        return urls;
    }
};

module.exports = archive;
