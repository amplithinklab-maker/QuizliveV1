import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import type { Quiz } from '../types';

interface SerializedRoomState {
    roomCode: string;
    playersConnected: number;
    status: 'waiting' | 'active' | 'finished';
    currentQuestionIndex: number;
    timerState: number;
    answeredPlayerIds: string[];
    aggregatedCountsByOption: Record<string, number>;
}

export default function Join() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();

    const [studentName, setStudentName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [room, setRoom] = useState<SerializedRoomState | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);

    const [studentId] = useState(() => Math.random().toString(36).substring(2, 10));

    useEffect(() => {
        socket.on('room_state_update', (updatedRoom: SerializedRoomState) => {
            setRoom(updatedRoom);
        });

        return () => {
            socket.off('room_state_update');
        };
    }, []);

    const handleJoin = (e: FormEvent) => {
        e.preventDefault();
        if (!studentName.trim() || !roomCode) return;

        socket.emit('player_join', roomCode, (response: any) => {
            if (response.success) {
                setHasJoined(true);
                setRoom(response.room);
                setQuiz(response.quiz);
            } else {
                setError(response.error || 'Room not found');
            }
        });
    };

    const handleAnswer = (optionId: string) => {
        if (!roomCode || room?.status !== 'active') return;
        socket.emit('player_answer', { roomCode, studentId, optionId });
    };

    // Error
    if (error) {
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="card p-8 max-w-md w-full">
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-error)' }}>
                        Cannot Join
                    </h1>
                    <p className="text-muted mb-6">{error}</p>
                    <button onClick={() => navigate('/')} className="btn btn-secondary btn-block">
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    // Name Entry
    if (!hasJoined) {
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center animate-fade-in">
                <div className="card w-full max-w-md">
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem' }}>
                        Join Activity
                    </h1>
                    <p className="text-center text-muted mb-6">Room: <strong>{roomCode}</strong></p>

                    <form onSubmit={handleJoin} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Your Name"
                            className="input text-center"
                            style={{ fontSize: '1.125rem' }}
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            maxLength={20}
                            autoFocus
                            required
                        />
                        <button
                            type="submit"
                            className="btn btn-primary btn-large btn-block"
                            disabled={!studentName.trim()}
                        >
                            Enter
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Waiting
    if (room?.status === 'waiting') {
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="card p-8 max-w-md w-full">
                    <div className="animate-pulse mb-6">
                        <div style={{
                            width: '4rem', height: '4rem',
                            backgroundColor: 'var(--color-primary-light)',
                            borderRadius: '50%',
                            margin: '0 auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{
                                width: '1.5rem', height: '1.5rem',
                                backgroundColor: 'var(--color-primary)',
                                borderRadius: '50%'
                            }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>You're in!</h2>
                    <p className="text-muted" style={{ fontSize: '1.125rem' }}>Esperando inicio de la actividad...</p>
                </div>
            </div>
        );
    }

    // Finished
    if (room?.status === 'finished') {
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="card p-8 max-w-md w-full">
                    <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Activity Finished</h2>
                    <p className="text-muted mb-8" style={{ fontSize: '1.125rem' }}>Gracias por participar.</p>
                    <button onClick={() => navigate('/')} className="btn btn-secondary btn-block">Leave</button>
                </div>
            </div>
        );
    }

    // Active — Question
    if (room?.status === 'active' && quiz) {
        const currentQuestion = quiz.questions[room.currentQuestionIndex];
        const hasAnswered = Array.isArray(room.answeredPlayerIds) && room.answeredPlayerIds.includes(studentId);

        if (hasAnswered) {
            return (
                <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                    <div className="max-w-md w-full">
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                width: '5rem', height: '5rem',
                                backgroundColor: '#ecfdf5',
                                borderRadius: '50%',
                                margin: '0 auto 1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Respuesta registrada</h2>
                        </div>
                        <p className="text-muted">Esperando al resto de la clase...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="container min-h-screen flex flex-col" style={{ padding: '1.5rem' }}>
                <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-8">
                    <div className="mb-6">
                        <span style={{
                            fontSize: '0.813rem', fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                            display: 'block', marginBottom: '0.5rem'
                        }}>
                            Question {room.currentQuestionIndex + 1} of {quiz.questions.length}
                        </span>
                        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: 700, lineHeight: 1.3 }}>
                            {currentQuestion.text}
                        </h1>
                    </div>

                    <div className="flex flex-col gap-4 mt-auto mb-16">
                        {currentQuestion.options.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => handleAnswer(opt.id)}
                                className="btn btn-secondary join-option-btn"
                            >
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
