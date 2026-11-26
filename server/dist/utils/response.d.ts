import type { Response } from 'express';
export declare function sendSuccess<T>(res: Response, data: T, options?: {
    statusCode?: number;
    message?: string;
    meta?: Record<string, unknown>;
}): void;
export declare function getPagination(query: Record<string, unknown>): {
    page: number;
    limit: number;
    skip: number;
};
//# sourceMappingURL=response.d.ts.map