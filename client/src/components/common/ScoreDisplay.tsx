import { useGame } from '../../context/GameContext';
import { Timer } from './Timer';

export function ScoreDisplay() {
  const { state } = useGame();

  // Don't show on landing or lobby
  if (state.phase === 'landing' || state.phase === 'lobby') {
    return null;
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
    </div>
  );
}
