import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { parseQuizInput } from '../utils/parser';
import { socket } from '../utils/socket';

export default function Create() {
    const [inputRaw, setInputRaw] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleStart = () => {
        setError(null);
        const quiz = parseQuizInput(inputRaw);

        if (!quiz) {
            setError("Could not parse the input. Please ensure it's valid JSON or structured text.");
            return;
        }
        if (quiz.questions.length === 0) {
            setError("Quiz must have at least one question.");
            return;
        }

        setLoading(true);

        // Safety timeout: if server doesn't respond in 15s, show error
        const timeoutId = setTimeout(() => {
            setLoading(false);
            setError("The server is taking too long to respond. Please check if the Render URL is correct and the service is active.");
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

    const sampleJSON = JSON.stringify({
        title: "Introduction to AI",
        questions: [
            {
                text: "What does AI stand for?",
                options: [
                    { text: "Artificial Intelligence" },
                    { text: "Automated Inference" },
                    { text: "Abstract Information" }
                ],
                durationSeconds: 30
            },
            {
                text: "Which of these is a machine learning paradigm?",
                options: [
                    { text: "Supervised Learning" },
                    { text: "Magical Learning" },
                    { text: "Quantum Guessing" },
                    { text: "Abstract Reasoning" }
                ],
                durationSeconds: 30
            }
        ]
    }, null, 2);

    const sampleText = `Title: Introduction to AI

Q: What does AI stand for?
- Artificial Intelligence
- Automated Inference
- Abstract Information

Q: Which of these is a machine learning paradigm?
- Supervised Learning
- Magical Learning
- Quantum Guessing
- Abstract Reasoning`;

    return (
        <div className="page-create animate-fade-in">
            <div className="create-header">
                <button onClick={() => navigate('/')} className="btn btn-secondary btn-icon">
                    <ArrowLeft size={18} />
                    <span>Back</span>
                </button>
            </div>

            <div className="create-content">
                <h1 className="create-title">Create Activity</h1>
                <p className="create-subtitle">Paste your quiz in JSON or structured text format to start a live session.</p>

                <div className="create-card">
                    <div className="create-card-header">
                        <h2>Quiz Content</h2>
                        <div className="create-card-actions">
                            <button
                                className="btn-text"
                                onClick={() => setInputRaw(sampleText)}
                            >
                                Load Text Example
                            </button>
                            <button
                                className="btn-text"
                                onClick={() => setInputRaw(sampleJSON)}
                            >
                                Load JSON Example
                            </button>
                        </div>
                    </div>

                    <textarea
                        className="input textarea"
                        placeholder={`Paste JSON or structured text here...\n\nText format:\nTitle: My Quiz\nQ: First question?\n- Option A\n- Option B\n- Option C`}
                        value={inputRaw}
                        onChange={(e) => setInputRaw(e.target.value)}
                        rows={18}
                        spellCheck={false}
                    />

                    {error && (
                        <div className="error-box">
                            {error}
                        </div>
                    )}

                    <div className="create-card-footer">
                        <button
                            onClick={handleStart}
                            className="btn btn-primary btn-large"
                            disabled={!inputRaw.trim() || loading}
                        >
                            <Play size={20} />
                            <span>{loading ? 'Creating...' : 'Create & Present'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
