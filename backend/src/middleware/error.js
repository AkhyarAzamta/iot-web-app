export class HttpException extends Error {
  constructor(statusCode, message, cause = null) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    this.cause = cause; // Optional nested error for traceability
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const message = err?.message || 'Unknown error';
  const stack = err?.stack || 'No stack trace';
  const code = err?.statusCode || 500;

  console.error(`❌ [${timestamp}]`, {
    message,
    status: code,
    path: req.originalUrl,
    method: req.method,
    stack
  });

  if (err instanceof HttpException) {
    return res.status(err.statusCode).json({
      error: err.message,
      cause: err.cause?.message || undefined
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    detail: process.env.NODE_ENV === 'development' ? message : undefined
  });
};
