import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { globalRateLimiter } from './middleware/rateLimit.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { apiV1Router } from './routes/index.js';
export function createApp() {
    const app = express();
    app.set('trust proxy', 1);
    app.use(requestIdMiddleware);
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));
    app.use(express.json({ limit: '8mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    if (env.NODE_ENV !== 'test') {
        const httpLogger = pinoHttp.default ?? pinoHttp;
        app.use(httpLogger({ logger }));
    }
    app.use('/api', globalRateLimiter);
    app.use('/api/v1', apiV1Router);
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            error: {
                code: 'ROUTE_NOT_FOUND',
                message: 'API endpoint not found',
                requestId: res.locals.requestId,
            },
        });
    });
    app.use(errorMiddleware);
    return app;
}
//# sourceMappingURL=app.js.map