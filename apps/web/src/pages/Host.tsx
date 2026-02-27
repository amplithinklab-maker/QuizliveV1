import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import type { Quiz } from '../types';
import { Play, ChevronRight, RotateCcw, Maximize, Users, CheckCircle } from 'lucide-react';

interface SerializedRoomState {
    roomCode: string;
    hostSocketId: string;
    playersConnected: number;
    status: 'waiting' | 'active' | 'finished';
    currentQuestionIndex: number;
    timerState: number;
    answeredPlayerIds: string[];
    aggregatedCountsByOption: Record<string, number>;
}

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

    if (!quiz || !roomCode) return null;

    // WAITING STATE
    if (!room || room.status === 'waiting') {
        return (
            <div className="host-page animate-fade-in">
                <div className="host-waiting">
                    <div className="host-waiting-content">
                        <h1 className="host-room-code">{roomCode}</h1>
                        <p className="host-room-label">Room PIN</p>

                        <div className="host-join-url">
                            <span>{window.location.origin}/join/{roomCode}</span>
                        </div>

                        <div className="host-player-count">
                            <Users size={24} />
                            <span className="host-player-number">{room?.playersConnected || 0}</span>
                            <span className="host-player-label">connected</span>
                        </div>

                        <button
                            onClick={handleStart}
                            className="btn btn-primary btn-large host-start-btn"
                            disabled={!room || room.playersConnected === 0}
                        >
                            <Play size={22} />
                            <span>Start Activity</span>
                        </button>
                    </div>
                </div>

                <div className="host-toolbar">
                    <span className="host-toolbar-title">{quiz.title}</span>
                    <div className="host-toolbar-actions">
                        <button onClick={toggleFullscreen} className="btn btn-secondary btn-icon" title="Fullscreen">
                            <Maximize size={18} />
                        </button>
                    </div>
                </div>
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
                        <h1>Activity Finished</h1>
                        <p className="text-muted">{quiz.questions.length} questions completed</p>
                        <div className="host-finished-actions">
                            <button onClick={handleRestart} className="btn btn-primary btn-large">
                                <RotateCcw size={20} />
                                <span>New Session</span>
                            </button>
                            <button onClick={() => navigate('/')} className="btn btn-secondary btn-large">
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ACTIVE QUESTION STATE
    const currentQuestion = quiz.questions[room.currentQuestionIndex];
    const totalAnswered = room.answeredPlayerIds.length;
    const maxCount = Math.max(1, ...Object.values(room.aggregatedCountsByOption));
    const isLastQuestion = room.currentQuestionIndex === quiz.questions.length - 1;

    return (
        <div className="host-page animate-fade-in">
            <div className="host-active">
                {/* Question Header */}
                <div className="host-question-header">
                    <span className="host-question-number">
                        Question {room.currentQuestionIndex + 1} / {quiz.questions.length}
                    </span>
                    <h1 className="host-question-text">{currentQuestion.text}</h1>
                </div>

                {/* Bar Chart */}
                <div className="host-chart">
                    {currentQuestion.options.map((opt, idx) => {
                        const count = room.aggregatedCountsByOption[opt.id] || 0;
                        const pct = totalAnswered > 0 ? (count / maxCount) * 100 : 0;
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                        const color = colors[idx % colors.length];

                        return (
                            <div key={opt.id} className="host-bar-row">
                                <div className="host-bar-label">{opt.text}</div>
                                <div className="host-bar-track">
                                    <div
                                        className="host-bar-fill"
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: color,
                                            transition: 'width 0.5s ease-out'
                                        }}
                                    />
                                </div>
                                <div className="host-bar-count">{count}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Status Bar */}
                <div className="host-status-bar">
                    <div className="host-status-left">
                        <Users size={18} />
                        <span>{totalAnswered} / {room.playersConnected} responded</span>
                    </div>
                    <div className="host-status-right">
                        <button
                            onClick={handleNext}
                            className="btn btn-primary btn-large"
                        >
                            {isLastQuestion ? (
                                <>
                                    <CheckCircle size={20} />
                                    <span>Finish</span>
                                </>
                            ) : (
                                <>
                                    <span>Next Question</span>
                                    <ChevronRight size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom toolbar */}
            <div className="host-toolbar">
                <span className="host-toolbar-title">{quiz.title}</span>
                <div className="host-toolbar-actions">
                    <button onClick={toggleFullscreen} className="btn btn-secondary btn-icon" title="Fullscreen">
                        <Maximize size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
