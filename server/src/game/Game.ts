import {
  Player,
  Spectrum,
  Clue,
  ClueSlot,
  Guess,
  RoundResult,
  PlayerScore,
  GamePhase,
  DEFAULT_CONFIG,
  getCluesPerPlayer,
  getGatheringTimeLimit,
} from 'shared';
import { getRandomSpectrum, getUniqueSpectrums } from '../data/spectrums';

export class Game {
  public code: string;
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public phase: GamePhase = 'lobby';

  // Gathering phase - each player has multiple clue slots
  private playerClueSlots: Map<string, ClueSlot[]> = new Map(); // playerId -> array of {spectrum, target}
  private playerSubmittedClues: Map<string, (string | null)[]> = new Map(); // playerId -> array of submitted clue texts (null if not submitted)
  public cluesPerPlayer: number = 1;

  // Guessing phase - flat array of all submitted clues
  private allClues: Clue[] = [];
  private clueOrder: number[] = []; // Indices into allClues array
  public currentRound: number = 0;
  private guesses: Map<string, number> = new Map(); // playerId -> guess for current round

  // Results
  private roundResults: RoundResult[] = [];
  private scores: Map<string, number[]> = new Map(); // playerId -> array of points per round

  // Timer
  public timerEndTime: number | null = null;

  public createdAt: Date = new Date();

  constructor(code: string, hostId: string, hostName: string) {
    this.code = code;
    this.hostId = hostId;
    this.addPlayer(hostId, hostName, true);
  }

