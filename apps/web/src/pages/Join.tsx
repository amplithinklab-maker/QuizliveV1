import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import type { Quiz, SerializedRoomState } from '../types';
import { CheckCircle, XCircle, Award } from 'lucide-react';

export default function Join() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();

    const [studentName, setStudentName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [room, setRoom] = useState<SerializedRoomState | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [myStudentId, setMyStudentId] = useState<string | null>(null);
    const [lastAnswerId, setLastAnswerId] = useState<string | null>(null);

    useEffect(() => {
        socket.on('room_state_update', (updatedRoom: SerializedRoomState) => {
            setRoom(updatedRoom);
            // Reset answer for next question
            if (updatedRoom.status === 'active' && room?.currentQuestionIndex !== updatedRoom.currentQuestionIndex) {
                setLastAnswerId(null);
            }
        });

        return () => {
            socket.off('room_state_update');
        };
    }, [room?.currentQuestionIndex]);

    const handleJoin = (e: FormEvent) => {
        e.preventDefault();
        if (!studentName.trim() || !roomCode) return;

        socket.emit('player_join', roomCode, studentName, (response: any) => {
            if (response.success) {
                setHasJoined(true);
                setRoom(response.room);
                setQuiz(response.quiz);
                setMyStudentId(response.studentId);
            } else {
                setError(response.error || 'Room not found');
            }
        });
    };

    const handleAnswer = (optionId: string) => {
        if (!roomCode || room?.status !== 'active' || !myStudentId) return;
        setLastAnswerId(optionId);
        socket.emit('player_answer', { roomCode, studentId: myStudentId, optionId });
    };

    if (error) {
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="card p-8 max-w-md w-full">
                    <h1 className="text-error mb-4 font-bold text-2xl">Cannot Join</h1>
                    <p className="text-muted mb-6">{error}</p>
                    <button onClick={() => navigate('/')} className="btn btn-secondary btn-block">Return Home</button>
                </div>
            </div>
        );
    }

    if (!hasJoined) {
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center animate-fade-in">
                <div className="card w-full max-w-md">
                    <h1 className="text-center font-bold text-2xl mb-2">Join Activity</h1>
                    <p className="text-center text-muted mb-8">Room: <strong>{roomCode}</strong></p>
                    <form onSubmit={handleJoin} className="flex flex-col gap-6">
                        <input
                            type="text"
                            placeholder="Your Nickname"
                            className="input text-center text-xl"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            maxLength={15}
                            autoFocus
                            required
                        />
                        <button type="submit" className="btn btn-primary btn-large btn-block" disabled={!studentName.trim()}>
                            Enter
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (room?.status === 'waiting') {
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="card p-8 max-w-md w-full">
                    <div className="animate-pulse mb-8">
                        <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mx-auto">
                            <div className="w-8 h-8 bg-primary rounded-full" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">You're in, {studentName}!</h2>
                    <p className="text-muted text-lg">Waiting for the teacher to start...</p>
                </div>
            </div>
        );
    }

    if (room?.status === 'finished') {
        const myScore = myStudentId ? room.scores[myStudentId] : null;
        return (
            <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="card p-8 max-w-md w-full">
                    <Award size={64} className="mx-auto mb-6 text-primary" />
                    <h2 className="text-3xl font-bold mb-2">Well Done!</h2>
                    <p className="text-xl mb-8">Your final score: <strong className="text-primary">{myScore?.points || 0}</strong> pts</p>
                    <button onClick={() => navigate('/')} className="btn btn-secondary btn-block">Exit</button>
                </div>
            </div>
        );
    }

    if (room?.status === 'active' || room?.status === 'leaderboard') {
        if (!quiz) return null;
        const currentQuestion = quiz.questions[room.currentQuestionIndex];
        const hasAnswered = room.answeredPlayerIds.includes(myStudentId || '');
        const myScore = myStudentId ? room.scores[myStudentId] : { points: 0 };

        if (room.status === 'leaderboard') {
            const isCorrect = lastAnswerId === currentQuestion.correctOptionId;
            return (
                <div className={`container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in ${isCorrect ? 'bg-success-light' : 'bg-error-light'}`} style={{ backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2' }}>
                    <div className="p-8 max-w-md w-full">
                        {isCorrect ? (
                            <>
                                <CheckCircle size={80} className="mx-auto mb-6 text-success" />
                                <h1 className="text-4xl font-black mb-2 text-success">CORRECT!</h1>
                            </>
                        ) : (
                            <>
                                <XCircle size={80} className="mx-auto mb-6 text-error" />
                                <h1 className="text-4xl font-black mb-2 text-error">WRONG</h1>
                            </>
                        )}
                        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-border">
                            <p className="text-muted mb-1 font-semibold uppercase tracking-wider text-sm">Question Points</p>
                            <p className="text-3xl font-bold text-primary mb-4">{myScore.points} pts</p>
                            {currentQuestion.explanation && (
                                <p className="text-left text-sm border-t pt-4 mt-4 italic">"{currentQuestion.explanation}"</p>
                            )}
                        </div>
                        <p className="mt-8 text-muted animate-pulse">Stay tuned for the next one...</p>
                    </div>
                </div>
            );
        }

        if (hasAnswered) {
            return (
                <div className="container min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
                    <div className="max-w-md w-full">
                        <div className="mb-8">
                            <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={40} className="text-success" />
                            </div>
                            <h2 className="text-2xl font-bold">Answer Received!</h2>
                        </div>
                        <p className="text-muted text-lg">Waiting for the timer to end...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="container min-h-screen flex flex-col p-6 animate-fade-in">
                <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-4">
                    {/* Timer bar for player too */}
                    <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-8">
                        <div className="h-full bg-primary transition-all underline" style={{ width: `${(room.timerState / (room.totalTimer || 30)) * 100}%` }} />
                    </div>

                    <div className="mb-10">
                        <span className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">
                            Question {room.currentQuestionIndex + 1} of {quiz.questions.length}
                        </span>
                        <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                            {currentQuestion.text}
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-20">
                        {currentQuestion.options.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => handleAnswer(opt.id)}
                                className="btn btn-secondary player-option-btn text-lg py-6"
                            >
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
                <footer className="footer-credits">
                    Con cariño, Italo
                </footer>
            </div>
        );
    }

    return null;
}
