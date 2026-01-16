import { Server, Socket } from 'socket.io';
import { gameManager } from '../../game/GameManager';
import {
  ClientEvents,
  ServerEvents,
  CreateGamePayload,
  JoinGamePayload,
  RejoinGamePayload,
  StartGamePayload,
  SubmitCluePayload,
  SubmitGuessPayload,
  RegenerateSpectrumPayload,
  DEFAULT_CONFIG,
} from 'shared';

// Track pending disconnect timeouts to allow reconnection grace period
// Key: playerId (socket.id), Value: { timeout, gameCode, playerName }
const pendingDisconnects: Map<string, { timeout: NodeJS.Timeout; gameCode: string; playerName: string }> = new Map();

// Grace period before removing disconnected players (60 seconds for mobile)
const DISCONNECT_GRACE_PERIOD_MS = 60 * 1000;

export function registerGameHandlers(io: Server, socket: Socket): void {
  const getBaseUrl = (): string => {
    // In production, this should be configured via environment variable
    return process.env.BASE_URL || 'http://localhost:5173';
  };

  // Create a new game
  socket.on(ClientEvents.CREATE_GAME, (payload: CreateGamePayload) => {
    const { hostName } = payload;

    if (!hostName || hostName.trim().length === 0) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Name is required',
        code: 'INVALID_NAME',
      });
      return;
    }

    const game = gameManager.createGame(socket.id, hostName.trim());
    const gameUrl = `${getBaseUrl()}/join/${game.code}`;

    // Join the socket room for this game
    socket.join(game.code);

    socket.emit(ServerEvents.GAME_CREATED, {
      gameCode: game.code,
      gameUrl,
      playerId: socket.id,
    });
  });

  // Join an existing game
  socket.on(ClientEvents.JOIN_GAME, (payload: JoinGamePayload) => {
    const { gameCode, playerName } = payload;

    if (!playerName || playerName.trim().length === 0) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Name is required',
        code: 'INVALID_NAME',
      });
      return;
    }

    const code = gameCode.toUpperCase().trim();
    const game = gameManager.getGame(code);

    if (!game) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Game not found',
        code: 'GAME_NOT_FOUND',
      });
      return;
    }

    if (game.phase !== 'lobby') {
      socket.emit(ServerEvents.ERROR, {
        message: 'Game has already started',
        code: 'GAME_STARTED',
      });
      return;
    }

    if (game.isNameTaken(playerName.trim())) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Name is already taken',
        code: 'NAME_TAKEN',
      });
      return;
    }

    const joinedGame = gameManager.joinGame(code, socket.id, playerName.trim());

    if (!joinedGame) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Failed to join game',
        code: 'JOIN_FAILED',
      });
      return;
    }

    // Join the socket room
    socket.join(code);

    const players = joinedGame.getPlayersArray();
    const newPlayer = joinedGame.getPlayer(socket.id)!;

    // Notify all players in the game
    io.to(code).emit(ServerEvents.PLAYER_JOINED, {
      players,
      newPlayer,
    });
  });

  // Rejoin an existing game after reconnection
  socket.on(ClientEvents.REJOIN_GAME, (payload: RejoinGamePayload) => {
    const { gameCode, playerName } = payload;

    if (!playerName || playerName.trim().length === 0) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Name is required',
        code: 'INVALID_NAME',
      });
      return;
    }

    const code = gameCode.toUpperCase().trim();
    const game = gameManager.getGame(code);

    if (!game) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Game not found',
        code: 'GAME_NOT_FOUND',
      });
      return;
    }

    // Cancel any pending disconnect timeout for this player (search by name since socket ID changed)
    let oldSocketId: string | null = null;
    for (const [socketId, pending] of pendingDisconnects) {
      if (pending.gameCode === code && pending.playerName.toLowerCase() === playerName.trim().toLowerCase()) {
        console.log(`Cancelling pending disconnect for ${playerName}, player is reconnecting`);
        clearTimeout(pending.timeout);
        pendingDisconnects.delete(socketId);
        oldSocketId = socketId;
        break;
      }
    }

    // Find old socket ID from the game if not found in pending disconnects
    if (!oldSocketId) {
      for (const [playerId, p] of game.players) {
        if (p.name.toLowerCase() === playerName.trim().toLowerCase()) {
          oldSocketId = playerId;
          break;
        }
      }
    }

    // Try to rejoin as existing player
    const player = game.rejoinPlayer('', socket.id, playerName.trim());

    // Update the player mapping in GameManager if we found the old socket ID
    if (player && oldSocketId && oldSocketId !== socket.id) {
      gameManager.updatePlayerMapping(oldSocketId, socket.id);
    }

    if (!player) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Could not rejoin - player not found in game',
        code: 'REJOIN_FAILED',
      });
      return;
    }

    // Join the socket room
    socket.join(code);

    // Build the state payload based on current phase
    const currentClue = game.getCurrentClue();
    const statePayload: Record<string, unknown> = {
      gameCode: code,
      playerId: socket.id,
      isHost: player.isHost,
      players: game.getPlayersArray(),
      phase: game.phase,
      scores: game.getScores(),
    };

    if (game.phase === 'gathering') {
      statePayload.cluesPerPlayer = game.cluesPerPlayer;
      statePayload.timeRemaining = game.getTimeRemaining();
      statePayload.myClueSlots = game.getPlayerClueSlots(socket.id);
      statePayload.myCluesSubmitted = game.getPlayerClueSubmissionStatus(socket.id);
      statePayload.submittedClueCount = game.getSubmittedClueCount();
      statePayload.totalClues = game.getTotalExpectedClues();
    } else if (game.phase === 'guessing' || game.phase === 'reviewing') {
      statePayload.currentRound = game.currentRound + 1;
      statePayload.totalRounds = game.getTotalRounds();
      statePayload.timeRemaining = game.getTimeRemaining();
      if (currentClue) {
        statePayload.currentClue = currentClue.clue;
        statePayload.currentAuthorId = currentClue.playerId;
        statePayload.currentAuthorName = currentClue.playerName;
        statePayload.spectrum = currentClue.spectrum;
      }
      statePayload.myGuessSubmitted = game.hasSubmittedGuess(socket.id);
      statePayload.submittedGuessCount = game.getSubmittedGuessCount();
      statePayload.expectedGuessCount = game.getExpectedGuessCount();

      if (game.phase === 'reviewing') {
        statePayload.roundResult = game.getLastRoundResult();
      }
    } else if (game.phase === 'results') {
      statePayload.finalScores = game.getScores();
      const scores = game.getScores();
      if (scores.length > 0) {
        statePayload.winner = game.getPlayer(scores[0].playerId);
      }
    }

    socket.emit(ServerEvents.REJOINED_GAME, statePayload);

    // Notify other players that this player reconnected
    socket.to(code).emit(ServerEvents.PLAYER_JOINED, {
      players: game.getPlayersArray(),
      newPlayer: player,
    });
  });

  // Start the game (host only)
  socket.on(ClientEvents.START_GAME, (payload: StartGamePayload) => {
    const { gameCode } = payload;

    const game = gameManager.getGame(gameCode);

    if (!game) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Game not found',
        code: 'GAME_NOT_FOUND',
      });
      return;
    }

    if (game.hostId !== socket.id) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Only the host can start the game',
        code: 'NOT_HOST',
      });
      return;
    }

    if (game.players.size < DEFAULT_CONFIG.minPlayers) {
      socket.emit(ServerEvents.ERROR, {
        message: `Need at least ${DEFAULT_CONFIG.minPlayers} players to start`,
        code: 'NOT_ENOUGH_PLAYERS',
      });
      return;
    }

    const { cluesPerPlayer, timeLimit } = game.startGame();

    // Notify all players that game started
    io.to(gameCode).emit(ServerEvents.GAME_STARTED, {
      phase: 'gathering',
      cluesPerPlayer,
      timeLimit,
    });

    // Send each player their private clue slots
    for (const player of game.getPlayersArray()) {
      const clueSlots = game.getPlayerClueSlots(player.id);
      io.to(player.id).emit(ServerEvents.CLUE_SLOTS_ASSIGNED, { clueSlots });
    }

    // Start the timer
    startGatheringTimer(io, game);
  });

  // Submit a clue during gathering phase
  socket.on(ClientEvents.SUBMIT_CLUE, (payload: SubmitCluePayload) => {
    const { gameCode, clue, clueIndex } = payload;

    const game = gameManager.getGame(gameCode);

    if (!game || game.phase !== 'gathering') {
      socket.emit(ServerEvents.ERROR, {
        message: 'Cannot submit clue at this time',
        code: 'INVALID_PHASE',
      });
      return;
    }

    if (!clue || clue.trim().length === 0) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Clue cannot be empty',
        code: 'INVALID_CLUE',
      });
      return;
    }

    const success = game.submitClue(socket.id, clue.trim(), clueIndex);

    if (!success) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Failed to submit clue',
        code: 'SUBMIT_FAILED',
      });
      return;
    }

    // Notify all players that someone submitted
    io.to(gameCode).emit(ServerEvents.CLUE_SUBMITTED, {
      playerId: socket.id,
      clueIndex,
      submittedCount: game.getSubmittedClueCount(),
      totalClues: game.getTotalExpectedClues(),
    });

    // Check if all clues are in
    if (game.allCluesSubmitted()) {
      transitionToGuessing(io, game);
    }
  });

  // Regenerate spectrum during gathering phase
  socket.on(ClientEvents.REGENERATE_SPECTRUM, (payload: RegenerateSpectrumPayload) => {
    const { gameCode, clueIndex } = payload;

    const game = gameManager.getGame(gameCode);

    if (!game || game.phase !== 'gathering') {
      socket.emit(ServerEvents.ERROR, {
        message: 'Cannot regenerate spectrum at this time',
        code: 'INVALID_PHASE',
      });
      return;
    }

    const newSlot = game.regenerateSpectrum(socket.id, clueIndex);

    if (!newSlot) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Cannot regenerate this clue slot',
        code: 'REGENERATE_FAILED',
      });
      return;
    }

    // Send the new slot back to only this player
    socket.emit(ServerEvents.SPECTRUM_REGENERATED, {
      clueIndex,
      newSlot,
    });
  });

  // Submit a guess during guessing phase
  socket.on(ClientEvents.SUBMIT_GUESS, (payload: SubmitGuessPayload) => {
    const { gameCode, guess } = payload;

    const game = gameManager.getGame(gameCode);

    if (!game || game.phase !== 'guessing') {
      socket.emit(ServerEvents.ERROR, {
        message: 'Cannot submit guess at this time',
        code: 'INVALID_PHASE',
      });
      return;
    }

    if (typeof guess !== 'number' || guess < 0 || guess > 100) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Guess must be between 0 and 100',
        code: 'INVALID_GUESS',
      });
      return;
    }

    const success = game.submitGuess(socket.id, guess);

    if (!success) {
      // Might be the clue author or already submitted
      return;
    }

    // Notify all players that someone submitted
    io.to(gameCode).emit(ServerEvents.GUESS_SUBMITTED, {
      playerId: socket.id,
      submittedCount: game.getSubmittedGuessCount(),
      totalGuessers: game.getExpectedGuessCount(),
    });

    // Check if all guesses are in
    if (game.allGuessesSubmitted()) {
      endRound(io, game);
    }
  });

  // Start next round (any player can trigger during reviewing phase)
  socket.on(ClientEvents.START_NEXT_ROUND, (payload: { gameCode: string }) => {
    const { gameCode } = payload;
    const game = gameManager.getGame(gameCode);

    if (!game) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Game not found',
        code: 'GAME_NOT_FOUND',
      });
      return;
    }

    if (game.phase !== 'reviewing') {
      return; // Silently ignore if not in reviewing phase
    }

    // Start next round
    proceedToNextRound(io, game);
  });

  // Show final results (any player can trigger after last round)
  socket.on(ClientEvents.SHOW_FINAL_RESULTS, (payload: { gameCode: string }) => {
    const { gameCode } = payload;
    const game = gameManager.getGame(gameCode);

    if (!game) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Game not found',
        code: 'GAME_NOT_FOUND',
      });
      return;
    }

    // Only allow if game is complete and in reviewing phase
    if (game.phase !== 'reviewing' || !game.isGameComplete()) {
      return;
    }

    game.finishGame();
    const finalScores = game.getScores();
    const winner = finalScores.length > 0 ? game.getPlayer(finalScores[0].playerId) : null;

    io.to(game.code).emit(ServerEvents.GAME_COMPLETE, {
      finalScores,
      winner,
    });
  });

  // Return to lobby (any player from results, or host from any phase)
  socket.on(ClientEvents.RETURN_TO_LOBBY, (payload: { gameCode: string }) => {
    const { gameCode } = payload;
    const game = gameManager.getGame(gameCode);

    if (!game) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Game not found',
        code: 'GAME_NOT_FOUND',
      });
      return;
    }

    // Allow from results phase (any player) or from any active phase (host only)
    const isHost = game.hostId === socket.id;
    const isActiveGame = game.phase !== 'lobby' && game.phase !== 'results';

    if (game.phase === 'results' || (isHost && isActiveGame)) {
      // Reset the game to lobby state
      game.resetToLobby();

      // Notify all players
      io.to(game.code).emit(ServerEvents.RETURNED_TO_LOBBY, {
        players: game.getPlayersArray(),
      });
    }
  });

  // Leave game - explicit leave, remove immediately
  socket.on(ClientEvents.LEAVE_GAME, () => {
    handlePlayerLeave(io, socket, true);
  });

  // Handle disconnect - may be temporary (mobile), use grace period
  socket.on('disconnect', () => {
    handlePlayerDisconnect(io, socket);
  });
}

