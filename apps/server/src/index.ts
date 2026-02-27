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
    nextStep,
    joinRoom,
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

// Timer Management
const roomTimers: Record<string, NodeJS.Timeout> = {};

const stopTimer = (roomCode: string) => {
    if (roomTimers[roomCode]) {
        clearInterval(roomTimers[roomCode]);
        delete roomTimers[roomCode];
    }
};

const startTimer = (roomCode: string) => {
    stopTimer(roomCode);
    roomTimers[roomCode] = setInterval(() => {
        const room = getRoom(roomCode);
        if (!room) {
            stopTimer(roomCode);
            return;
        }

        if (room.status === 'active' && room.timerState > 0) {
            room.timerState--;
            // Broadcast every second
            io.to(roomCode).emit("room_state_update", serializeRoom(room));

            if (room.timerState <= 0) {
                // Time's up! Transition to leaderboard
                nextStep(roomCode);
                io.to(roomCode).emit("room_state_update", serializeRoom(room));
                stopTimer(roomCode);
            }
        } else {
            stopTimer(roomCode);
        }
    }, 1000);
};

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // --- HOST EVENTS ---

    socket.on("host_create_room", (quiz: Quiz, callback) => {
        const roomCode = createRoom(socket.id, quiz);
        socket.join(roomCode);
        console.log(`Host ${socket.id} created room ${roomCode}`);

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
            startTimer(roomCode);
            io.to(roomCode).emit("room_state_update", serializeRoom(getRoom(roomCode)!));
        }
    });

    socket.on("host_next_question", (roomCode: string) => {
        const room = getRoom(roomCode);
        if (room && room.hostSocketId === socket.id) {
            nextStep(roomCode);
            const updatedRoom = getRoom(roomCode);
            if (updatedRoom && updatedRoom.status === 'active') {
                startTimer(roomCode);
            } else {
                stopTimer(roomCode);
            }
            io.to(roomCode).emit("room_state_update", serializeRoom(updatedRoom!));
        }
    });

    // --- PLAYER EVENTS ---

    socket.on("player_join", (roomCode: string, nickname: string, callback: any) => {
        const room = getRoom(roomCode);
        if (!room) {
            if (callback) callback({ success: false, error: "Room not found" });
            return;
        }

        socket.join(roomCode);
        addVoter(roomCode);

        // nickname identifier (using socket.id as studentId for simplicity in the session)
        joinRoom(roomCode, socket.id, nickname);

        // Associate this socket with a room for cleanup
        // @ts-ignore
        socket.data.roomCode = roomCode;
        // @ts-ignore
        socket.data.nickname = nickname;

        io.to(roomCode).emit("room_state_update", serializeRoom(getRoom(roomCode)!));

        const quiz = getQuiz(roomCode);
        if (callback) callback({ success: true, room: serializeRoom(room), quiz, studentId: socket.id });
    });

    socket.on("player_answer", ({ roomCode, studentId, optionId }) => {
        const room = getRoom(roomCode);
        if (!room || room.status !== 'active') return;

        const success = recordAnswer(roomCode, studentId, optionId);
        if (success) {
            io.to(roomCode).emit("room_state_update", serializeRoom(getRoom(roomCode)!));
        }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
        removeHostRooms(socket.id);

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
