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
    <div className="score-display">
      <div className="score-label">Score</div>
      <div className="score-value">{myScore.totalPoints}</div>
      {myScore.rank > 0 && (
        <div className="rank-info">
          Rank: <span className="rank-value">#{myScore.rank}</span> of {state.scores.length}
        </div>
      )}
    </div>
  );
}