// Handle temporary disconnect (mobile backgrounding, network issues)
function handlePlayerDisconnect(io: Server, socket: Socket): void {
  const game = gameManager.getGameByPlayerId(socket.id);

  if (!game) return;

  const player = game.getPlayer(socket.id);
  if (!player) return;

  // Mark player as disconnected
  game.setPlayerConnected(socket.id, false);

  console.log(`Player ${player.name} disconnected, starting grace period...`);

  // Notify other players that this player disconnected (but not left)
  socket.to(game.code).emit(ServerEvents.PLAYER_JOINED, {
    players: game.getPlayersArray(),
    newPlayer: player,
  });

  // Set up timeout to remove player if they don't reconnect
  const timeout = setTimeout(() => {
    console.log(`Grace period expired for ${player.name}, removing from game...`);
    pendingDisconnects.delete(socket.id);

    // Actually remove the player now
    const result = gameManager.removePlayer(socket.id);
    if (result) {
      const { game: g, wasHost } = result;

      io.to(g.code).emit(ServerEvents.PLAYER_LEFT, {
        players: g.getPlayersArray(),
        leftPlayerId: socket.id,
      });

      if (wasHost && g.players.size > 0) {
        io.to(g.code).emit(ServerEvents.PLAYER_JOINED, {
          players: g.getPlayersArray(),
          newPlayer: g.getPlayer(g.hostId)!,
        });
      }
    }
  }, DISCONNECT_GRACE_PERIOD_MS);

  pendingDisconnects.set(socket.id, {
    timeout,
    gameCode: game.code,
    playerName: player.name,
  });
}

