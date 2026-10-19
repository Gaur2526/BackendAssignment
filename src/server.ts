import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/database';

async function start(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is required');
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  await connectDatabase(uri);
  app.listen(port, () => console.log(`API listening on port ${port}`));
}

start().catch((error: unknown) => { console.error('Failed to start server:', error); process.exit(1); });
