import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameProvider, useGame } from './context/GameContext';
import { LandingPage } from './components/landing/LandingPage';
import { Lobby } from './components/lobby/Lobby';
import { GatheringPhase } from './components/gathering/GatheringPhase';
import { GuessingPhase } from './components/guessing/GuessingPhase';
import { FinalResults } from './components/results/FinalResults';
import { ScoreDisplay } from './components/common/ScoreDisplay';
import './styles/globals.css';

function GameRouter() {
  const { state } = useGame();

  if (!state.connected) {
    return (
      <div className="connecting">
        <p>Connecting to server...</p>
      </div>
    );
  }

  switch (state.phase) {
    case 'landing':
      return <LandingPage />;
    case 'lobby':
      return <Lobby />;
    case 'gathering':
      return <GatheringPhase />;
    case 'guessing':
      return <GuessingPhase />;
    case 'results':
      return <FinalResults />;
    default:
      return <LandingPage />;
  }
}

function JoinPage() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const { state } = useGame();

  if (!state.connected) {
    return (
      <div className="connecting">
        <p>Connecting to server...</p>
      </div>
    );
  }

  // If already in a game, show the appropriate phase
  if (state.phase !== 'landing') {
    return <GameRouter />;
  }

  return <LandingPage initialGameCode={gameCode} />;
}

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <GameProvider>
          <ScoreDisplay />
          <div className="app">
            <Routes>
              <Route path="/" element={<GameRouter />} />
              <Route path="/join/:gameCode" element={<JoinPage />} />
            </Routes>
          </div>
        </GameProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