// Handle explicit leave (user clicked leave button)
function handlePlayerLeave(io: Server, socket: Socket, _explicit: boolean = false): void {
  // Cancel any pending disconnect timeout
  const pending = pendingDisconnects.get(socket.id);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingDisconnects.delete(socket.id);
  }

  const result = gameManager.removePlayer(socket.id);

  if (result) {
    const { game, wasHost } = result;

    // Notify remaining players
    io.to(game.code).emit(ServerEvents.PLAYER_LEFT, {
      players: game.getPlayersArray(),
      leftPlayerId: socket.id,
    });

    // If host changed, notify
    if (wasHost && game.players.size > 0) {
      io.to(game.code).emit(ServerEvents.PLAYER_JOINED, {
        players: game.getPlayersArray(),
        newPlayer: game.getPlayer(game.hostId)!,
      });
    }
  }
}

function startGatheringTimer(io: Server, game: ReturnType<typeof gameManager.getGame>): void {
  if (!game) return;

  const timerInterval = setInterval(() => {
    const timeRemaining = game.getTimeRemaining();

    io.to(game.code).emit(ServerEvents.TIMER_UPDATE, {
      timeRemaining,
      phase: game.phase,
    });

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);

      // Time's up - transition to guessing with whatever clues we have
      if (game.phase === 'gathering' && game.getSubmittedClueCount() > 0) {
        transitionToGuessing(io, game);
      } else if (game.phase === 'gathering') {
        // No clues submitted - end game
        game.finishGame();
        io.to(game.code).emit(ServerEvents.GAME_COMPLETE, {
          finalScores: [],
          winner: null,
        });
      }
    }
  }, 1000);
}

