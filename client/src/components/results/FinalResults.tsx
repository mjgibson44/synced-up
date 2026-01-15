import { useGame } from '../../context/GameContext';

export function FinalResults() {
  const { state, returnToLobby } = useGame();

  return (
    <div className="final-results">
      <h1>Game Over!</h1>

      {state.winner && (
        <div className="winner-announcement">
          <span className="trophy">🏆</span>
          <h2>{state.winner.name} wins!</h2>
          <p>With {state.finalScores[0]?.totalPoints ?? 0} points!</p>
        </div>
      )}

      <div className="scoreboard">
        <h3>Final Scores</h3>
        <ol className="scores-list">
          {state.finalScores.map((score) => (
            <li
              key={score.playerId}
              className={`score-item ${score.playerId === state.playerId ? 'is-you' : ''}`}
            >
              <span className="rank">#{score.rank}</span>
              <span className="player-name">
                {score.playerName}
                {score.playerId === state.playerId && <span className="you-badge">You</span>}
              </span>
              <span className="total-score">{score.totalPoints} pts</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="results-actions">
        <button className="btn btn-primary" onClick={returnToLobby}>
          Play Again
        </button>
      </div>
    </div>
  );
}
