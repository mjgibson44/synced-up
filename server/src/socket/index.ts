import { Server } from 'socket.io';
import http from 'http';
import { registerGameHandlers } from './handlers/gameHandlers';

export function initializeSocket(server: http.Server): Server {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    registerGameHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
