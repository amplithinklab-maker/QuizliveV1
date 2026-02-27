import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Plus, Trash2, Clock, CheckCircle2, FileText, Code2, Save } from 'lucide-react';
import { parseQuizInput } from '../utils/parser';
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
    const [mode, setMode] = useState<'visual' | 'smart'>('visual');
    const [quiz, setQuiz] = useState<Quiz>(() => {
        const saved = localStorage.getItem('livequiz_draft');
        return saved ? JSON.parse(saved) : INITIAL_QUIZ;
    });
    const [importText, setImportText] = useState('');
    const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Live preview for smart import
    useEffect(() => {
        if (mode === 'smart' && importText.trim()) {
            const parsed = parseQuizInput(importText);
            setPreviewQuiz(parsed);
        } else {
            setPreviewQuiz(null);
        }
    }, [importText, mode]);

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

        // Validate that all questions have at least one option and a correct one marked
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

    const handleImportReplace = () => {
        if (previewQuiz) {
            setQuiz(previewQuiz);
            setMode('visual');
            setImportText('');
        }
    };

    const handleImportAppend = () => {
        if (previewQuiz) {
            setQuiz({
                ...quiz,
                questions: [...quiz.questions, ...previewQuiz.questions]
            });
            setMode('visual');
            setImportText('');
        }
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

                <div className="mode-toggle">
                    <button
                        className={`mode-btn ${mode === 'visual' ? 'active' : ''}`}
                        onClick={() => setMode('visual')}
                    >
                        <FileText size={16} />
                        <span>Visual Editor</span>
                    </button>
                    <button
                        className={`mode-btn ${mode === 'smart' ? 'active' : ''}`}
                        onClick={() => setMode('smart')}
                    >
                        <Code2 size={16} />
                        <span>Smart Import</span>
                    </button>
                </div>

                <button onClick={handleStart} className="btn btn-primary" disabled={loading || quiz.questions.length === 0}>
                    <Play size={18} />
                    <span>{loading ? '...' : 'Create & Present'}</span>
                </button>
            </div>

            <div className="create-container">
                {error && <div className="create-error-banner animate-slide-down">{error}</div>}

                {mode === 'visual' ? (
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
                ) : (
                    <div className="smart-import-view">
                        <div className="import-layout">
                            <div className="import-source">
                                <div className="import-area-header">
                                    <h3>Paste Text Here</h3>
                                    <div className="format-guide">
                                        <span>Use <b>*</b> for correct answer, <b>T:</b> for time, <b>E:</b> for explanation</span>
                                    </div>
                                </div>
                                <textarea
                                    className="import-textarea"
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    spellCheck={false}
                                    placeholder={`Title: My Awesome Quiz\n\nQ: What is 2+2?\n* 4\n- 5\n- 3\nT: 10\nE: Basic math addition.`}
                                />
                            </div>

                            <div className="import-preview">
                                <div className="preview-header">
                                    <h3>Detected Questions ({previewQuiz?.questions.length || 0})</h3>
                                    <div className="import-actions">
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            disabled={!previewQuiz}
                                            onClick={handleImportAppend}
                                        >
                                            Append to Current
                                        </button>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            disabled={!previewQuiz}
                                            onClick={handleImportReplace}
                                        >
                                            Replace Everything
                                        </button>
                                    </div>
                                </div>

                                <div className="preview-scroll">
                                    {!previewQuiz && <div className="empty-preview">Start typing or paste from ChatGPT...</div>}
                                    {previewQuiz?.questions.map((q, idx) => (
                                        <div key={idx} className="preview-q-card">
                                            <div className="preview-q-text">{q.text || "(No text detected)"}</div>
                                            <div className="preview-options">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className={`preview-opt ${q.correctOptionId === (opt as any).id || (opt as any)._isCorrect ? 'is-correct' : ''}`}>
                                                        {q.correctOptionId === (opt as any).id || (opt as any)._isCorrect ? <CheckCircle2 size={12} /> : <span>- </span>}
                                                        {opt.text}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="preview-meta">
                                                <span><Clock size={12} /> {q.durationSeconds}s</span>
                                                {q.explanation && <span className="text-success"><FileText size={12} /> Expl.</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="save-status">
                <Save size={14} />
                <span>Changes saved locally</span>
            </div>
        </div>
    );
}
