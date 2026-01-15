
interface TimerProps {
  timeRemaining: number;
}

export function Timer({ timeRemaining }: TimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isLow = timeRemaining <= 30;

  return (
    <div className={`timer ${isLow ? 'timer-low' : ''}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
