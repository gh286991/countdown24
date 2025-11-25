import compression from 'compression';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { PORT, CLIENT_ORIGIN } from './config/index';
import { connectDatabase } from './db/connection';
import { seedDemoData } from './db/seed';
import authRoutes from './routes/authRoutes';
import countdownRoutes from './routes/countdownRoutes';
import receiverRoutes from './routes/receiverRoutes';
import type { Request, Response, NextFunction } from 'express';

const app = express();

// Middleware
app.use(
  cors({
    origin: [CLIENT_ORIGIN],
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(compression());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/countdowns', countdownRoutes);
app.use('/api/receiver', receiverRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Bootstrap
async function bootstrap() {
  await connectDatabase();
  await seedDemoData();
  app.listen(PORT, () => {
    console.log(`Countdown24 API ready on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Unable to start API server', error);
  process.exit(1);
});
