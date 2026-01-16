import { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { Spectrum } from '../common/Spectrum';

export function GatheringPhase() {
  const { state, submitClue, regenerateSpectrum } = useGame();
  const [clueText, setClueText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the current clue index (first unsubmitted clue)
  const currentClueIndex = state.myCluesSubmitted.findIndex((submitted) => !submitted);
  const allSubmitted = currentClueIndex === -1;
  const currentSlot = !allSubmitted ? state.myClueSlots[currentClueIndex] : null;

  // Clear clue text and focus input when moving to a new clue
  useEffect(() => {
    setClueText('');
    // Focus input after state updates
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [currentClueIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clueText.trim() && currentClueIndex !== -1) {
      submitClue(clueText.trim(), currentClueIndex);
      setClueText('');
      // Keep focus on input for next clue
      inputRef.current?.focus();
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

  return (
    <div className="gathering-phase">

      {!allSubmitted && currentSlot ? (
        <>
          <div className="clue-slot">
            <div className="spectrum-section">
              <Spectrum spectrum={currentSlot.spectrum} targetPosition={currentSlot.target} showTarget />
            </div>

            <form onSubmit={handleSubmit} className="clue-form">
              <div className="form-group">
                <input
                  ref={inputRef}
                  type="text"
                  value={clueText}
                  onChange={(e) => setClueText(e.target.value)}
                  placeholder="Enter a word or phrase..."
                  maxLength={200}
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