function transitionToGuessing(io: Server, game: ReturnType<typeof gameManager.getGame>): void {
  if (!game) return;

  game.startGuessingPhase();

  io.to(game.code).emit(ServerEvents.GATHERING_COMPLETE, {
    phase: 'guessing',
  });

  // Start the first round
  startNextRound(io, game);
}

function startNextRound(io: Server, game: ReturnType<typeof gameManager.getGame>): void {
  if (!game) return;

  const roundInfo = game.startNextRound();

  if (!roundInfo) {
    // No more rounds - game complete
    game.finishGame();
    const scores = game.getScores();
    const winner = scores.length > 0 ? game.getPlayer(scores[0].playerId) : null;

    io.to(game.code).emit(ServerEvents.GAME_COMPLETE, {
      finalScores: scores,
      winner,
    });
    return;
  }

  // Use the clue's spectrum, not a shared one
  io.to(game.code).emit(ServerEvents.ROUND_STARTED, {
    roundNumber: roundInfo.roundNumber,
    totalRounds: roundInfo.totalRounds,
    clue: roundInfo.clue.clue,
    authorId: roundInfo.clue.playerId,
    authorName: roundInfo.clue.playerName,
    spectrum: roundInfo.clue.spectrum,
    totalGuessers: game.getExpectedGuessCount(),
  });

  // Start round timer
  startRoundTimer(io, game);
}

function startRoundTimer(io: Server, game: ReturnType<typeof gameManager.getGame>): void {
  if (!game) return;

  const timerInterval = setInterval(() => {
    const timeRemaining = game.getTimeRemaining();

    io.to(game.code).emit(ServerEvents.TIMER_UPDATE, {
      timeRemaining,
      phase: game.phase,
    });

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);

      if (game.phase === 'guessing') {
        endRound(io, game);
      }
    }
  }, 1000);
}

function endRound(io: Server, game: ReturnType<typeof gameManager.getGame>): void {
  if (!game) return;

  const roundResult = game.calculateRoundResults();
  const scores = game.getScores();

  io.to(game.code).emit(ServerEvents.ROUND_RESULTS, {
    roundResult,
    scores,
  });

  // Set phase to reviewing - wait for player action
  // If game is complete, player must click "Show Final Summary"
  // Otherwise, player clicks "Start Next Round"
  game.phase = 'reviewing';
  game.timerEndTime = null;
}

function proceedToNextRound(io: Server, game: ReturnType<typeof gameManager.getGame>): void {
  if (!game) return;

  if (game.isGameComplete()) {
    // Don't auto-transition - wait for SHOW_FINAL_RESULTS event
    return;
  }

  startNextRound(io, game);
}
