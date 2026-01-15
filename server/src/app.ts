import express from 'express';
import cors from 'cors';
import { gameManager } from './game/GameManager';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', games: gameManager.getGameCount() });
});

// Check if game exists
app.get('/api/game/:code/exists', (req, res) => {
  const code = req.params.code.toUpperCase();
  const exists = gameManager.gameExists(code);
  res.json({ exists });
});

export default app;
