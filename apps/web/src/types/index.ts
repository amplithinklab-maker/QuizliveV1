export interface Option {
    id: string;
    text: string;
}

export interface Question {
    id: string;
    text: string;
    options: Option[];
    durationSeconds?: number;
}

export interface Quiz {
    title: string;
    questions: Question[];
}

export interface RoomState {
    roomCode: string;
    hostSocketId: string;
    playersConnected: number;
    status: 'waiting' | 'active' | 'finished';
    currentQuestionIndex: number;
    timerState: number;
    answeredPlayerIds: Set<string>;
    aggregatedCountsByOption: Record<string, number>;
}
