import { useGame } from '../../context/GameContext';

export function ScoreDisplay() {
  const { state } = useGame();

  // Only show after the first round has results
  if (state.phase === 'landing' || state.phase === 'lobby' || state.phase === 'gathering') {
    return null;
  }

  // Find current player's score
  const myScore = state.scores.find((s) => s.playerId === state.playerId);

  if (!myScore) {
    return null;
  }

  return (
    <div className="score-bar">
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
    </div>
  );
}
