import { Request, Response } from 'express';
import Teacher from '../models/Teacher';
import { emailAddress, requiredString } from '../utils/validation';
import AppError from '../utils/AppError';

export async function createTeacher(req: Request, res: Response): Promise<void> {
  const fullName = requiredString(req.body?.fullName, 'fullName');
  const email = emailAddress(req.body?.email);
  const specialization = requiredString(req.body?.specialization, 'specialization');
  const experience = req.body?.experience;
  if (typeof experience !== 'number' || !Number.isFinite(experience) || experience < 0) throw new AppError(400, 'experience must be a non-negative number');
  const teacher = await Teacher.create({ fullName, email, specialization, experience });
  res.status(201).json({ success: true, data: teacher });
}
