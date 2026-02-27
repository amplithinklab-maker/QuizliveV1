import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
    createRoom,
    removeHostRooms,
    addVoter,
    removeVoter,
    getRoom,
    getQuiz,
    startQuiz,
    nextQuestion,
    recordAnswer,
    serializeRoom
} from "./store";
import { Quiz } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

// Health check for Render
app.get("/", (req, res) => {
    res.send("LiveQuizV1 Server is active!");
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // --- HOST EVENTS ---

    socket.on("host_create_room", (quiz: Quiz, callback) => {
        const roomCode = createRoom(socket.id, quiz);
        socket.join(roomCode);
        console.log(`Host ${socket.id} created room ${roomCode}`);

        // Broadcast initial state to host
        const room = getRoom(roomCode);
        if (room) {
            io.to(roomCode).emit("room_state_update", serializeRoom(room));
        }

        if (callback) callback({ success: true, roomCode });
    });

    socket.on("host_start_activity", (roomCode: string) => {
        const room = getRoom(roomCode);
        if (room && room.hostSocketId === socket.id) {
            startQuiz(roomCode);
            io.to(roomCode).emit("room_state_update", serializeRoom(getRoom(roomCode)!));
        }
    });

    socket.on("host_next_question", (roomCode: string) => {
        const room = getRoom(roomCode);
        if (room && room.hostSocketId === socket.id) {
            nextQuestion(roomCode);
            io.to(roomCode).emit("room_state_update", serializeRoom(getRoom(roomCode)!));
        }
    });

    // --- PLAYER EVENTS ---

    socket.on("player_join", (roomCode: string, callback) => {
        const room = getRoom(roomCode);
        if (!room) {
            if (callback) callback({ success: false, error: "Room not found" });
            return;
        }

        socket.join(roomCode);
        addVoter(roomCode);

        // Associate this socket with a room for cleanup
        // @ts-ignore
        socket.data.roomCode = roomCode;

        io.to(roomCode).emit("room_state_update", serializeRoom(getRoom(roomCode)!));

        // Send quiz data only to the joined player
        const quiz = getQuiz(roomCode);
        if (callback) callback({ success: true, room: serializeRoom(room), quiz });
    });

    socket.on("player_answer", ({ roomCode, studentId, optionId }) => {
        const room = getRoom(roomCode);
        if (!room || room.status !== 'active') return;

        const success = recordAnswer(roomCode, studentId, optionId);
        if (success) {
            // Debounce this in a real app, for 50 players simple broadcast is fine
            io.to(roomCode).emit("room_state_update", serializeRoom(getRoom(roomCode)!));
        }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
        // Check if host disconnected
        removeHostRooms(socket.id);

        // Check if player disconnected
        // @ts-ignore
        const joinedRoom = socket.data.roomCode;
        if (joinedRoom) {
            removeVoter(joinedRoom);
            const room = getRoom(joinedRoom);
            if (room) {
                io.to(joinedRoom).emit("room_state_update", serializeRoom(room));
            }
        }

        console.log("Client disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`LiveQuizV1 Server running on port ${PORT}`);
});
