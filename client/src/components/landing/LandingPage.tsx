import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';

interface LandingPageProps {
  initialGameCode?: string;
}

export function LandingPage({ initialGameCode }: LandingPageProps) {
  const { createGame, joinGame, state } = useGame();
  const [mode, setMode] = useState<'select' | 'host' | 'join'>(initialGameCode ? 'join' : 'select');
  const [name, setName] = useState('');
  const [gameCode, setGameCode] = useState(initialGameCode || '');

  const handleHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createGame(name.trim());
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && gameCode.trim()) {
      joinGame(gameCode.trim().toUpperCase(), name.trim());
    }
  };

  if (mode === 'select') {
    return (
      <div className="landing-page">
        <h1>Wavelength</h1>
        <p className="subtitle">A game of reading minds on a spectrum</p>
        <div className="landing-buttons">
          <button className="btn btn-primary" onClick={() => setMode('host')}>
            Host Game
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('join')}>
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'host') {
    return (
      <div className="landing-page">
        <h1>Host a Game</h1>
        <form onSubmit={handleHost} className="landing-form">
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
            />
          </div>
          {state.error && <div className="error-message">{state.error}</div>}
          <div className="form-buttons">
            <button type="button" className="btn btn-secondary" onClick={() => setMode('select')}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              Create Game
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <h1>Join a Game</h1>
      <form onSubmit={handleJoin} className="landing-form">
        <div className="form-group">
          <label htmlFor="gameCode">Game Code</label>
          <input
            id="gameCode"
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="Enter game code"
            maxLength={6}
            autoFocus={!initialGameCode}
          />
        </div>
        <div className="form-group">
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus={!!initialGameCode}
          />
        </div>
        {state.error && <div className="error-message">{state.error}</div>}
        <div className="form-buttons">
          <button type="button" className="btn btn-secondary" onClick={() => setMode('select')}>
            Back
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim() || !gameCode.trim()}
          >
            Join Game
          </button>
        </div>
      </form>
    </div>
  );
}
