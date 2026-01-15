import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import {
  ServerEvents,
  ClientEvents,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  GameStartedPayload,
  ClueSlotsAssignedPayload,
  ClueSubmittedPayload,
  RoundStartedPayload,
  GuessSubmittedPayload,
  RoundResultsPayload,
  GameCompletePayload,
  TimerUpdatePayload,
  ErrorPayload,
  GameCreatedPayload,
  SpectrumRegeneratedPayload,
  ReturnToLobbyPayload,
} from 'shared';
import { GameState, GameAction, initialGameState } from '../types/game';

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };

    case 'SET_PLAYER_ID':
      return { ...state, playerId: action.payload };

    case 'GAME_CREATED':
      return {
        ...state,
        gameCode: action.payload.gameCode,
        gameUrl: action.payload.gameUrl,
        playerId: action.payload.playerId,
        isHost: true,
        phase: 'lobby',
      };

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: action.payload.players,
        phase: state.phase === 'landing' ? 'lobby' : state.phase,
      };

    case 'PLAYER_LEFT':
      return {
        ...state,
        players: action.payload.players,
      };

    case 'GAME_STARTED':
      return {
        ...state,
        phase: 'gathering',
        cluesPerPlayer: action.payload.cluesPerPlayer,
        timeRemaining: action.payload.timeLimit,
        myClueSlots: [],
        myCluesSubmitted: [],
        submittedClueCount: 0,
        totalClues: 0,
      };

    case 'CLUE_SLOTS_ASSIGNED':
      return {
        ...state,
        myClueSlots: action.payload.clueSlots,
        myCluesSubmitted: action.payload.clueSlots.map(() => false),
      };

    case 'CLUE_SUBMITTED':
      return {
        ...state,
        submittedClueCount: action.payload.submittedCount,
        totalClues: action.payload.totalClues,
      };

    case 'MY_CLUE_SUBMITTED': {
      const newMyCluesSubmitted = [...state.myCluesSubmitted];
      newMyCluesSubmitted[action.payload.clueIndex] = true;
      return {
        ...state,
        myCluesSubmitted: newMyCluesSubmitted,
      };
    }

    case 'SPECTRUM_REGENERATED': {
      const newClueSlots = [...state.myClueSlots];
      newClueSlots[action.payload.clueIndex] = action.payload.newSlot;
      return {
        ...state,
        myClueSlots: newClueSlots,
      };
    }

    case 'GATHERING_COMPLETE':
      return {
        ...state,
        phase: 'guessing',
      };

    case 'ROUND_STARTED':
      return {
        ...state,
        phase: 'guessing',
        currentRound: action.payload.roundNumber,
        totalRounds: action.payload.totalRounds,
        currentClue: action.payload.clue,
        currentAuthorId: action.payload.authorId,
        currentAuthorName: action.payload.authorName,
        spectrum: action.payload.spectrum,
        myGuessSubmitted: false,
        submittedGuessCount: 0,
        expectedGuessCount: action.payload.totalGuessers,
        roundResult: null,
      };

    case 'GUESS_SUBMITTED':
      return {
        ...state,
        submittedGuessCount: action.payload.submittedCount,
        expectedGuessCount: action.payload.totalGuessers,
      };

    case 'MY_GUESS_SUBMITTED':
      return {
        ...state,
        myGuessSubmitted: true,
      };

    case 'ROUND_RESULTS':
      return {
        ...state,
        roundResult: action.payload.roundResult,
        scores: action.payload.scores,
      };

    case 'GAME_COMPLETE':
      return {
        ...state,
        phase: 'results',
        finalScores: action.payload.finalScores,
        winner: action.payload.winner,
      };

    case 'TIMER_UPDATE':
      return {
        ...state,
        timeRemaining: action.payload.timeRemaining,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'RESET_GAME':
      return {
        ...initialGameState,
        connected: state.connected,
        playerId: state.playerId,
      };

    case 'SET_IS_HOST':
      return {
        ...state,
        isHost: action.payload,
      };

    case 'SET_GAME_CODE':
      return {
        ...state,
        gameCode: action.payload,
      };

    case 'RETURNED_TO_LOBBY':
      return {
        ...state,
        phase: 'lobby',
        players: action.payload.players,
        // Reset game state but keep connection info
        cluesPerPlayer: 1,
        myClueSlots: [],
        myCluesSubmitted: [],
        submittedClueCount: 0,
        totalClues: 0,
        spectrum: null,
        currentRound: 0,
        totalRounds: 0,
        currentClue: null,
        currentAuthorId: null,
        currentAuthorName: null,
        myGuessSubmitted: false,
        submittedGuessCount: 0,
        expectedGuessCount: 0,
        roundResult: null,
        timeRemaining: 0,
        scores: [],
        finalScores: [],
        winner: null,
      };

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  createGame: (hostName: string) => void;
  joinGame: (gameCode: string, playerName: string) => void;
  startGame: () => void;
  submitClue: (clue: string, clueIndex: number) => void;
  regenerateSpectrum: (clueIndex: number) => void;
  submitGuess: (guess: number) => void;
  startNextRound: () => void;
  showFinalResults: () => void;
  returnToLobby: () => void;
  leaveGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { socket, connected } = useSocket();
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  // Update connection state
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', payload: connected });
  }, [connected]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on(ServerEvents.GAME_CREATED, (payload: GameCreatedPayload) => {
      dispatch({ type: 'GAME_CREATED', payload });
    });

    socket.on(ServerEvents.PLAYER_JOINED, (payload: PlayerJoinedPayload) => {
      dispatch({ type: 'PLAYER_JOINED', payload: { players: payload.players } });
    });

    socket.on(ServerEvents.PLAYER_LEFT, (payload: PlayerLeftPayload) => {
      dispatch({ type: 'PLAYER_LEFT', payload: { players: payload.players } });
    });

    socket.on(ServerEvents.GAME_STARTED, (payload: GameStartedPayload) => {
      dispatch({
        type: 'GAME_STARTED',
        payload: { cluesPerPlayer: payload.cluesPerPlayer, timeLimit: payload.timeLimit },
      });
    });

    socket.on(ServerEvents.CLUE_SLOTS_ASSIGNED, (payload: ClueSlotsAssignedPayload) => {
      dispatch({ type: 'CLUE_SLOTS_ASSIGNED', payload: { clueSlots: payload.clueSlots } });
    });

    socket.on(ServerEvents.CLUE_SUBMITTED, (payload: ClueSubmittedPayload) => {
      dispatch({
        type: 'CLUE_SUBMITTED',
        payload: { submittedCount: payload.submittedCount, totalClues: payload.totalClues },
      });
    });

    socket.on(ServerEvents.SPECTRUM_REGENERATED, (payload: SpectrumRegeneratedPayload) => {
      dispatch({
        type: 'SPECTRUM_REGENERATED',
        payload: { clueIndex: payload.clueIndex, newSlot: payload.newSlot },
      });
    });

    socket.on(ServerEvents.GATHERING_COMPLETE, () => {
      dispatch({ type: 'GATHERING_COMPLETE' });
    });

    socket.on(ServerEvents.ROUND_STARTED, (payload: RoundStartedPayload) => {
      dispatch({ type: 'ROUND_STARTED', payload });
    });

    socket.on(ServerEvents.GUESS_SUBMITTED, (payload: GuessSubmittedPayload) => {
      dispatch({
        type: 'GUESS_SUBMITTED',
        payload: { submittedCount: payload.submittedCount, totalGuessers: payload.totalGuessers },
      });
    });

    socket.on(ServerEvents.ROUND_RESULTS, (payload: RoundResultsPayload) => {
      dispatch({ type: 'ROUND_RESULTS', payload });
    });

    socket.on(ServerEvents.GAME_COMPLETE, (payload: GameCompletePayload) => {
      dispatch({ type: 'GAME_COMPLETE', payload });
    });

    socket.on(ServerEvents.TIMER_UPDATE, (payload: TimerUpdatePayload) => {
      dispatch({ type: 'TIMER_UPDATE', payload: { timeRemaining: payload.timeRemaining } });
    });

    socket.on(ServerEvents.RETURNED_TO_LOBBY, (payload: ReturnToLobbyPayload) => {
      dispatch({ type: 'RETURNED_TO_LOBBY', payload: { players: payload.players } });
    });

    socket.on(ServerEvents.ERROR, (payload: ErrorPayload) => {
      dispatch({ type: 'SET_ERROR', payload: payload.message });
    });

    return () => {
      socket.off(ServerEvents.GAME_CREATED);
      socket.off(ServerEvents.PLAYER_JOINED);
      socket.off(ServerEvents.PLAYER_LEFT);
      socket.off(ServerEvents.GAME_STARTED);
      socket.off(ServerEvents.CLUE_SLOTS_ASSIGNED);
      socket.off(ServerEvents.CLUE_SUBMITTED);
      socket.off(ServerEvents.SPECTRUM_REGENERATED);
      socket.off(ServerEvents.GATHERING_COMPLETE);
      socket.off(ServerEvents.ROUND_STARTED);
      socket.off(ServerEvents.GUESS_SUBMITTED);
      socket.off(ServerEvents.ROUND_RESULTS);
      socket.off(ServerEvents.GAME_COMPLETE);
      socket.off(ServerEvents.TIMER_UPDATE);
      socket.off(ServerEvents.RETURNED_TO_LOBBY);
      socket.off(ServerEvents.ERROR);
    };
  }, [socket]);

  const createGame = useCallback(
    (hostName: string) => {
      if (socket) {
        socket.emit(ClientEvents.CREATE_GAME, { hostName });
      }
    },
    [socket]
  );

  const joinGame = useCallback(
    (gameCode: string, playerName: string) => {
      if (socket) {
        // Store the game code and player ID immediately when attempting to join
        dispatch({ type: 'SET_GAME_CODE', payload: gameCode.toUpperCase() });
        dispatch({ type: 'SET_PLAYER_ID', payload: socket.id });
        socket.emit(ClientEvents.JOIN_GAME, { gameCode, playerName });
      }
    },
    [socket]
  );

  const startGame = useCallback(() => {
    if (socket && state.gameCode) {
      socket.emit(ClientEvents.START_GAME, { gameCode: state.gameCode });
    }
  }, [socket, state.gameCode]);

  const submitClue = useCallback(
    (clue: string, clueIndex: number) => {
      if (socket && state.gameCode) {
        socket.emit(ClientEvents.SUBMIT_CLUE, { gameCode: state.gameCode, clue, clueIndex });
        dispatch({ type: 'MY_CLUE_SUBMITTED', payload: { clueIndex } });
      }
    },
    [socket, state.gameCode]
  );

  const regenerateSpectrum = useCallback(
    (clueIndex: number) => {
      if (socket && state.gameCode) {
        socket.emit(ClientEvents.REGENERATE_SPECTRUM, { gameCode: state.gameCode, clueIndex });
      }
    },
    [socket, state.gameCode]
  );

  const submitGuess = useCallback(
    (guess: number) => {
      if (socket && state.gameCode) {
        socket.emit(ClientEvents.SUBMIT_GUESS, { gameCode: state.gameCode, guess });
        dispatch({ type: 'MY_GUESS_SUBMITTED' });
      }
    },
    [socket, state.gameCode]
  );

  const startNextRound = useCallback(() => {
    if (socket && state.gameCode) {
      socket.emit(ClientEvents.START_NEXT_ROUND, { gameCode: state.gameCode });
    }
  }, [socket, state.gameCode]);

  const showFinalResults = useCallback(() => {
    if (socket && state.gameCode) {
      socket.emit(ClientEvents.SHOW_FINAL_RESULTS, { gameCode: state.gameCode });
    }
  }, [socket, state.gameCode]);

  const returnToLobby = useCallback(() => {
    if (socket && state.gameCode) {
      socket.emit(ClientEvents.RETURN_TO_LOBBY, { gameCode: state.gameCode });
    }
  }, [socket, state.gameCode]);

  const leaveGame = useCallback(() => {
    if (socket) {
      socket.emit(ClientEvents.LEAVE_GAME);
      dispatch({ type: 'RESET_GAME' });
    }
  }, [socket]);

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        createGame,
        joinGame,
        startGame,
        submitClue,
        regenerateSpectrum,
        submitGuess,
        startNextRound,
        showFinalResults,
        returnToLobby,
        leaveGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
