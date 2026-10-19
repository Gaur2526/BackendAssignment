import { Router } from 'express';
import { createUser, getUserSessions } from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
router.post('/', asyncHandler(createUser));
router.get('/:id/sessions', asyncHandler(getUserSessions));
export default router;
