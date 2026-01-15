import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Force reconnect when page becomes visible again
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && socket) {
      if (!socket.connected) {
        console.log('Page visible, reconnecting...');
        socket.connect();
      }
    }
  }, [socket]);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '/';
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);

      // If server disconnected us, try to reconnect
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    newSocket.on('reconnect_error', (error) => {
      console.log('Reconnection error:', error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Add visibility change listener
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also handle when the page regains focus
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
