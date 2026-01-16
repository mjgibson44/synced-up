import { useGame } from '../../context/GameContext';
import { Timer } from './Timer';

export function ScoreDisplay() {
  const { state, leaveGame } = useGame();

  // Don't show on landing
  if (state.phase === 'landing') {
    return null;
  }

  const handleLeave = () => {
    if (confirm('Are you sure you want to leave the game?')) {
      leaveGame();
    }
  };

  // Leave button component
  const LeaveButton = () => (
    <button className="leave-button" onClick={handleLeave} title="Leave Game">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );

  // Lobby phase: just show leave button
  if (state.phase === 'lobby') {
    return (
      <div className="score-bar">
        <span className="score-bar-item">
          <span className="score-bar-phase">Lobby</span>
        </span>
        <LeaveButton />
      </div>
    );
  }

  // Gathering phase: show clue progress and timer
  if (state.phase === 'gathering') {
    const mySubmittedCount = state.myCluesSubmitted.filter((s) => s).length;

    return (
      <div className="score-bar">
        {state.cluesPerPlayer > 1 && (
          <span className="score-bar-item">
            <span className="score-bar-phase">Clue {mySubmittedCount + 1} of {state.cluesPerPlayer}</span>
          </span>
        )}
        <Timer timeRemaining={state.timeRemaining} />
        <LeaveButton />
      </div>
    );
  }

  // Guessing/reviewing/results phase: show round info and score
  const myScore = state.scores.find((s) => s.playerId === state.playerId);
  const showTimer = state.phase === 'guessing' && state.timeRemaining > 0;

  return (
    <div className="score-bar">
      {state.phase !== 'results' && state.totalRounds > 0 && (
        <span className="score-bar-item">
          <span className="score-bar-phase">Round {state.currentRound} of {state.totalRounds}</span>
        </span>
      )}
      {showTimer && <Timer timeRemaining={state.timeRemaining} />}
      {myScore && (
        <>
          <span className="score-bar-item">
            <span className="score-bar-label">Score:</span>
            <span className="score-bar-value">{myScore.totalPoints}</span>
          </span>
          {myScore.rank > 0 && (
            <span className="score-bar-item">
              <span className="score-bar-label">Rank:</span>
              <span className="score-bar-rank">#{myScore.rank}</span>
              <span className="score-bar-total">/{state.scores.length}</span>
            </span>
          )}
        </>
      )}
      <LeaveButton />
    </div>
  );
}
