import { Request, Response } from 'express';
import Session from '../models/Session';
import Teacher from '../models/Teacher';
import User from '../models/User';
import AppError from '../utils/AppError';
import { dateValue, objectId, requiredString } from '../utils/validation';

export async function createSession(req: Request, res: Response): Promise<void> {
  const teacherId = objectId(req.body?.teacherId, 'teacherId');
  if (!await Teacher.exists({ _id: teacherId })) throw new AppError(404, 'Teacher not found');
  const startTime = dateValue(req.body?.startTime, 'startTime');
  const endTime = dateValue(req.body?.endTime, 'endTime');
  if (endTime <= startTime) throw new AppError(400, 'endTime must be later than startTime');
  const session = await Session.create({ teacherId, startTime, endTime, userId: null, completedAt: null, status: 'AVAILABLE' });
  res.status(201).json({ success: true, data: session });
}

export async function getAvailableSessions(req: Request, res: Response): Promise<void> {
  const rawTimestamp = req.query.dateTimestamp;
  if (typeof rawTimestamp !== 'string' || !rawTimestamp.trim()) throw new AppError(400, 'dateTimestamp query parameter is required');
  const timestamp = Number(rawTimestamp);
  if (!Number.isFinite(timestamp) || !Number.isSafeInteger(timestamp) || Number.isNaN(new Date(timestamp).getTime())) throw new AppError(400, 'dateTimestamp must be a valid Unix timestamp in milliseconds');
  // Calendar days are interpreted in UTC so results are consistent across server locations.
  const inputDate = new Date(timestamp);
  const start = new Date(Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const data = await Session.aggregate([
    { $match: { status: 'AVAILABLE', startTime: { $gte: start, $lt: end } } },
    { $sort: { startTime: 1 } },
    { $project: { _id: 1, teacherId: 1, userId: 1, startTime: 1, endTime: 1, status: 1, completedAt: 1, createdAt: 1, updatedAt: 1 } }
  ]);
  res.status(200).json({ success: true, data });
}

export async function bookSession(req: Request, res: Response): Promise<void> {
  const id = objectId(req.params.id, 'id');
  const userId = objectId(req.body?.userId, 'userId');
  if (!await User.exists({ _id: userId })) throw new AppError(404, 'User not found');
  const session = await Session.findOneAndUpdate({ _id: id, status: 'AVAILABLE' }, { $set: { status: 'BOOKED', userId } }, { new: true, runValidators: true });
  if (session) { res.status(200).json({ success: true, data: session }); return; }
  if (!await Session.exists({ _id: id })) throw new AppError(404, 'Session not found');
  throw new AppError(409, 'Session is not available for booking');
}

export async function completeSession(req: Request, res: Response): Promise<void> {
  const id = objectId(req.params.id, 'id');
  const session = await Session.findOneAndUpdate({ _id: id, status: 'BOOKED' }, { $set: { status: 'COMPLETED', completedAt: new Date() } }, { new: true, runValidators: true });
  if (session) { res.status(200).json({ success: true, data: session }); return; }
  if (!await Session.exists({ _id: id })) throw new AppError(404, 'Session not found');
  throw new AppError(409, 'Only booked sessions can be completed');
}
