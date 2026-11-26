import pino from 'pino';
import { env } from './env.js';
export const logger = pino({
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    base: { service: 'eventflow-api', env: env.NODE_ENV },
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'passwordHash',
            'token',
            'refreshToken',
            'otp',
            'secret',
        ],
        censor: '[REDACTED]',
    },
});
//# sourceMappingURL=logger.js.map