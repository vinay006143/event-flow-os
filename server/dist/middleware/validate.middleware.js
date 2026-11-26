export function validateBody(schema) {
    return (req, _res, next) => {
        const parsed = schema.parse(req.body);
        req.body = parsed;
        next();
    };
}
export function validateQuery(schema) {
    return (req, _res, next) => {
        const parsed = schema.parse(req.query);
        req.query = parsed;
        next();
    };
}
//# sourceMappingURL=validate.middleware.js.map