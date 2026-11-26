import crypto from 'crypto';
export function requestIdMiddleware(req, res, next) {
    const incoming = req.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : crypto.randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
}
//# sourceMappingURL=requestId.middleware.js.map