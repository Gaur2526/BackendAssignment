import { Types } from 'mongoose';
import { Request } from 'express';
import AppError from './AppError';

export const objectId = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value) || new Types.ObjectId(value).toString() !== value.toLowerCase()) {
    throw new AppError(400, `${label} must be a valid ObjectId`);
  }
  return value;
};

export const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, `${label} is required`);
  return value.trim();
};

export const emailAddress = (value: unknown): string => {
  const email = requiredString(value, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'email must be valid');
  return email;
};

export const dateValue = (value: unknown, label: string): Date => {
  if (typeof value !== 'string' && !(value instanceof Date)) throw new AppError(400, `${label} must be a valid date`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(400, `${label} must be a valid date`);
  return date;
};

export const routeId = (req: Request, name = 'id'): string => objectId(req.params[name], name);
