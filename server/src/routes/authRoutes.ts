import { Router, type Router as ExpressRouter } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router: ExpressRouter = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', requireAuth, asyncHandler(authController.getMe));

export default router;

