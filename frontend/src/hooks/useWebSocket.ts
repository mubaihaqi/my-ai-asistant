import { useEffect, useRef, useCallback } from "react";

interface UseWebSocketProps {
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

// Singleton untuk WebSocket connection
let globalWebSocket: WebSocket | null = null;
const globalListeners: Set<(data: unknown) => void> = new Set();
let globalOnOpen: (() => void) | null = null;
let globalOnClose: (() => void) | null = null;
let globalOnError: ((error: Event) => void) | null = null;

export function useWebSocket({
  onMessage,
  onOpen,
  onClose,
  onError,
}: UseWebSocketProps) {
  const isUnmountedRef = useRef(false);

  const connectWebSocket = useCallback(() => {
    // Jika sudah ada connection yang aktif, gunakan itu
    if (globalWebSocket && globalWebSocket.readyState === WebSocket.OPEN) {
      console.log("Using existing WebSocket connection");
      return;
    }

    // Jika sedang connecting, tunggu
    if (
      globalWebSocket &&
      globalWebSocket.readyState === WebSocket.CONNECTING
    ) {
      console.log("WebSocket is connecting, waiting...");
      return;
    }

    // Close existing connection jika ada
    if (globalWebSocket) {
      globalWebSocket.close(1000);
    }

    try {
      console.log("Creating new WebSocket connection");
      const ws = new WebSocket("ws://localhost:3000/api/connect-websocket");
      globalWebSocket = ws;

      ws.onopen = () => {
        console.log("WebSocket connected successfully");
        globalOnOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Notify all listeners
          globalListeners.forEach((listener) => {
            if (!isUnmountedRef.current) {
              listener(data);
            }
          });
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}`);
        globalWebSocket = null;
        globalOnClose?.();

        // Auto reconnect hanya jika bukan normal closure (code 1000)
        if (event.code !== 1000) {
          console.log(
            "WebSocket closed abnormally, attempting to reconnect..."
          );
          setTimeout(() => {
            if (globalWebSocket === null) {
              connectWebSocket();
            }
          }, 2000);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        globalOnError?.(error);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }, [onMessage, onOpen, onClose, onError]);

  useEffect(() => {
    isUnmountedRef.current = false;

    // Register this component's listeners
    globalListeners.add(onMessage);
    globalOnOpen = onOpen || null;
    globalOnClose = onClose || null;
    globalOnError = onError || null;

    // Connect if no active connection
    if (!globalWebSocket || globalWebSocket.readyState === WebSocket.CLOSED) {
      const timer = setTimeout(connectWebSocket, 500);
      return () => {
        clearTimeout(timer);
        isUnmountedRef.current = true;
        globalListeners.delete(onMessage);
      };
    } else {
      // Connection already exists, just register listeners
      return () => {
        isUnmountedRef.current = true;
        globalListeners.delete(onMessage);
      };
    }
  }, [connectWebSocket, onMessage, onOpen, onClose, onError]);

  return globalWebSocket;
}
