import React from 'react';
import { Spectrum as SpectrumType } from 'shared';

interface SpectrumProps {
  spectrum: SpectrumType;
  targetPosition?: number; // 0-100, optional marker
  guesses?: { position: number; label: string; color: string }[];
  showTarget?: boolean;
}

export function Spectrum({ spectrum, targetPosition, guesses, showTarget = false }: SpectrumProps) {
  return (
    <div className="spectrum-container">
      <div className="spectrum-labels">
        <span className="spectrum-label spectrum-label-left">{spectrum.left}</span>
        <span className="spectrum-label spectrum-label-right">{spectrum.right}</span>
      </div>
      <div className="spectrum-bar">
        <div className="spectrum-gradient" />
        {showTarget && targetPosition !== undefined && (
          <div
            className="spectrum-marker spectrum-marker-target"
            style={{ left: `${targetPosition}%` }}
            title={`Target: ${targetPosition}`}
          >
            <div className="marker-line" />
            <div className="marker-label">{targetPosition}</div>
          </div>
        )}
        {guesses?.map((guess, index) => (
          <div
            key={index}
            className="spectrum-marker spectrum-marker-guess"
            style={{ left: `${guess.position}%`, backgroundColor: guess.color }}
            title={`${guess.label}: ${guess.position}`}
          >
            <div className="marker-dot" style={{ backgroundColor: guess.color }} />
          </div>
        ))}
      </div>
    </div>
  );
}
