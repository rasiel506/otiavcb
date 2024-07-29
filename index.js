const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const users = {};  // Stores users in each room
const socketToRoom = {};  // Maps sockets to room IDs
const PORT = 5000;

io.on("connection", (socket) => {
  socket.on("join room", ({ roomID, user }) => {
    if (users[roomID]) {
      users[roomID].push({ userId: socket.id, user });
    } else {
      users[roomID] = [{ userId: socket.id, user }];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter(
      (user) => user.userId !== socket.id
    );

    socket.emit("all users", usersInThisRoom);
    io.emit("active rooms", Object.keys(users)); // Emit active rooms
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
      user: payload.user,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("send message", (payload) => {
    io.emit("message", payload);
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((item) => item.userId !== socket.id);
      users[roomID] = room;
      if (users[roomID].length === 0) {
        delete users[roomID];  // Remove the room if empty
      }
    }
    socket.broadcast.emit("user left", socket.id);
    io.emit("active rooms", Object.keys(users)); // Update active rooms
  });
});

server.listen(PORT, () =>
  console.log(`Server is running on port http://localhost:${PORT}`)
);
