import http from 'http';
import app from './app';
import { initializeSocket } from './socket';
import { gameManager } from './game/GameManager';

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
initializeSocket(server);

// Cleanup stale games every 30 minutes
setInterval(() => {
  const cleaned = gameManager.cleanupStaleGames();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} stale games`);
  }
}, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
