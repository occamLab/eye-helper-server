
/**
 * Module dependencies.
 */

/* some useful links:
http://nodejs.org/api/dgram.html
*/

var express = require('express');
var app = express();
var user = require('./routes/user');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var path = require('path');
var dgram = require('dgram');
var net = require('net');


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


var TCPPort = 9999;
var UDPPort = 8888;

// UDP shenanigans : communicating with the android phone
// see http://nodejs.org/api/dgram.html for more deets
var UDPserver = dgram.createSocket("udp4");

UDPserver.on("error", function (err) {
  console.log("server error:\n" + err.stack);
  server.close();
});

UDPserver.on("message", function (msg, rinfo) {
  console.log("server got: " + msg + " from " +
    rinfo.address + ":" + rinfo.port);
});

UDPserver.on("listening", function () {
  var address = UDPserver.address();
  console.log("UDP server listening on " +
      address.address + ":" + address.port);
});

UDPserver.bind(UDPPort);


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
  console.log('TCP server listening on port ' + TCPPort);
});



//socket.io things
io.sockets.on('connection', function (socket) {
  
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
