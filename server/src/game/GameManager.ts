import { Game } from './Game';
import { generateGameCode } from '../utils/codeGenerator';

export class GameManager {
  private games: Map<string, Game> = new Map();
  private playerToGame: Map<string, string> = new Map(); // playerId -> gameCode

  createGame(hostId: string, hostName: string): Game {
    let code: string;

    // Generate unique code
    do {
      code = generateGameCode();
    } while (this.games.has(code));

    const game = new Game(code, hostId, hostName);
    this.games.set(code, game);
    this.playerToGame.set(hostId, code);

    return game;
  }

  getGame(code: string): Game | undefined {
    return this.games.get(code);
  }

  gameExists(code: string): boolean {
    return this.games.has(code);
  }

  getGameByPlayerId(playerId: string): Game | undefined {
    const code = this.playerToGame.get(playerId);
    if (!code) return undefined;
    return this.games.get(code);
  }

  joinGame(code: string, playerId: string, playerName: string): Game | null {
    const game = this.games.get(code);
    if (!game) return null;

    // Can only join during lobby phase
    if (game.phase !== 'lobby') return null;

    // Check if name is taken
    if (game.isNameTaken(playerName)) return null;

    game.addPlayer(playerId, playerName);
    this.playerToGame.set(playerId, code);

    return game;
  }

  removePlayer(playerId: string): { game: Game; wasHost: boolean } | null {
    const code = this.playerToGame.get(playerId);
    if (!code) return null;

    const game = this.games.get(code);
    if (!game) return null;

    const wasHost = game.hostId === playerId;
    game.removePlayer(playerId);
    this.playerToGame.delete(playerId);

    // If no players left, delete the game
    if (game.players.size === 0) {
      this.games.delete(code);
      return null;
    }

    // If host left, transfer host to another player
    if (wasHost) {
      const newHost = game.getPlayersArray()[0];
      if (newHost) {
        game.hostId = newHost.id;
        newHost.isHost = true;
      }
    }

    return { game, wasHost };
  }

  // Update player mapping when socket ID changes (reconnection)
  updatePlayerMapping(oldPlayerId: string, newPlayerId: string): void {
    const code = this.playerToGame.get(oldPlayerId);
    if (code) {
      this.playerToGame.delete(oldPlayerId);
      this.playerToGame.set(newPlayerId, code);
    }
  }

  deleteGame(code: string): void {
    const game = this.games.get(code);
    if (game) {
      // Remove all player mappings
      for (const playerId of game.players.keys()) {
        this.playerToGame.delete(playerId);
      }
      this.games.delete(code);
    }
  }

  // Cleanup games that are stale (older than 2 hours or inactive)
  cleanupStaleGames(maxAgeMs: number = 2 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [code, game] of this.games) {
      const age = now - game.createdAt.getTime();
      if (age > maxAgeMs) {
        this.deleteGame(code);
        cleaned++;
      }
    }

    return cleaned;
  }

  getGameCount(): number {
    return this.games.size;
  }
}

// Singleton instance
export const gameManager = new GameManager();
