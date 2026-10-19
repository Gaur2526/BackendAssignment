import { Router } from 'express';
import { createTeacher } from '../controllers/teacher.controller';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
router.post('/', asyncHandler(createTeacher));
export default router;
