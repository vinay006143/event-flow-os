import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';
export function errorMiddleware(err, req, res, _next) {
    const requestId = res.locals.requestId;
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request payload',
                details: err.flatten(),
                requestId,
            },
        });
        return;
    }
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logger.error({ err, requestId, path: req.originalUrl }, err.message);
        }
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                ...(err.details ? { details: err.details } : {}),
                requestId,
            },
        });
        return;
    }
    const mongoErr = err;
    if (mongoErr?.code === 11000) {
        res.status(409).json({
            success: false,
            error: {
                code: 'DUPLICATE_RESOURCE',
                message: 'A record with the same unique identifier already exists',
                details: mongoErr.keyPattern,
                requestId,
            },
        });
        return;
    }
    logger.error({ err, requestId, path: req.originalUrl }, 'Unhandled server error');
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            requestId,
        },
    });
}
//# sourceMappingURL=error.middleware.js.map