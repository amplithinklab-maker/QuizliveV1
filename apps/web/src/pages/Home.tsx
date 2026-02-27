import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Plus } from 'lucide-react';

export default function Home() {
    const [roomCode, setRoomCode] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e: FormEvent) => {
        e.preventDefault();
        if (roomCode.trim().length === 6) {
            navigate(`/join/${roomCode.toUpperCase()}`);
        }
    };

    return (
        <div className="page-home animate-fade-in">
            <div className="home-content">
                <h1 className="home-logo">LiveQuiz</h1>
                <p className="home-subtitle">Evaluación formativa en tiempo real</p>

                <div className="home-join-card">
                    <h2>Unirse a una Actividad</h2>
                    <form onSubmit={handleJoin}>
                        <input
                            type="text"
                            placeholder="PIN"
                            className="input home-pin-input"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase())}
                            maxLength={6}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="btn btn-primary btn-large btn-block"
                            disabled={roomCode.length !== 6}
                        >
                            <LogIn size={20} />
                            <span>Entrar</span>
                        </button>
                    </form>
                </div>

                <div className="home-divider"><span>o</span></div>

                <button
                    onClick={() => navigate('/create')}
                    className="btn btn-secondary btn-block"
                    style={{ marginTop: '0.75rem' }}
                >
                    <Plus size={18} />
                    <span>Crear Actividad (Anfitrión)</span>
                </button>
            </div>
            <footer className="footer-credits">
                Con cariño, Italo
            </footer>
        </div>
    );
}
