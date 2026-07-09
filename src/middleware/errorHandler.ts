import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/ApiError';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    errors: [{ status: '404', title: 'Not Found', detail: 'The requested route does not exist.' }],
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ errors: err.errors });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    errors: [{ status: '500', title: 'Internal Server Error', detail: 'An unexpected error occurred.' }],
  });
}
