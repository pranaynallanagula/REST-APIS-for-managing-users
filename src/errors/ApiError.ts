/** JSON:API error object shape (a subset of the spec's error members we use). */
export interface JsonApiErrorObject {
  status: string;
  title: string;
  detail?: string;
  source?: { pointer?: string; parameter?: string };
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly errors: JsonApiErrorObject[];

  constructor(status: number, title: string, detail?: string, errors?: JsonApiErrorObject[]) {
    super(detail || title);
    this.status = status;
    this.errors = errors ?? [{ status: String(status), title, detail }];
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'User', detail?: string) {
    super(404, `${resource} Not Found`, detail ?? `The requested ${resource.toLowerCase()} does not exist.`);
  }
}

export class ForbiddenError extends ApiError {
  constructor(detail = 'You do not have permission to perform this action.') {
    super(403, 'Forbidden', detail);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(detail = 'Authentication credentials are missing or invalid.') {
    super(401, 'Unauthorized', detail);
  }
}

export class ConflictError extends ApiError {
  constructor(detail: string) {
    super(409, 'Conflict', detail);
  }
}

export class ValidationApiError extends ApiError {
  constructor(errors: JsonApiErrorObject[]) {
    super(422, 'Unprocessable Entity', 'One or more fields failed validation.', errors);
  }
}
