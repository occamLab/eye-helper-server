
/**
 * Module dependencies.
 */

/* some useful links:
http://nodejs.org/api/dgram.html
*/
var mkdirp = require('mkdirp');
var express = require('express');
var app = express();
var user = require('./routes/user');
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var path = require('path');
var dgram = require('dgram');
var net = require('net');
var fs = require('fs');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

io.set('log level', 1); //reduces logging


var file_name = 0;
var TCPPort = 9999;
var VideoPort = 8888;
var public_directory = path.join(__dirname, 'public');

function get_ip(req) {
  // http://stackoverflow.com/questions/8107856/how-can-i-get-the-users-ip-address-using-node-js
  var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
  ip = ip.split(", ")[0];
  return ip;
}

// Video Server: receiving video from the android phone
var VideoServer = http.createServer(function (req, res) {
  var ip = get_ip(req);
  console.log("received an image");
  var image_local_directory = path.join('/images', ip.split(".").join(""));
  var image_directory = path.join(public_directory,image_local_directory);

  mkdirp(image_directory, function(err){
    if (err) {
      console.error(err);
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('OK!');
    }
    else {
      var image_name = file_name + ".jpg";
      var image_local_path = path.join(image_local_directory, image_name);
      var image_path = path.join(public_directory, image_local_path);
      req.pipe(fs.createWriteStream(image_path));
      console.log("writing image to " + image_path);
      file_name = (file_name+1)%30;
      req.on('end', function(){
        io.sockets.emit('video_feed', {'image':image_local_path, 'phone':ip});
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('OK!');
      })
    }
  });
});

VideoServer.listen(VideoPort);


// TCP shenanigans: sending things to the phone
var phones = {}; //address: object

var TCPserver = net.createServer(function(socket) { //'connection' listener
  var address = socket.remoteAddress;
  phones[address] = socket;
  io.sockets.emit('phones', Object.keys(phones)); 

  console.log(address + ' connected');
  console.log('phones list: ')
  for (phone in phones) {
    console.log(phone);
  }
  socket.on('data', function(data) {
    console.log('received text from ' + address + ': ' + data.toString());
  });
  socket.on('end', function() {
    console.log(address + ' disconnected');
    delete phones[address];
    io.sockets.emit('phones', Object.keys(phones)); 
    console.log('phones list: ')
    for (phone in phones) {
      console.log(phone);
    }
  });
});
TCPserver.listen(TCPPort, function() { //'listening' listener
  console.log('Text server listening on port ' + TCPPort);
});



//socket.io things
io.sockets.on('connection', function (socket) {
  console.log("connection");
  socket.on('message', function (data) {
    console.log(data);
    phones[data.address].write(data.text + '\r\n');
  });
});



// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
  res.render('index', { title: 'eye-helper!!', phones:phones});
  }
);
app.get('/users', user.list);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
