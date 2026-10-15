import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMurdockSocket } from './useMurdockSocket';
import type { SocketMessage } from '../types';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  emit(message: SocketMessage | string): void {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) });
  }
}

function Probe({ onMessage }: { onMessage: (message: SocketMessage) => void }) {
  useMurdockSocket(onMessage);
  return null;
}

let frames: Map<number, () => void>;
let nextFrameId: number;
let raf: ReturnType<typeof vi.fn>;
let caf: ReturnType<typeof vi.fn>;

function flushFrames(): void {
  const callbacks = [...frames.values()];
  frames.clear();
  for (const callback of callbacks) callback();
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  frames = new Map();
  nextFrameId = 1;
  raf = vi.fn((callback: () => void) => {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  });
  caf = vi.fn((id: number) => frames.delete(id));

  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMurdockSocket', () => {
  it('buffers messages and delivers them together on the next frame', () => {
    const handler = vi.fn();
    render(<Probe onMessage={handler} />);
    const socket = FakeWebSocket.instances.at(-1)!;

    socket.emit({ cmd: 'status', uid: 'a', status: { passed: 1 } });
    socket.emit({ cmd: 'output', uid: 'a', line: 'hello\n' });

    // Nothing is delivered synchronously, and both share one scheduled frame.
    expect(handler).not.toHaveBeenCalled();
    expect(raf).toHaveBeenCalledTimes(1);

    flushFrames();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, { cmd: 'status', uid: 'a', status: { passed: 1 } });
    expect(handler).toHaveBeenNthCalledWith(2, { cmd: 'output', uid: 'a', line: 'hello\n' });
  });

  it('delivers a later message in its own frame after a flush', () => {
    const handler = vi.fn();
    render(<Probe onMessage={handler} />);
    const socket = FakeWebSocket.instances.at(-1)!;

    socket.emit({ cmd: 'reload' });
    flushFrames();
    expect(handler).toHaveBeenCalledTimes(1);

    socket.emit({ cmd: 'reload' });
    expect(raf).toHaveBeenCalledTimes(2);
    flushFrames();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('ignores malformed messages without scheduling a frame', () => {
    const handler = vi.fn();
    render(<Probe onMessage={handler} />);
    const socket = FakeWebSocket.instances.at(-1)!;

    socket.emit('{ not json');

    expect(raf).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('closes the socket and cancels a pending frame on unmount', () => {
    const handler = vi.fn();
    const { unmount } = render(<Probe onMessage={handler} />);
    const socket = FakeWebSocket.instances.at(-1)!;

    socket.emit({ cmd: 'reload' });
    unmount();

    expect(socket.close).toHaveBeenCalled();
    expect(caf).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });
});
