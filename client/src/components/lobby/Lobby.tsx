import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';

export function Lobby() {
  const { state, startGame, leaveGame } = useGame();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (state.gameUrl) {
      try {
        await navigator.clipboard.writeText(state.gameUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = state.gameUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleCopyCode = async () => {
    if (state.gameCode) {
      try {
        await navigator.clipboard.writeText(state.gameCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <div className="lobby">
      <h1>Game Lobby</h1>

      <div className="lobby-code-section">
        <div className="game-code">
          <span className="label">Game Code:</span>
          <span className="code" onClick={handleCopyCode}>
            {state.gameCode}
          </span>
        </div>

        {state.gameUrl && (
          <div className="share-link">
            <button className="btn btn-secondary" onClick={handleCopyLink}>
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        )}
      </div>

      <div className="players-section">
        <h2>Players ({state.players.length})</h2>
        <ul className="player-list">
          {state.players.map((player) => (
            <li key={player.id} className={`player-item ${player.isHost ? 'is-host' : ''}`}>
              <span className="player-name">{player.name}</span>
              {player.isHost && <span className="host-badge">Host</span>}
              {player.id === state.playerId && <span className="you-badge">You</span>}
            </li>
          ))}
        </ul>
      </div>

      {state.error && <div className="error-message">{state.error}</div>}

      <div className="lobby-actions">
        <button className="btn btn-secondary" onClick={leaveGame}>
          Leave Game
        </button>
        {state.isHost && (
          <button
            className="btn btn-primary"
            onClick={startGame}
            disabled={state.players.length < 2}
          >
            Start Game
          </button>
        )}
      </div>

      {state.isHost && state.players.length < 2 && (
        <p className="waiting-message">Waiting for more players to join...</p>
      )}
      {!state.isHost && <p className="waiting-message">Waiting for host to start the game...</p>}
    </div>
  );
}
