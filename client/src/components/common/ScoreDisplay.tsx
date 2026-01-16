import { useGame } from '../../context/GameContext';
import { Timer } from './Timer';

export function ScoreDisplay() {
  const { state, leaveGame, returnToLobby } = useGame();

  // Don't show on landing
  if (state.phase === 'landing') {
    return null;
  }

  // Check if all other players have left (host is alone in an active game)
  const isActiveGame = state.phase !== 'lobby' && state.phase !== 'landing';
  const allPlayersLeft = state.isHost && isActiveGame && state.players.length < 2;

  const handleLeave = () => {
    if (state.isHost && isActiveGame) {
      // Host ending the game returns everyone to lobby
      if (confirm('End the game and return everyone to the lobby?')) {
        returnToLobby();
      }
    } else {
      // Non-host or in lobby - just leave
      if (confirm('Are you sure you want to leave the game?')) {
        leaveGame();
      }
    }
  };

  const handleReturnToLobby = () => {
    returnToLobby();
  };

  // Leave button component
  const LeaveButton = () => (
    <button
      className="leave-button"
      onClick={handleLeave}
      title={state.isHost && isActiveGame ? "End Game" : "Leave Game"}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );

  // Modal for when all players have left
  const AllPlayersLeftModal = () => (
    <div className="modal-overlay">
      <div className="modal">
        <h2>All players have left the game</h2>
        <button className="btn btn-primary" onClick={handleReturnToLobby}>
          Return to Lobby
        </button>
      </div>
    </div>
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
    const allMyCluesSubmitted = mySubmittedCount >= state.cluesPerPlayer;

    return (
      <>
        <div className="score-bar">
          {state.cluesPerPlayer > 1 && !allMyCluesSubmitted && (
            <span className="score-bar-item">
              <span className="score-bar-phase">Clue {mySubmittedCount + 1} of {state.cluesPerPlayer}</span>
            </span>
          )}
          <Timer timeRemaining={state.timeRemaining} />
          <LeaveButton />
        </div>
        {allPlayersLeft && <AllPlayersLeftModal />}
      </>
    );
  }

  // Guessing/reviewing/results phase: show round info and score
  const myScore = state.scores.find((s) => s.playerId === state.playerId);
  const showTimer = state.phase === 'guessing' && state.timeRemaining > 0;

  return (
    <>
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
      {allPlayersLeft && <AllPlayersLeftModal />}
    </>
  );
}
