const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("user_connected", (userId) => {
        console.log(`${userId} connected`);
        onlineUsers.set(userId, socket.id);

        // Join user to their own "room"
        socket.join(userId);

        // Notify all contacts of this user
        socket.broadcast.emit("contact_online", userId);
    });

    socket.on("private_message", ({ sender, receiver, message }) => {
        console.log(`Message from ${sender} to ${receiver}: ${message}`);

        // Send message to the specific user (room)
        io.to(receiver).emit("new_message", { sender, message });
    });

    socket.on("disconnect", () => {
        let disconnectedUser;

        for (let [userId, id] of onlineUsers.entries()) {
            if (id === socket.id) {
                disconnectedUser = userId;
                onlineUsers.delete(userId);
                break;
            }
        }

        if (disconnectedUser) {
            console.log(`${disconnectedUser} disconnected`);
            socket.broadcast.emit("contact_offline", disconnectedUser);
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
