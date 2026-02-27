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
        aggregatedCountsByOption: {},
        scores: {}
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

export const joinRoom = (roomCode: string, studentId: string, nickname: string) => {
    const room = rooms.get(roomCode);
    if (room) {
        if (!room.scores[studentId]) {
            room.scores[studentId] = { points: 0, nickname };
        }
    }
};

export const startQuiz = (roomCode: string) => {
    const room = rooms.get(roomCode);
    const quiz = quizzes.get(roomCode);

    if (room && quiz && quiz.questions.length > 0) {
        room.status = 'active';
        room.currentQuestionIndex = 0;
        resetQuestionState(room, quiz.questions[0]);
    }
};

export const nextStep = (roomCode: string) => {
    const room = rooms.get(roomCode);
    const quiz = quizzes.get(roomCode);

    if (room && quiz) {
        if (room.status === 'active') {
            room.status = 'leaderboard';
        } else if (room.status === 'leaderboard') {
            if (room.currentQuestionIndex < quiz.questions.length - 1) {
                room.currentQuestionIndex++;
                room.status = 'active';
                resetQuestionState(room, quiz.questions[room.currentQuestionIndex]);
            } else {
                room.status = 'finished';
            }
        }
    }
};

export const recordAnswer = (roomCode: string, studentId: string, optionId: string): boolean => {
    const room = rooms.get(roomCode);
    const quiz = quizzes.get(roomCode);
    if (!room || !quiz || room.status !== 'active') return false;

    if (room.answeredPlayerIds.has(studentId)) {
        return false; // Already answered
    }

    room.answeredPlayerIds.add(studentId);

    if (room.aggregatedCountsByOption[optionId] !== undefined) {
        room.aggregatedCountsByOption[optionId]++;
    }

    // Scoring Logic (Kahoot style)
    const currentQuestion = quiz.questions[room.currentQuestionIndex];
    if (currentQuestion.correctOptionId === optionId) {
        const totalTime = currentQuestion.durationSeconds || 30;
        const timeLeft = Math.max(0, room.timerState);
        // Base points 1000, half of it is speed based
        const basePoints = 500;
        const speedPoints = Math.round((timeLeft / totalTime) * 500);
        const totalPoints = basePoints + speedPoints;

        if (room.scores[studentId]) {
            room.scores[studentId].points += totalPoints;
        }
    }

    return true;
};

const resetQuestionState = (room: RoomState, question: any) => {
    room.answeredPlayerIds.clear();
    room.aggregatedCountsByOption = {};
    question.options.forEach((opt: any) => {
        room.aggregatedCountsByOption[opt.id] = 0;
    });
    room.timerState = question.durationSeconds || 30;
    room.totalTimer = question.durationSeconds || 30;
};

export const serializeRoom = (room: RoomState) => {
    return {
        ...room,
        answeredPlayerIds: Array.from(room.answeredPlayerIds)
    };
};
