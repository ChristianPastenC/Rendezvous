const getAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests without an Origin header (e.g. health checks, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

const socketConfig = {
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
};

module.exports = { getAllowedOrigins, corsOptions, socketConfig };
