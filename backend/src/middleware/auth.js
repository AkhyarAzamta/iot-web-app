import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { HttpException } from './error.js';

export const authHander = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new HttpException(401, 'Unauthorized');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new HttpException(401, 'Unauthorized');
    }

    jwt.verify(token, process.env.JWT_KEY, (err, user) => {
      if (err) {
        throw new HttpException(401, 'Unauthorized');
      }
      req.user = user;
      next();
    });
  } catch (error) {
    next(error);
  }
};