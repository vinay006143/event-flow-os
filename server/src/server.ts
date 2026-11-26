import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { seedInitialDeploymentData } from './database/seed.js';
import { createApp } from './app.js';
import { expireStaleReservations } from './modules/reservations/reservation.service.js';

async function bootstrap() {
  await connectDatabase();
  await seedInitialDeploymentData();

  const app = createApp();
  const listenPort = Number(process.env.PORT) || env.API_PORT;
  const server = app.listen(listenPort, env.HOST, () => {
    logger.info(
      { port: listenPort, host: env.HOST, env: env.NODE_ENV },
      `${env.APP_NAME} API server listening`,
    );
  });

  // Periodic reservation cleanup scheduler (every 60s)
  const cleanupTimer = setInterval(() => {
    expireStaleReservations().catch((err) =>
      logger.error({ err }, 'Reservation cleanup interval error'),
    );
  }, 60_000);
  cleanupTimer.unref();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down API server');
    clearInterval(cleanupTimer);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start EventFlow OS API server');
  process.exit(1);
});
