// Node.js WebSocket server script
const http = require('http');
const WebSocketServer = require('websocket').server;
const server = http.createServer();
server.listen(9898);

const wsServer = new WebSocketServer({
    httpServer: server
});

server.on('listening', () => {
    console.log("Listening on port 9898");
});

const allConnections = {};

wsServer.on('request', (request) => {
    const path = request.httpRequest.url;
    console.log(path);
    if (path.match(/^\/[A-Za-z0-9_-]+$/) == null) {
        console.log("Bad path requested:", path);
        request.reject();
        return;
    }

    const room = path.substr(1);
    if (allConnections[room] === undefined) {
        allConnections[room] = [];
    }
    const connections = allConnections[room];

    const connection = request.accept(null, request.origin);
    connections.push(connection);
    console.log("New user in room", room);

    connection.on('message', function(message) {
        console.log('Received Message:', message.utf8Data);
        //connection.sendUTF('Hi this is WebSocket server!');
        connections.forEach(otherConn => {
            if (otherConn !== connection) {
                otherConn.send(message.utf8Data);
            }
        });
    });
    connection.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.');
        connections.splice(connections.indexOf(connection), 1);
    });
});
