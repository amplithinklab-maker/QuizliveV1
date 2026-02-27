export interface Option {
    id: string;
    text: string;
}

export interface Question {
    id: string;
    text: string;
    options: Option[];
    durationSeconds?: number;
    correctOptionId?: string;
    explanation?: string;
}

export interface Quiz {
    title: string;
    questions: Question[];
}

export interface RoomState {
    roomCode: string;
    hostSocketId: string;
    playersConnected: number;
    status: 'waiting' | 'active' | 'leaderboard' | 'finished';
    currentQuestionIndex: number;
    timerState: number;
    totalTimer?: number;
    answeredPlayerIds: Set<string>;
    aggregatedCountsByOption: Record<string, number>;
    scores: Record<string, { points: number, nickname: string }>;
}
