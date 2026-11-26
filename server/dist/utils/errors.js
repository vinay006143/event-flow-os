export class AppError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
export class BadRequestError extends AppError {
    constructor(message, code = 'BAD_REQUEST', details) {
        super(message, 400, code, details);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
        super(message, 401, code);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Insufficient permissions', code = 'FORBIDDEN') {
        super(message, 403, code);
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND') {
        super(message, 404, code);
    }
}
export class ConflictError extends AppError {
    constructor(message, code = 'CONFLICT', details) {
        super(message, 409, code, details);
    }
}
export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests, please try again later', code = 'RATE_LIMITED') {
        super(message, 429, code);
    }
}
//# sourceMappingURL=errors.js.map