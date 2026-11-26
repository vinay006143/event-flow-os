import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
const isTest = env.NODE_ENV === 'test';
export const globalRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: isTest ? 10000 : env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests from this IP, please try again later.',
        },
    },
});
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 1000 : env.RATE_LIMIT_AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many authentication attempts. Please wait 15 minutes.',
        },
    },
});
export const otpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 1000 : env.RATE_LIMIT_OTP_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'OTP_RATE_LIMITED',
            message: 'Too many OTP requests. Please wait before trying again.',
        },
    },
});
//# sourceMappingURL=rateLimit.middleware.js.map