const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const logger = require("../config/logger");

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
    logger.info("A user connected:", socket.id);

    socket.on("user_connected", (userId) => {
        logger.info(`${userId} connected`);
        onlineUsers.set(userId, socket.id);

        // Join user to their own "room"
        socket.join(userId);

        // Notify all contacts of this user
        socket.broadcast.emit("contact_online", userId);
    });

    socket.on("private_message", ({ sender, receiver, message }) => {
        logger.info(`Message from ${sender} to ${receiver}: ${message}`);

        // Send message to the specific user (room)
        io.to(receiver).emit("new_message", { sender, message });
    });

    socket.on("disconnect", () => {
        let disconnectedUser;

        for (const [userId, id] of onlineUsers.entries()) {
            if (id === socket.id) {
                disconnectedUser = userId;
                onlineUsers.delete(userId);
                break;
            }
        }

        if (disconnectedUser) {
            logger.info(`${disconnectedUser} disconnected`);
            socket.broadcast.emit("contact_offline", disconnectedUser);
        }
    });
});

server.listen(3000, () => {
    logger.info("Server running on port 3000");
});
