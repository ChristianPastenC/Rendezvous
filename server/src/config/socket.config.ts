import type { CorsOptions } from 'cors';
import type { ServerOptions } from 'socket.io';

export const getAllowedOrigins = (): string[] => {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
};
