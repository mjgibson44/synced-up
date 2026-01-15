// Player types
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
}

// Spectrum types
export interface Spectrum {
  id: number;
  left: string;
  right: string;
}

// Clue slot assigned to player during gathering (each player may have multiple)
export interface ClueSlot {
  spectrum: Spectrum;
  target: number; // 0-100
}

// Clue submitted during Gathering phase
export interface Clue {
  playerId: string;
  playerName: string;
  clue: string;
  target: number; // 0-100, hidden until reveal
  spectrum: Spectrum; // The spectrum this clue is for
  clueIndex: number; // Which clue slot (0, 1, 2) this is for
}

// Individual guess during Guessing phase
export interface Guess {
  playerId: string;
  playerName: string;
  guess: number;
  distance: number; // how far from target
  points: number; // score (higher is better, max 100)
}

// Results for a single round
export interface RoundResult {
  roundNumber: number;
  clue: string;
  authorId: string;
  authorName: string;
  authorPoints: number; // Clue giver's score (median of guessers)
  actualPosition: number;
  guesses: Guess[];
}

// Final player score
export interface PlayerScore {
  playerId: string;
  playerName: string;
  totalPoints: number; // sum of points across all rounds (higher is better)
  roundScores: number[]; // points per round
  rank: number;
}

// Game phases
export type GamePhase = 'lobby' | 'gathering' | 'guessing' | 'reviewing' | 'results';

// Game configuration
export interface GameConfig {
  gatheringTimeLimit: number; // 180 seconds (3 minutes)
  guessingTimeLimit: number;  // 60 seconds (1 minute)
  betweenRoundsTimeLimit: number; // 30 seconds
  minPlayers: number;
  maxPlayers: number;
}

// Default configuration
export const DEFAULT_CONFIG: GameConfig = {
  gatheringTimeLimit: 180, // Not used directly anymore - calculated dynamically
  guessingTimeLimit: 60,
  betweenRoundsTimeLimit: 30,
  minPlayers: 2,
  maxPlayers: 10,
};

// Calculate clues per player based on player count
export function getCluesPerPlayer(playerCount: number): number {
  if (playerCount <= 3) return 3;
  if (playerCount <= 6) return 2;
  return 1;
}

// Calculate gathering time limit: 2 minutes per total clue
export function getGatheringTimeLimit(playerCount: number): number {
  const cluesPerPlayer = getCluesPerPlayer(playerCount);
  const totalClues = playerCount * cluesPerPlayer;
  return totalClues * 120; // 2 minutes (120 seconds) per clue
}

// Socket event names - Client to Server
export const ClientEvents = {
  CREATE_GAME: 'create_game',
  JOIN_GAME: 'join_game',
  REJOIN_GAME: 'rejoin_game',
  START_GAME: 'start_game',
  SUBMIT_CLUE: 'submit_clue',
  SUBMIT_GUESS: 'submit_guess',
  START_NEXT_ROUND: 'start_next_round',
  LEAVE_GAME: 'leave_game',
  REGENERATE_SPECTRUM: 'regenerate_spectrum',
  SHOW_FINAL_RESULTS: 'show_final_results',
  RETURN_TO_LOBBY: 'return_to_lobby',
} as const;

// Socket event names - Server to Client
export const ServerEvents = {
  GAME_CREATED: 'game_created',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STARTED: 'game_started',
  CLUE_SLOTS_ASSIGNED: 'clue_slots_assigned',
  CLUE_SUBMITTED: 'clue_submitted',
  GATHERING_COMPLETE: 'gathering_complete',
  ROUND_STARTED: 'round_started',
  GUESS_SUBMITTED: 'guess_submitted',
  ROUND_RESULTS: 'round_results',
  GAME_COMPLETE: 'game_complete',
  TIMER_UPDATE: 'timer_update',
  SPECTRUM_REGENERATED: 'spectrum_regenerated',
  RETURNED_TO_LOBBY: 'returned_to_lobby',
  REJOINED_GAME: 'rejoined_game',
  ERROR: 'error',
} as const;

// Payload types for socket events
export interface CreateGamePayload {
  hostName: string;
}

export interface JoinGamePayload {
  gameCode: string;
  playerName: string;
}

export interface StartGamePayload {
  gameCode: string;
}

export interface SubmitCluePayload {
  gameCode: string;
  clue: string;
  clueIndex: number; // Which clue slot (0, 1, 2)
}

export interface SubmitGuessPayload {
  gameCode: string;
  guess: number;
}

export interface GameCreatedPayload {
  gameCode: string;
  gameUrl: string;
  playerId: string;
}

export interface PlayerJoinedPayload {
  players: Player[];
  newPlayer: Player;
}

export interface PlayerLeftPayload {
  players: Player[];
  leftPlayerId: string;
}

export interface GameStartedPayload {
  phase: 'gathering';
  cluesPerPlayer: number;
  timeLimit: number; // in seconds
}

export interface ClueSlotsAssignedPayload {
  clueSlots: ClueSlot[]; // Array of {spectrum, target} for each clue slot
}

export interface ClueSubmittedPayload {
  playerId: string;
  clueIndex: number;
  submittedCount: number; // Total clues submitted across all players
  totalClues: number; // Total clues expected (players * cluesPerPlayer)
}

export interface RoundStartedPayload {
  roundNumber: number;
  totalRounds: number;
  clue: string;
  authorId: string;
  authorName: string;
  spectrum: Spectrum;
  totalGuessers: number;
}

export interface GuessSubmittedPayload {
  playerId: string;
  submittedCount: number;
  totalGuessers: number;
}

export interface RoundResultsPayload {
  roundResult: RoundResult;
  scores: PlayerScore[];
}

export interface GameCompletePayload {
  finalScores: PlayerScore[];
  winner: Player;
}

export interface TimerUpdatePayload {
  timeRemaining: number;
  phase: GamePhase;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

export interface RegenerateSpectrumPayload {
  gameCode: string;
  clueIndex: number;
}

export interface SpectrumRegeneratedPayload {
  clueIndex: number;
  newSlot: ClueSlot;
}

export interface ReturnToLobbyPayload {
  players: Player[];
}

export interface RejoinGamePayload {
  gameCode: string;
  playerName: string;
}

export interface RejoinedGamePayload {
  gameCode: string;
  playerId: string;
  isHost: boolean;
  players: Player[];
  phase: GamePhase;
  // Current game state depending on phase
  cluesPerPlayer?: number;
  timeRemaining?: number;
  myClueSlots?: ClueSlot[];
  myCluesSubmitted?: boolean[];
  submittedClueCount?: number;
  totalClues?: number;
  // Guessing phase state
  currentRound?: number;
  totalRounds?: number;
  currentClue?: string;
  currentAuthorId?: string;
  currentAuthorName?: string;
  spectrum?: Spectrum;
  myGuessSubmitted?: boolean;
  submittedGuessCount?: number;
  expectedGuessCount?: number;
  // Round results
  roundResult?: RoundResult;
  scores?: PlayerScore[];
  // Final results
  finalScores?: PlayerScore[];
  winner?: Player;
}
