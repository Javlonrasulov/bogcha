import { io } from 'socket.io-client';
import { getAccessToken } from '../../../lib/session';

/**
 * Real-time hodisalar brauzerga SSE orqali uzatiladi. Socket.IO ulanishi
 * server tomonida ochiladi — shu sababli access token httpOnly cookie'da
 * qoladi va brauzerdagi JavaScript uchun ko'rinmaydi (TZ §40, §42).
 */

export const dynamic = 'force-dynamic';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

const EVENTS = [
  'attendance:updated',
  'dashboard:updated',
  'stock:updated',
  'expense:created',
  'payment:created',
  'nutrition:closed',
  'notification:created',
] as const;

export async function GET(): Promise<Response> {
  const token = await getAccessToken();
  if (!token) return new Response('unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  const socket = io(`${WS_URL}/realtime`, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });

  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`),
          );
        } catch {
          // Oqim yopilgan — ulanishni tozalaymiz.
          socket.disconnect();
        }
      };

      socket.on('connect', () => send('ready', { connected: true }));
      for (const event of EVENTS) socket.on(event, (payload: unknown) => send(event, payload));

      // Proxy'lar bo'sh turgan ulanishni uzmasligi uchun.
      heartbeat = setInterval(() => send('ping', { at: Date.now() }), 25_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      socket.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
