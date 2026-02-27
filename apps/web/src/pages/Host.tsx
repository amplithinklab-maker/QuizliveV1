import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import type { Quiz, SerializedRoomState } from '../types';
import { Play, ChevronRight, RotateCcw, Maximize, Users, CheckCircle, Trophy, AlarmClock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Host() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const { state } = useLocation() as { state: { quiz: Quiz } | null };
    const navigate = useNavigate();

    const [room, setRoom] = useState<SerializedRoomState | null>(null);
    const [quiz] = useState<Quiz | null>(state?.quiz || null);
    const [, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!quiz || !roomCode) {
            navigate('/');
            return;
        }

        socket.on('room_state_update', (updatedRoom: SerializedRoomState) => {
            setRoom(updatedRoom);
        });

        return () => {
            socket.off('room_state_update');
        };
    }, [quiz, roomCode, navigate]);

    const handleStart = useCallback(() => {
        if (roomCode) socket.emit('host_start_activity', roomCode);
    }, [roomCode]);

    const handleNext = useCallback(() => {
        if (roomCode) socket.emit('host_next_question', roomCode);
    }, [roomCode]);

    const handleRestart = useCallback(() => {
        if (!quiz) return;
        socket.emit('host_create_room', quiz, (response: any) => {
            if (response.success) {
                navigate(`/host/${response.roomCode}`, { state: { quiz } });
            }
        });
    }, [quiz, navigate]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    const sortedLeaderboard = useMemo(() => {
        if (!room?.scores) return [];
        return Object.entries(room.scores)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 5); // Top 5
    }, [room?.scores]);

    if (!quiz || !roomCode) return null;

    const joinUrl = `${window.location.origin}${window.location.pathname.includes('/QuizliveV1/') ? '/QuizliveV1' : ''}/#/join/${roomCode}`;

    // WAITING STATE
    if (!room || room.status === 'waiting') {
        return (
            <div className="host-page animate-fade-in">
                <div className="host-waiting">
                    <div className="host-waiting-layout">
                        <div className="host-qr-section">
                            <div className="host-qr-card">
                                <QRCodeSVG value={joinUrl} size={280} level="H" includeMargin={true} />
                                <div className="host-qr-hint">Scan to Join</div>
                            </div>
                        </div>

                        <div className="host-waiting-content">
                            <h1 className="host-room-code">{roomCode}</h1>
                            <p className="host-room-label">Room PIN</p>
                            <div className="host-join-url"><span>{joinUrl}</span></div>
                            <div className="host-player-count">
                                <Users size={24} />
                                <span className="host-player-number">{room?.playersConnected || 0}</span>
                                <span className="host-player-label">connected</span>
                            </div>
                            <button onClick={handleStart} className="btn btn-primary btn-large host-start-btn" disabled={!room || room.playersConnected === 0}>
                                <Play size={22} />
                                <span>Start Activity</span>
                            </button>
                        </div>
                    </div>
                </div>
                <HostToolbar title={quiz.title} toggleFullscreen={toggleFullscreen} />
            </div>
        );
    }

    // LEADERBOARD STATE
    if (room.status === 'leaderboard') {
        return (
            <div className="host-page animate-fade-in">
                <div className="host-leaderboard-view">
                    <div className="host-leaderboard-container">
                        <Trophy size={64} className="host-leaderboard-trophy" />
                        <h1 className="host-leaderboard-title">Leaderboard</h1>
                        <div className="host-leaderboard-list">
                            {sortedLeaderboard.map((player, idx) => (
                                <div key={player.id} className="host-leaderboard-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                                    <span className="host-leaderboard-rank">{idx + 1}</span>
                                    <span className="host-leaderboard-name">{player.nickname}</span>
                                    <span className="host-leaderboard-points">{player.points} pts</span>
                                </div>
                            ))}
                            {sortedLeaderboard.length === 0 && <p className="text-muted">No scores yet</p>}
                        </div>
                        <button onClick={handleNext} className="btn btn-primary btn-large mt-8">
                            <span>Next Question</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                <HostToolbar title={quiz.title} toggleFullscreen={toggleFullscreen} />
            </div>
        );
    }

    // FINISHED STATE
    if (room.status === 'finished') {
        return (
            <div className="host-page animate-fade-in">
                <div className="host-finished">
                    <div className="host-finished-content">
                        <CheckCircle size={64} className="host-finished-icon" />
                        <h1>Final Results</h1>
                        <div className="host-final-podium">
                            {sortedLeaderboard.slice(0, 3).map((player, idx) => (
                                <div key={player.id} className="host-podium-item">
                                    <div className={`host-podium-bar rank-${idx + 1}`} style={{ height: `${100 - idx * 20}%` }}>
                                        <span className="host-podium-rank">{idx + 1}</span>
                                    </div>
                                    <span className="host-podium-name">{player.nickname}</span>
                                    <span className="host-podium-score">{player.points}</span>
                                </div>
                            ))}
                        </div>
                        <div className="host-finished-actions">
                            <button onClick={handleRestart} className="btn btn-primary btn-large">
                                <RotateCcw size={20} />
                                <span>Play Again</span>
                            </button>
                            <button onClick={() => navigate('/')} className="btn btn-secondary btn-large">Exit</button>
                        </div>
                    </div>
                </div>
                <HostToolbar title={quiz.title} toggleFullscreen={toggleFullscreen} />
            </div>
        );
    }

    // ACTIVE QUESTION STATE
    const currentQuestion = quiz.questions[room.currentQuestionIndex];
    const totalAnswered = room.answeredPlayerIds.length;
    const maxCount = Math.max(1, ...Object.values(room.aggregatedCountsByOption));
    const timerPct = room.totalTimer ? (room.timerState / room.totalTimer) * 100 : 0;

    return (
        <div className="host-page animate-fade-in">
            {/* Timer Bar */}
            <div className="host-timer-bar-container">
                <div className="host-timer-bar-fill" style={{ width: `${timerPct}%`, backgroundColor: room.timerState < 5 ? '#ef4444' : 'var(--color-primary)' }} />
            </div>

            <div className="host-active">
                <div className="host-question-header">
                    <div className="host-question-meta">
                        <span className="host-question-number">Question {room.currentQuestionIndex + 1} / {quiz.questions.length}</span>
                        <div className="host-timer-display">
                            <AlarmClock size={20} />
                            <span>{room.timerState}s</span>
                        </div>
                    </div>
                    <h1 className="host-question-text">{currentQuestion.text}</h1>
                </div>

                <div className="host-chart">
                    {currentQuestion.options.map((opt, idx) => {
                        const count = room.aggregatedCountsByOption[opt.id] || 0;
                        const pct = totalAnswered > 0 ? (count / maxCount) * 100 : 0;
                        const isCorrect = currentQuestion.correctOptionId === opt.id;
                        // Hide answer reveal until time is up
                        const showAnswer = room.timerState === 0;
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                        const color = colors[idx % colors.length];

                        return (
                            <div key={opt.id} className={`host-bar-row ${isCorrect && showAnswer ? 'is-correct-glow' : ''}`}>
                                <div className="host-bar-label">
                                    {opt.text}
                                    {(isCorrect && showAnswer) && <CheckCircle size={16} className="ml-2 inline text-success" />}
                                </div>
                                <div className="host-bar-track">
                                    <div
                                        className="host-bar-fill"
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: color,
                                            boxShadow: (isCorrect && showAnswer) ? `0 0 15px ${color}` : 'none'
                                        }}
                                    />
                                </div>
                                <div className="host-bar-count">{count}</div>
                            </div>
                        );
                    })}
                </div>

                {(currentQuestion.explanation && room.timerState === 0) && (
                    <div className="host-explanation animate-slide-up">
                        <strong>Explanation:</strong> {currentQuestion.explanation}
                    </div>
                )}

                <div className="host-status-bar">
                    <div className="host-status-left">
                        <Users size={18} />
                        <span>{totalAnswered} / {room.playersConnected} responded</span>
                    </div>
                    <div className="host-status-right">
                        <button onClick={handleNext} className="btn btn-primary btn-large">
                            <span>Show Leaderboard</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
            <HostToolbar title={quiz.title} toggleFullscreen={toggleFullscreen} />
        </div>
    );
}

function HostToolbar({ title, toggleFullscreen }: { title: string, toggleFullscreen: () => void }) {
    return (
        <div className="host-toolbar">
            <span className="host-toolbar-title">{title}</span>
            <div className="host-toolbar-credits">Con cariño, Italo</div>
            <div className="host-toolbar-actions">
                <button onClick={toggleFullscreen} className="btn btn-secondary btn-icon" title="Fullscreen">
                    <Maximize size={18} />
                </button>
            </div>
        </div>
    );
}
