import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Plus, Trash2, Clock, CheckCircle2, Save } from 'lucide-react';
import { socket } from '../utils/socket';
import type { Quiz, Question } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_QUIZ: Quiz = {
    title: "My New Quiz",
    questions: [
        {
            id: generateId(),
            text: "How many planets are in our solar system?",
            options: [
                { id: generateId(), text: "7" },
                { id: generateId(), text: "8" },
                { id: generateId(), text: "9" }
            ],
            correctOptionId: "",
            durationSeconds: 30,
            explanation: "Pluto was reclassified as a dwarf planet in 2006."
        }
    ]
};

export default function Create() {
    const [quiz, setQuiz] = useState<Quiz>(() => {
        const saved = localStorage.getItem('livequiz_draft');
        return saved ? JSON.parse(saved) : INITIAL_QUIZ;
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Autosave
    useEffect(() => {
        localStorage.setItem('livequiz_draft', JSON.stringify(quiz));
    }, [quiz]);

    const handleStart = () => {
        setError(null);
        if (quiz.questions.length === 0) {
            setError("Quiz must have at least one question.");
            return;
        }

        const invalidQuestion = quiz.questions.find(q => q.options.length < 2);
        if (invalidQuestion) {
            setError(`Question "${invalidQuestion.text}" must have at least 2 options.`);
            return;
        }

        setLoading(true);
        const timeoutId = setTimeout(() => {
            setLoading(false);
            setError("The server is taking too long to respond. Please check the connection.");
        }, 15000);

        socket.emit('host_create_room', quiz, (response: any) => {
            clearTimeout(timeoutId);
            setLoading(false);
            if (response.success) {
                navigate(`/host/${response.roomCode}`, { state: { quiz } });
            } else {
                setError("Failed to create room. Please try again.");
            }
        });
    };

    // Visual State Helpers
    const updateQuestion = (index: number, updates: Partial<Question>) => {
        const newQuestions = [...quiz.questions];
        newQuestions[index] = { ...newQuestions[index], ...updates };
        setQuiz({ ...quiz, questions: newQuestions });
    };

    const addQuestion = () => {
        setQuiz({
            ...quiz,
            questions: [...quiz.questions, {
                id: generateId(),
                text: "",
                options: [
                    { id: generateId(), text: "" },
                    { id: generateId(), text: "" }
                ],
                durationSeconds: 30,
                correctOptionId: ""
            }]
        });
    };

    const removeQuestion = (index: number) => {
        const newQuestions = quiz.questions.filter((_, i) => i !== index);
        setQuiz({ ...quiz, questions: newQuestions });
    };

    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...quiz.questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[oIndex] = { ...newOptions[oIndex], text };
        newQuestions[qIndex].options = newOptions;
        setQuiz({ ...quiz, questions: newQuestions });
    };

    const addOption = (qIndex: number) => {
        updateQuestion(qIndex, {
            options: [...quiz.questions[qIndex].options, { id: generateId(), text: "" }]
        });
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const q = quiz.questions[qIndex];
        if (q.options.length <= 2) return;

        const optToRemoveId = q.options[oIndex].id;
        const newOptions = q.options.filter((_, i) => i !== oIndex);

        updateQuestion(qIndex, {
            options: newOptions,
            correctOptionId: q.correctOptionId === optToRemoveId ? "" : q.correctOptionId
        });
    };

    return (
        <div className="page-create animate-fade-in">
            <div className="create-header">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={18} />
                    <span>Home</span>
                </button>

                <div className="create-header-title">
                    <h2>Quiz Editor</h2>
                </div>

                <button onClick={handleStart} className="btn btn-primary" disabled={loading || quiz.questions.length === 0}>
                    <Play size={18} />
                    <span>{loading ? '...' : 'Create & Present'}</span>
                </button>
            </div>

            <div className="create-container">
                {error && <div className="create-error-banner animate-slide-down">{error}</div>}

                <div className="visual-editor">
                    <input
                        type="text"
                        className="quiz-title-input"
                        value={quiz.title}
                        onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                        placeholder="Quiz Title..."
                    />

                    <div className="questions-list">
                        {quiz.questions.map((q, qIdx) => (
                            <div key={q.id} className="question-card animate-fade-in">
                                <div className="q-card-header">
                                    <span className="q-number">Question {qIdx + 1}</span>
                                    <button onClick={() => removeQuestion(qIdx)} className="btn-icon-danger" title="Remove Question">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <textarea
                                    className="q-text-input"
                                    value={q.text}
                                    onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                                    placeholder="What is your question?"
                                    rows={2}
                                />

                                <div className="options-grid">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={opt.id} className={`option-item ${q.correctOptionId === opt.id ? 'is-correct' : ''}`}>
                                            <button
                                                className="correct-toggle"
                                                onClick={() => updateQuestion(qIdx, { correctOptionId: opt.id })}
                                                title="Mark as correct"
                                            >
                                                <CheckCircle2 size={20} />
                                            </button>
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                                placeholder={`Option ${oIdx + 1}`}
                                            />
                                            <button
                                                className="remove-option"
                                                onClick={() => removeOption(qIdx, oIdx)}
                                                disabled={q.options.length <= 2}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {q.options.length < 6 && (
                                        <button className="add-option-btn" onClick={() => addOption(qIdx)}>
                                            <Plus size={16} />
                                            <span>Add Option</span>
                                        </button>
                                    )}
                                </div>

                                <div className="q-card-footer">
                                    <div className="q-setting">
                                        <Clock size={16} />
                                        <span>Timer:</span>
                                        <select
                                            value={q.durationSeconds}
                                            onChange={(e) => updateQuestion(qIdx, { durationSeconds: parseInt(e.target.value) })}
                                        >
                                            <option value={5}>5s</option>
                                            <option value={10}>10s</option>
                                            <option value={20}>20s</option>
                                            <option value={30}>30s</option>
                                            <option value={60}>60s</option>
                                            <option value={120}>120s</option>
                                        </select>
                                    </div>
                                    <div className="q-setting flex-1">
                                        <input
                                            type="text"
                                            placeholder="Explanation (Optional)..."
                                            value={q.explanation || ''}
                                            onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                                            className="explanation-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="add-question-btn" onClick={addQuestion}>
                        <Plus size={20} />
                        <span>Add New Question</span>
                    </button>
                </div>
            </div>

            <div className="save-status">
                <Save size={14} />
                <span>Changes saved locally</span>
            </div>

            <footer className="footer-credits">
                Con cariño, Italo
            </footer>
        </div>
    );
}
