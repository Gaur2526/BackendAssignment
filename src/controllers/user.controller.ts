import { Request, Response } from 'express';
import User from '../models/User';
import Session from '../models/Session';
import AppError from '../utils/AppError';
import { emailAddress, objectId, requiredString } from '../utils/validation';

export async function createUser(req: Request, res: Response): Promise<void> {
  const fullName = requiredString(req.body?.fullName, 'fullName');
  const email = emailAddress(req.body?.email);
  const phone = requiredString(req.body?.phone, 'phone');
  const user = await User.create({ fullName, email, phone });
  res.status(201).json({ success: true, data: user });
}

export async function getUserSessions(req: Request, res: Response): Promise<void> {
  const id = objectId(req.params.id, 'id');
  const user = await User.exists({ _id: id });
  if (!user) throw new AppError(404, 'User not found');
  const now = new Date();
  const result = await Session.aggregate([
    { $match: { userId: user._id } },
    { $lookup: { from: 'teachers', localField: 'teacherId', foreignField: '_id', as: 'teacher' } },
    { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
    { $facet: {
      upcomingSessions: [
        { $match: { status: { $in: ['AVAILABLE', 'BOOKED'] }, startTime: { $gt: now } } },
        { $sort: { startTime: 1 } },
        { $project: { _id: 1, teacherId: 1, userId: 1, startTime: 1, endTime: 1, status: 1, createdAt: 1, updatedAt: 1, teacher: { _id: '$teacher._id', fullName: '$teacher.fullName', email: '$teacher.email', specialization: '$teacher.specialization', experience: '$teacher.experience' } } }
      ],
      completedSessions: [
        { $match: { status: 'COMPLETED' } }, { $sort: { completedAt: -1 } },
        { $project: { _id: 1, teacherId: 1, userId: 1, startTime: 1, endTime: 1, status: 1, completedAt: 1, createdAt: 1, updatedAt: 1, teacher: { _id: '$teacher._id', fullName: '$teacher.fullName', email: '$teacher.email', specialization: '$teacher.specialization', experience: '$teacher.experience' } } }
      ]
    } }
  ]);
  const data = result[0] ?? { upcomingSessions: [], completedSessions: [] };
  res.status(200).json({ success: true, data });
}
