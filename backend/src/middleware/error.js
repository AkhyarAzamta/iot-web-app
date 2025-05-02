export class HttpException extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
export const errorHandler = (err, req, res, next) => {
  console.log(err);
  if (err instanceof HttpException) {
    return res.status(err.statusCode).json({ error: err.message }).end();
  } else {
    return res.status(500).json({ error: err.message }).end();
  }
}