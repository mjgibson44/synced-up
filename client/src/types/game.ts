import { Player, Spectrum, RoundResult, PlayerScore, GamePhase, ClueSlot, RejoinedGamePayload } from 'shared';

export interface GameState {
  // Connection
  connected: boolean;
  playerId: string | null;
  playerName: string | null; // Track player name for rejoin

  // Game info
  gameCode: string | null;
  gameUrl: string | null;
  isHost: boolean;

  // Players
  players: Player[];

  // Game phase
  phase: GamePhase | 'landing';

  // Gathering phase - multiple clue slots per player
  cluesPerPlayer: number;
  myClueSlots: ClueSlot[]; // Array of {spectrum, target} for each clue
  myCluesSubmitted: boolean[]; // Track which clues have been submitted
  submittedClueCount: number;
  totalClues: number;

  // Guessing phase
  spectrum: Spectrum | null; // Current round's spectrum
  currentRound: number;
  totalRounds: number;
  currentClue: string | null;
  currentAuthorId: string | null;
  currentAuthorName: string | null;
  myGuessSubmitted: boolean;
  submittedGuessCount: number;
  expectedGuessCount: number;

  // Round results
  roundResult: RoundResult | null;

  // Timer
  timeRemaining: number;

  // Results
  scores: PlayerScore[];
  finalScores: PlayerScore[];
  winner: Player | null;

  // Error
  error: string | null;
}

export type GameAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_PLAYER_ID'; payload: string }
  | { type: 'GAME_CREATED'; payload: { gameCode: string; gameUrl: string; playerId: string } }
  | { type: 'PLAYER_JOINED'; payload: { players: Player[] } }
  | { type: 'PLAYER_LEFT'; payload: { players: Player[] } }
  | { type: 'GAME_STARTED'; payload: { cluesPerPlayer: number; timeLimit: number } }
  | { type: 'CLUE_SLOTS_ASSIGNED'; payload: { clueSlots: ClueSlot[] } }
  | { type: 'CLUE_SUBMITTED'; payload: { submittedCount: number; totalClues: number } }
  | { type: 'MY_CLUE_SUBMITTED'; payload: { clueIndex: number } }
  | { type: 'SPECTRUM_REGENERATED'; payload: { clueIndex: number; newSlot: ClueSlot } }
  | { type: 'GATHERING_COMPLETE' }
  | { type: 'ROUND_STARTED'; payload: { roundNumber: number; totalRounds: number; clue: string; authorId: string; authorName: string; spectrum: Spectrum; totalGuessers: number } }
  | { type: 'GUESS_SUBMITTED'; payload: { submittedCount: number; totalGuessers: number } }
  | { type: 'MY_GUESS_SUBMITTED' }
  | { type: 'ROUND_RESULTS'; payload: { roundResult: RoundResult; scores: PlayerScore[] } }
  | { type: 'GAME_COMPLETE'; payload: { finalScores: PlayerScore[]; winner: Player | null } }
  | { type: 'TIMER_UPDATE'; payload: { timeRemaining: number } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_GAME' }
  | { type: 'SET_IS_HOST'; payload: boolean }
  | { type: 'SET_GAME_CODE'; payload: string }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'RETURNED_TO_LOBBY'; payload: { players: Player[] } }
  | { type: 'REJOINED_GAME'; payload: RejoinedGamePayload };

export const initialGameState: GameState = {
  connected: false,
  playerId: null,
  playerName: null,
  gameCode: null,
  gameUrl: null,
  isHost: false,
  players: [],
  phase: 'landing',
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
  error: null,
};
