import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    message?: string;
    meta?: Record<string, unknown>;
  },
): void {
  const statusCode = options?.statusCode ?? 200;
  res.status(statusCode).json({
    success: true,
    ...(options?.message ? { message: options.message } : {}),
    data,
    meta: {
      ...(options?.meta ?? {}),
      requestId: res.locals.requestId,
    },
  });
}

export function getPagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
  skip: number;
} {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? 20);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
  return { page, limit, skip: (page - 1) * limit };
}
