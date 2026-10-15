import { useEffect, useRef } from 'react';
import { WS_URL } from '../api/config';
import type { SocketMessage } from '../types';

/**
 * Schedule a callback on the next animation frame, falling back to a timer in
 * environments without `requestAnimationFrame` (e.g. jsdom).
 */
function requestFrame(callback: () => void): number {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
  return setTimeout(callback, 16) as unknown as number;
}

function cancelFrame(id: number): void {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}

/**
 * Subscribe to Murdock's status WebSocket. Messages are `{ cmd, ... }` with
 * `reload`, `status` and `output` commands. Reconnects with backoff and keeps
 * the latest handler in a ref so callers don't need to memoise it.
 *
 * Incoming messages are buffered and delivered together on the next animation
 * frame. A burst — e.g. the setup log streamed as many `output` lines — then
 * collapses into a single React commit instead of one render per message,
 * while single sparse updates are still shown on the very next frame.
 */
export function useMurdockSocket(onMessage: (message: SocketMessage) => void): void {
  const handler = useRef(onMessage);

  // Keep the latest handler without reconnecting on every render.
  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    let socket: WebSocket | undefined;
    let closed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    let buffer: SocketMessage[] = [];

    const flush = () => {
      frame = undefined;
      if (!buffer.length) return;
      const pending = buffer;
      buffer = [];
      // All handler calls share one task, so React batches their state updates
      // into a single commit.
      for (const message of pending) handler.current?.(message);
    };

    const schedule = () => {
      if (frame !== undefined) return;
      frame = requestFrame(flush);
    };

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = (event) => {
        let message: SocketMessage;
        try {
          message = JSON.parse(event.data as string) as SocketMessage;
        } catch {
          return;
        }
        buffer.push(message);
        schedule();
      };

      socket.onclose = () => {
        if (closed) return;
        attempt = Math.min(attempt + 1, 6);
        timer = setTimeout(connect, 500 * 2 ** (attempt - 1));
      };

      socket.onerror = () => socket?.close();
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(timer);
      if (frame !== undefined) cancelFrame(frame);
      socket?.close();
    };
  }, []);
}
