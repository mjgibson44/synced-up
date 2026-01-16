import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Spectrum } from '../common/Spectrum';

export function GuessingPhase() {
  const { state, submitGuess, startNextRound, showFinalResults } = useGame();
  const [guess, setGuess] = useState(50);

  // Reset guess to center when round changes
  useEffect(() => {
    setGuess(50);
  }, [state.currentRound]);

  const isClueAuthor = state.playerId === state.currentAuthorId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClueAuthor && !state.myGuessSubmitted) {
      submitGuess(guess);
    }
  };

  if (!state.spectrum) {
    return <div className="loading">Loading...</div>;
  }

  // Show round results if available (reviewing phase)
  if (state.roundResult) {
    const actualPosition = state.roundResult.actualPosition;

    // Helper to format round score with proper +/- prefix
    const formatRoundScore = (points: number) => {
      if (points === 100) return 'Perfect! +100';
      if (points >= 0) return `+${points}`;
      return `${points}`; // Negative numbers already have minus sign
    };

    // Combine guessers and clue giver into one list for sorting
    type PlayerResult = {
      playerId: string;
      playerName: string;
      roundPoints: number;
      totalScore: number;
      isClueGiver: boolean;
      guess?: number;
    };

    const allPlayers: PlayerResult[] = [
      // Add clue giver
      {
        playerId: state.roundResult.authorId,
        playerName: state.roundResult.authorName,
        roundPoints: state.roundResult.authorPoints,
        totalScore: state.scores.find(s => s.playerId === state.roundResult!.authorId)?.totalPoints ?? 0,
        isClueGiver: true,
      },
      // Add all guessers
      ...state.roundResult.guesses.map(g => ({
        playerId: g.playerId,
        playerName: g.playerName,
        roundPoints: g.points,
        totalScore: state.scores.find(s => s.playerId === g.playerId)?.totalPoints ?? 0,
        isClueGiver: false,
        guess: g.guess,
      })),
    ];

    // Sort by total game score
    allPlayers.sort((a, b) => b.totalScore - a.totalScore);

    return (
      <div className="guessing-phase results-view">
        <div className="phase-header">
          <h1>Round {state.currentRound} Results</h1>
        </div>

        <div className="round-info">
          <p className="clue-display">
            <span className="clue-author">{state.roundResult.authorName}'s clue:</span>
            <span className="clue-text">"{state.roundResult.clue}"</span>
          </p>
        </div>

        <div className="guesses-list-new">
          {/* Correct Answer card at top */}
          <div className="guess-card correct-answer-card">
            <div className="guess-card-header">
              <span className="guess-card-name correct-answer-label">Correct Answer</span>
            </div>
            <div className="guess-card-spectrum correct-answer-spectrum">
              <div className="mini-spectrum tall">
                <div className="mini-spectrum-bar" />
                <div
                  className="mini-spectrum-target"
                  style={{ left: `${actualPosition}%` }}
                />
              </div>
            </div>
          </div>

          {/* All players sorted by total score */}
          {allPlayers.map((p, i) => (
            <div key={p.playerId} className={`guess-card ${p.isClueGiver ? 'clue-giver-card' : ''}`}>
              <div className="guess-card-header">
                <span className="guess-card-name">
                  {p.playerName}
                  {p.isClueGiver && <span className="clue-giver-label"> (clue giver)</span>}
                </span>
                <span className="guess-card-scores">
                  <span className={`guess-card-round-score ${p.roundPoints >= 80 ? 'high' : ''}`}>
                    {formatRoundScore(p.roundPoints)}
                  </span>
                  <span className="guess-card-total-score">({p.totalScore} total)</span>
                </span>
              </div>
              {!p.isClueGiver && p.guess !== undefined && (
                <div className="guess-card-spectrum">
                  <div className="mini-spectrum">
                    <div className="mini-spectrum-bar" />
                    <div
                      className="mini-spectrum-guess"
                      style={{ left: `${p.guess}%`, backgroundColor: getPlayerColor(i) }}
                      title={`Guess: ${p.guess}`}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {state.currentRound < state.totalRounds && state.isHost && (
          <div className="between-rounds-actions">
            <button className="btn btn-primary" onClick={startNextRound}>
              Next Round
            </button>
          </div>
        )}
        {state.currentRound < state.totalRounds && !state.isHost && (
          <div className="between-rounds-actions">
            <p className="waiting-for-host">Waiting for host to start next round...</p>
          </div>
        )}
        {state.currentRound >= state.totalRounds && state.isHost && (
          <div className="between-rounds-actions">
            <button className="btn btn-primary" onClick={showFinalResults}>
              Show Final Summary
            </button>
          </div>
        )}
        {state.currentRound >= state.totalRounds && !state.isHost && (
          <div className="between-rounds-actions">
            <p className="waiting-for-host">Waiting for host to show results...</p>
          </div>
        )}
      </div>
    );
  }

  // Clue author view - show spectrum but no guess input
  if (isClueAuthor) {
    return (
      <div className="guessing-phase">
        <div className="round-info">
          <p className="clue-display">
            <span className="clue-author">Your clue:</span>
            <span className="clue-text">"{state.currentClue}"</span>
          </p>
        </div>

        <div className="spectrum-section">
          <Spectrum spectrum={state.spectrum} />
        </div>

        <div className="author-waiting">
          <div className="author-message">
            <h2>Waiting for guesses...</h2>
            <p>Other players are guessing where your clue falls on the spectrum.</p>
          </div>

          <div className="progress-info">
            <p>
              {state.submittedGuessCount} of {state.expectedGuessCount} players have guessed
            </p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(state.submittedGuessCount / Math.max(1, state.expectedGuessCount)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular player view - show spectrum labels and guess input
  return (
    <div className="guessing-phase">
      <div className="round-info">
        <p className="clue-display">
          <span className="clue-author">{state.currentAuthorName}'s clue:</span>
          <span className="clue-text">"{state.currentClue}"</span>
        </p>
      </div>

      {!state.myGuessSubmitted ? (
        <form onSubmit={handleSubmit} className="guess-form">
          <div className="guess-input-section">
            <div className="spectrum-labels-inline">
              <span className="spectrum-label-left">{state.spectrum.left}</span>
              <span className="spectrum-label-right">{state.spectrum.right}</span>
            </div>
            <input
              id="guess"
              type="range"
              min="0"
              max="100"
              value={guess}
              onChange={(e) => setGuess(parseInt(e.target.value))}
              className="guess-slider"
            />
          </div>
          <div className="guess-submit-container">
            <button type="submit" className="btn btn-primary">
              Submit Guess
            </button>
          </div>
        </form>
      ) : (
        <div className="submitted-message">
          <p>Guess submitted! Waiting for other players...</p>
        </div>
      )}

      <div className="progress-info">
        <p>
          {state.submittedGuessCount} of {state.expectedGuessCount} players have guessed
        </p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${(state.submittedGuessCount / Math.max(1, state.expectedGuessCount)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function getPlayerColor(index: number): string {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
  ];
  return colors[index % colors.length];
}
