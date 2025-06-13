export class HttpException extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;

    // Menyimpan nama class (penting untuk instanceof bekerja)
    this.name = this.constructor.name;

    // Menangani error stack trace dengan baik
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}]`, err);

  if (err instanceof HttpException) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Default fallback untuk error tak dikenal
  return res.status(500).json({
    error: "Internal Server Error",
    detail: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
