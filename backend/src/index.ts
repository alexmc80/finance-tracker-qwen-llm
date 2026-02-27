import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db';
import ownersRouter from './routes/owners';
import accountsRouter from './routes/accounts';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';

const app = express();
const PORT = process.env.PORT || 3001;

// Настройка логирования
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `server-${new Date().toISOString().split('T')[0]}.log`);

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(logMessage.trim());
}

function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${message}${error ? `\n${error.stack || error}` : ''}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.error(logMessage.trim());
}

// Инициализация базы данных
try {
  initDatabase();
  log('Database initialized successfully');
} catch (error) {
  logError('Failed to initialize database', error);
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Routes
app.use('/api/owners', ownersRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Обработка ошибок
app.use((err: any, _req: any, res: any, _next: any) => {
  logError('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Раздача статики frontend в production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  log(`Server running on http://localhost:${PORT}`);
  log(`Log file: ${logFile}`);
});

// Обработка незакрытых соединений
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at: ' + promise + ', reason: ' + reason);
});
