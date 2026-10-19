import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import AppError from '../utils/AppError';

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  if (error instanceof AppError) { statusCode = error.statusCode; message = error.message; }
  else if (error instanceof mongoose.Error.ValidationError) { statusCode = 400; message = error.message; }
  else if (error instanceof mongoose.Error.CastError) { statusCode = 400; message = 'Invalid resource identifier'; }
  else if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) { statusCode = 409; message = 'Email address already exists'; }
  else if (error instanceof SyntaxError && 'body' in error) { statusCode = 400; message = 'Malformed JSON request body'; }
  if (statusCode === 500) console.error(error);
  res.status(statusCode).json({ success: false, error: { message } });
};

export default errorHandler;
