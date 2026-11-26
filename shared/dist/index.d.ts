export * from './constants/index.js';
export * from './schemas/index.js';
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    message?: string;
    data: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        requestId?: string;
    };
}
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string;
    };
}
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
//# sourceMappingURL=index.d.ts.map