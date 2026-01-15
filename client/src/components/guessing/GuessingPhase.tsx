import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Spectrum } from '../common/Spectrum';
import { Timer } from '../common/Timer';

export function GuessingPhase() {
  const { state, submitGuess, startNextRound, showFinalResults } = useGame();
  const [guess, setGuess] = useState(50);

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
    // Sort guesses by points (highest/best first)
    const sortedGuesses = [...state.roundResult.guesses].sort((a, b) => b.points - a.points);
    const actualPosition = state.roundResult.actualPosition;

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

          {/* Player guesses */}
          {sortedGuesses.map((g, i) => (
            <div key={g.playerId} className="guess-card">
              <div className="guess-card-header">
                <span className="guess-card-name">{g.playerName}</span>
                <span className={`guess-card-score ${g.points >= 80 ? 'high' : ''}`}>
                  {g.points === 100 ? 'Perfect! 100 pts' : `${g.points} pts`}
                </span>
              </div>
              <div className="guess-card-spectrum">
                <div className="mini-spectrum">
                  <div className="mini-spectrum-bar" />
                  <div
                    className="mini-spectrum-guess"
                    style={{ left: `${g.guess}%`, backgroundColor: getPlayerColor(i) }}
                    title={`Guess: ${g.guess}`}
                  />
                </div>
              </div>
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
        <div className="phase-header compact">
          <span className="round-label">Round {state.currentRound} of {state.totalRounds}</span>
          <Timer timeRemaining={state.timeRemaining} />
        </div>

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
      <div className="phase-header compact">
        <span className="round-label">Round {state.currentRound} of {state.totalRounds}</span>
        <Timer timeRemaining={state.timeRemaining} />
      </div>

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
