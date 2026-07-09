import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { JsonApiErrorObject, ValidationApiError } from '../errors/ApiError';

function flatten(errors: ValidationError[], parentPath = ''): JsonApiErrorObject[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const constraintMessages = Object.values(error.constraints ?? {});
    const own = constraintMessages.map((message) => ({
      status: '422',
      title: 'Validation Error',
      detail: message,
      source: { pointer: `/data/attributes/${path}` },
    }));
    const nested = error.children?.length ? flatten(error.children, path) : [];
    return [...own, ...nested];
  });
}

/**
 * Validates and sanitizes `req.body` against a class-validator DTO class,
 * attaching the resulting instance to `req.body` so controllers get typed, trusted input.
 */
export function validateBody<T extends object>(dtoClass: new () => T): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const instance = plainToInstance(dtoClass, req.body, { excludeExtraneousValues: false });
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false },
    });

    if (errors.length > 0) {
      return next(new ValidationApiError(flatten(errors)));
    }

    req.body = instance;
    next();
  };
}