  addPlayer(id: string, name: string, isHost: boolean = false): Player {
    const player: Player = {
      id,
      name,
      isHost,
      isConnected: true,
    };
    this.players.set(id, player);
    this.scores.set(id, []);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.playerClueSlots.delete(id);
    this.playerSubmittedClues.delete(id);
    this.scores.delete(id);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  getPlayersArray(): Player[] {
    return Array.from(this.players.values());
  }

  setPlayerConnected(id: string, connected: boolean): void {
    const player = this.players.get(id);
    if (player) {
      player.isConnected = connected;
    }
  }

  // Check if a player name is already taken
  isNameTaken(name: string): boolean {
    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === name.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  // Start the game - transition to gathering phase
  startGame(): { cluesPerPlayer: number; timeLimit: number } {
    this.phase = 'gathering';
    this.cluesPerPlayer = getCluesPerPlayer(this.players.size);
    const timeLimit = getGatheringTimeLimit(this.players.size);

    this.assignClueSlots();
    this.timerEndTime = Date.now() + timeLimit * 1000;

    return { cluesPerPlayer: this.cluesPerPlayer, timeLimit };
  }

  // Assign unique spectrums and targets to each player's clue slots
  private assignClueSlots(): void {
    const totalSlots = this.players.size * this.cluesPerPlayer;
    const spectrums = getUniqueSpectrums(totalSlots);

    let spectrumIndex = 0;
    for (const playerId of this.players.keys()) {
      const slots: ClueSlot[] = [];
      const submittedClues: (string | null)[] = [];

      for (let i = 0; i < this.cluesPerPlayer; i++) {
        slots.push({
          spectrum: spectrums[spectrumIndex],
          target: Math.floor(Math.random() * 101), // 0-100
        });
        submittedClues.push(null);
        spectrumIndex++;
      }

      this.playerClueSlots.set(playerId, slots);
      this.playerSubmittedClues.set(playerId, submittedClues);
    }
  }

  // Get a player's clue slots
  getPlayerClueSlots(playerId: string): ClueSlot[] {
    return this.playerClueSlots.get(playerId) || [];
  }

  // Regenerate a specific clue slot for a player
  regenerateSpectrum(playerId: string, clueIndex: number): ClueSlot | null {
    if (this.phase !== 'gathering') return null;

    const slots = this.playerClueSlots.get(playerId);
    const submitted = this.playerSubmittedClues.get(playerId);

    if (!slots || !submitted) return null;
    if (clueIndex < 0 || clueIndex >= slots.length) return null;
    if (submitted[clueIndex] !== null) return null; // Already submitted, can't regenerate

    // Get a new unique spectrum (avoiding currently assigned ones)
    const usedSpectrumIds = new Set<number>();
    for (const playerSlots of this.playerClueSlots.values()) {
      for (const slot of playerSlots) {
        usedSpectrumIds.add(slot.spectrum.id);
      }
    }

    const newSpectrum = getRandomSpectrum(usedSpectrumIds);
    const newSlot: ClueSlot = {
      spectrum: newSpectrum,
      target: Math.floor(Math.random() * 101),
    };

    slots[clueIndex] = newSlot;
    return newSlot;
  }

  // Submit a clue during gathering phase
  submitClue(playerId: string, clueText: string, clueIndex: number): boolean {
    if (this.phase !== 'gathering') return false;

    const player = this.players.get(playerId);
    const slots = this.playerClueSlots.get(playerId);
    const submitted = this.playerSubmittedClues.get(playerId);

    if (!player || !slots || !submitted) return false;
    if (clueIndex < 0 || clueIndex >= slots.length) return false;
    if (submitted[clueIndex] !== null) return false; // Already submitted this slot

    submitted[clueIndex] = clueText;
    return true;
  }

  hasSubmittedClue(playerId: string, clueIndex: number): boolean {
    const submitted = this.playerSubmittedClues.get(playerId);
    if (!submitted || clueIndex < 0 || clueIndex >= submitted.length) return false;
    return submitted[clueIndex] !== null;
  }

  getSubmittedClueCount(): number {
    let count = 0;
    for (const submitted of this.playerSubmittedClues.values()) {
      for (const clue of submitted) {
        if (clue !== null) count++;
      }
    }
    return count;
  }

  getTotalExpectedClues(): number {
    return this.players.size * this.cluesPerPlayer;
  }

  allCluesSubmitted(): boolean {
    return this.getSubmittedClueCount() === this.getTotalExpectedClues();
  }

  // Transition to guessing phase
  startGuessingPhase(): void {
    this.phase = 'guessing';
    this.currentRound = 0;
    this.allClues = [];

    // Build flat array of all submitted clues, ordered by clue index first
    // This ensures we cycle through all players' first clue, then second, etc.
    const playerIds = Array.from(this.players.keys());

    for (let clueIdx = 0; clueIdx < this.cluesPerPlayer; clueIdx++) {
      // Shuffle player order for each clue round
      const shuffledPlayerIds = [...playerIds];
      this.shuffleArray(shuffledPlayerIds);

      for (const playerId of shuffledPlayerIds) {
        const player = this.players.get(playerId);
        const slots = this.playerClueSlots.get(playerId);
        const submitted = this.playerSubmittedClues.get(playerId);

        if (!player || !slots || !submitted) continue;

        const clueText = submitted[clueIdx];
        if (clueText !== null) {
          this.allClues.push({
            playerId,
            playerName: player.name,
            clue: clueText,
            target: slots[clueIdx].target,
            spectrum: slots[clueIdx].spectrum,
            clueIndex: clueIdx,
          });
        }
      }
    }

    // Clue order is now already set correctly, just use sequential order
    this.clueOrder = this.allClues.map((_, i) => i);
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Start a new guessing round
  startNextRound(): { clue: Clue; roundNumber: number; totalRounds: number } | null {
    if (this.currentRound >= this.clueOrder.length) {
      return null; // No more rounds
    }

    // Set phase back to guessing (in case we're coming from reviewing)
    this.phase = 'guessing';
    this.guesses.clear();

    const clueIdx = this.clueOrder[this.currentRound];
    const clue = this.allClues[clueIdx];

    if (!clue) return null;

    this.timerEndTime = Date.now() + DEFAULT_CONFIG.guessingTimeLimit * 1000;

    return {
      clue,
      roundNumber: this.currentRound + 1,
      totalRounds: this.clueOrder.length,
    };
  }

  getCurrentClue(): Clue | null {
    if (this.currentRound >= this.clueOrder.length) return null;
    const clueIdx = this.clueOrder[this.currentRound];
    return this.allClues[clueIdx] || null;
  }

  // Submit a guess during guessing phase
  submitGuess(playerId: string, guess: number): boolean {
    if (this.phase !== 'guessing') return false;

    const currentClue = this.getCurrentClue();
    if (!currentClue) return false;

    // Can't guess on your own clue
    if (playerId === currentClue.playerId) return false;

    // Already guessed
    if (this.guesses.has(playerId)) return false;

    // Validate guess range
    if (guess < 0 || guess > 100) return false;

    this.guesses.set(playerId, guess);
    return true;
  }

  hasSubmittedGuess(playerId: string): boolean {
    return this.guesses.has(playerId);
  }

  getSubmittedGuessCount(): number {
    return this.guesses.size;
  }

  // Number of players who should guess (everyone except clue author)
  getExpectedGuessCount(): number {
    return this.players.size - 1;
  }

  allGuessesSubmitted(): boolean {
    return this.guesses.size === this.getExpectedGuessCount();
  }

  // Calculate points from distance using cosine curve
  private calculatePoints(distance: number): number {
    // cos(x/32) * 100 - allows negative scores for far guesses
    // 0 away = 100pts, 25 away = 71pts, 50 away = 0pts, 75 away = -62pts, 100 away = -100pts
    return Math.round(Math.cos(distance / 32) * 100);
  }

  // Calculate results for the current round
  calculateRoundResults(): RoundResult {
    const currentClue = this.getCurrentClue()!;
    const guesses: Guess[] = [];

    for (const [playerId, guessValue] of this.guesses) {
      const player = this.players.get(playerId);
      if (!player) continue;

      const distance = Math.abs(guessValue - currentClue.target);
      const points = this.calculatePoints(distance);

      guesses.push({
        playerId,
        playerName: player.name,
        guess: guessValue,
        distance,
        points,
      });

      // Update cumulative scores (now storing points, higher is better)
      const playerScores = this.scores.get(playerId) || [];
      playerScores.push(points);
      this.scores.set(playerId, playerScores);
    }

    // Sort guesses by points (highest first)
    guesses.sort((a, b) => b.points - a.points);

    const roundResult: RoundResult = {
      roundNumber: this.currentRound + 1,
      clue: currentClue.clue,
      authorId: currentClue.playerId,
      authorName: currentClue.playerName,
      actualPosition: currentClue.target,
      guesses,
    };

    this.roundResults.push(roundResult);
    this.currentRound++;

    return roundResult;
  }

  // Check if game is complete
  isGameComplete(): boolean {
    return this.currentRound >= this.clueOrder.length;
  }

  // Get current scores
  getScores(): PlayerScore[] {
    const playerScores: PlayerScore[] = [];

    for (const [playerId, roundScores] of this.scores) {
      const player = this.players.get(playerId);
      if (!player) continue;

      const totalPoints = roundScores.reduce((sum, pts) => sum + pts, 0);

      playerScores.push({
        playerId,
        playerName: player.name,
        totalPoints,
        roundScores,
        rank: 0, // Will be set after sorting
      });
    }

    // Sort by total points (highest first = best)
    playerScores.sort((a, b) => b.totalPoints - a.totalPoints);

    // Assign ranks
    playerScores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return playerScores;
  }

  // Transition to results phase
  finishGame(): void {
    this.phase = 'results';
    this.timerEndTime = null;
  }

  // Reset game to lobby state (for "Play Again")
  resetToLobby(): void {
    this.phase = 'lobby';
    this.playerClueSlots.clear();
    this.playerSubmittedClues.clear();
    this.allClues = [];
    this.clueOrder = [];
    this.currentRound = 0;
    this.guesses.clear();
    this.roundResults = [];
    this.timerEndTime = null;

    // Reset scores for all players
    for (const playerId of this.players.keys()) {
      this.scores.set(playerId, []);
    }
  }

  // Get time remaining in seconds
  getTimeRemaining(): number {
    if (!this.timerEndTime) return 0;
    const remaining = Math.max(0, Math.ceil((this.timerEndTime - Date.now()) / 1000));
    return remaining;
  }

  // Get total number of rounds
  getTotalRounds(): number {
    return this.clueOrder.length;
  }
}
