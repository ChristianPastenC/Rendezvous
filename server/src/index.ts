import 'dotenv/config';
import { createApp } from './app.js';

const { server } = createApp();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`);
});
