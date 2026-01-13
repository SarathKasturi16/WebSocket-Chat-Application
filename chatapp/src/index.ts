import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ port: 8080 });

interface User {
    socket: WebSocket;
    room: string;
    username: string;
}

let users: User[] = [];

wss.on("connection", function(socket) {
    console.log("New client connected");
    
    socket.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log("Received:", data);

            if (data.type === "join") {
                users = users.filter(u => u.socket !== socket);
                
                users.push({
                    socket,
                    room: data.payload.roomId,
                    username: data.payload.username
                });

                broadcastToRoom(data.payload.roomId, {
                    type: "system",
                    message: `${data.payload.username} joined the room`,
                    timestamp: Date.now()
                }, socket);
            }

            if (data.type === "chat") {
                const sender = users.find(u => u.socket === socket);
                if (!sender) return;

                broadcastToRoom(sender.room, {
                    type: "chat",
                    payload: {
                        message: data.payload.message,
                        sender: sender.username,
                        roomId: sender.room
                    },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });

    socket.on("close", () => {
        const user = users.find(u => u.socket === socket);
        if (user) {
            users = users.filter(u => u.socket !== socket);
            broadcastToRoom(user.room, {
                type: "system",
                message: `${user.username} left the room`,
                timestamp: Date.now()
            });
        }
    });
});

function broadcastToRoom(roomId: string, message: any, excludeSocket?: WebSocket) {
    users.filter(u => u.room === roomId && u.socket !== excludeSocket)
         .forEach(user => {
             if (user.socket.readyState === WebSocket.OPEN) {
                 user.socket.send(JSON.stringify(message));
             }
         });
}

console.log("Server running on ws://localhost:8080");