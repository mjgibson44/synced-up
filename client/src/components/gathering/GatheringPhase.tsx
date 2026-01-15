import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Spectrum } from '../common/Spectrum';
import { Timer } from '../common/Timer';

export function GatheringPhase() {
  const { state, submitClue, regenerateSpectrum } = useGame();
  const [clueText, setClueText] = useState('');

  // Find the current clue index (first unsubmitted clue)
  const currentClueIndex = state.myCluesSubmitted.findIndex((submitted) => !submitted);
  const allSubmitted = currentClueIndex === -1;
  const currentSlot = !allSubmitted ? state.myClueSlots[currentClueIndex] : null;

  // Clear clue text when moving to a new clue
  useEffect(() => {
    setClueText('');
  }, [currentClueIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clueText.trim() && currentClueIndex !== -1) {
      submitClue(clueText.trim(), currentClueIndex);
      setClueText('');
    }
  };

  const handleRegenerate = () => {
    if (currentClueIndex !== -1) {
      regenerateSpectrum(currentClueIndex);
    }
  };

  if (state.myClueSlots.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  // Count how many of my clues I've submitted
  const mySubmittedCount = state.myCluesSubmitted.filter((s) => s).length;

  return (
    <div className="gathering-phase">
      <div className="phase-header">
        <h1>Gathering Phase</h1>
        <Timer timeRemaining={state.timeRemaining} />
      </div>

      {!allSubmitted && currentSlot ? (
        <>
          {state.cluesPerPlayer > 1 && (
            <p className="clue-progress">
              Clue {mySubmittedCount + 1} of {state.cluesPerPlayer}
            </p>
          )}

          <div className="clue-slot">
            <div className="spectrum-section">
              <Spectrum spectrum={currentSlot.spectrum} targetPosition={currentSlot.target} showTarget />
            </div>

            <div className="target-info">
              <p>
                Target: <strong>{currentSlot.target}</strong>
              </p>
              <p className="hint">
                Write a clue that represents this position on the spectrum.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="clue-form">
              <div className="form-group">
                <input
                  type="text"
                  value={clueText}
                  onChange={(e) => setClueText(e.target.value)}
                  placeholder="Enter a word or phrase..."
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="clue-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRegenerate}
                >
                  New Spectrum
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!clueText.trim()}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="all-submitted-message">
          <p>All your clues are submitted! Waiting for other players...</p>
        </div>
      )}

      <div className="progress-info">
        <p>
          {state.submittedClueCount} of {state.totalClues} clues submitted
        </p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${state.totalClues > 0 ? (state.submittedClueCount / state.totalClues) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
