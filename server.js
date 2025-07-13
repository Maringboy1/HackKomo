
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname));

let users = {};

io.on('connection', socket => {
  socket.on('join', ({ room, username }) => {
    socket.join(room);
    socket.room = room;
    socket.username = username;

    if (!users[room]) users[room] = [];
    users[room].push(username);

    io.to(room).emit('users', users[room]);

    const roomSockets = Array.from(io.sockets.adapter.rooms.get(room) || []);
    if (roomSockets.length > 1) {
      socket.to(room).emit('ready');
    }
  });

  socket.on('message', ({ room, username, msg }) => {
    io.to(room).emit('message', { username, msg });
  });

  socket.on('offer', ({ room, offer }) => {
    socket.to(room).emit('offer', { offer });
  });

  socket.on('answer', ({ room, answer }) => {
    socket.to(room).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ room, candidate }) => {
    socket.to(room).emit('ice-candidate', { candidate });
  });

  socket.on('disconnect', () => {
    const room = socket.room;
    if (room && users[room]) {
      users[room] = users[room].filter(name => name !== socket.username);
      io.to(room).emit('users', users[room]);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
