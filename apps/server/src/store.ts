import { RoomState, Quiz, Option } from "./types";

// In-memory store
const rooms = new Map<string, RoomState>();
const quizzes = new Map<string, Quiz>();

const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = (hostSocketId: string, quiz: Quiz): string => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
        roomCode = generateRoomCode();
    }

    const newRoom: RoomState = {
        roomCode,
        hostSocketId,
        playersConnected: 0,
        status: 'waiting',
        currentQuestionIndex: 0,
        timerState: 0,
        answeredPlayerIds: new Set(),
        aggregatedCountsByOption: {}
    };

    rooms.set(roomCode, newRoom);
    quizzes.set(roomCode, quiz);

    return roomCode;
};

export const getRoom = (roomCode: string): RoomState | undefined => {
    return rooms.get(roomCode);
};

export const getQuiz = (roomCode: string): Quiz | undefined => {
    return quizzes.get(roomCode);
};

export const deleteRoom = (roomCode: string) => {
    rooms.delete(roomCode);
    quizzes.delete(roomCode);
};

export const removeHostRooms = (hostSocketId: string) => {
    for (const [code, room] of rooms.entries()) {
        if (room.hostSocketId === hostSocketId) {
            deleteRoom(code);
        }
    }
};

export const removeVoter = (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room && room.playersConnected > 0) {
        room.playersConnected--;
    }
};

export const addVoter = (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room) {
        room.playersConnected++;
    }
};

export const startQuiz = (roomCode: string) => {
    const room = rooms.get(roomCode);
    const quiz = quizzes.get(roomCode);

    if (room && quiz && quiz.questions.length > 0) {
        room.status = 'active';
        room.currentQuestionIndex = 0;
        resetQuestionState(room, quiz.questions[0].options);
    }
};

export const nextQuestion = (roomCode: string) => {
    const room = rooms.get(roomCode);
    const quiz = quizzes.get(roomCode);

    if (room && quiz) {
        if (room.currentQuestionIndex < quiz.questions.length - 1) {
            room.currentQuestionIndex++;
            resetQuestionState(room, quiz.questions[room.currentQuestionIndex].options);
        } else {
            room.status = 'finished';
        }
    }
};

export const recordAnswer = (roomCode: string, studentId: string, optionId: string): boolean => {
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'active') return false;

    if (room.answeredPlayerIds.has(studentId)) {
        return false; // Already answered
    }

    room.answeredPlayerIds.add(studentId);

    if (room.aggregatedCountsByOption[optionId] !== undefined) {
        room.aggregatedCountsByOption[optionId]++;
    } else {
        // Should not happen if initialized properly, but just in case
        room.aggregatedCountsByOption[optionId] = 1;
    }

    return true;
};

const resetQuestionState = (room: RoomState, options: Option[]) => {
    room.answeredPlayerIds.clear();
    room.aggregatedCountsByOption = {};
    options.forEach(opt => {
        room.aggregatedCountsByOption[opt.id] = 0;
    });
};

export const serializeRoom = (room: RoomState) => {
    // Convert Set to array for JSON serialization over socket
    return {
        ...room,
        answeredPlayerIds: Array.from(room.answeredPlayerIds)
    };
};
