import { Router, type Router as ExpressRouter } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router: ExpressRouter = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', requireAuth, asyncHandler(authController.getMe));
router.put('/profile', requireAuth, asyncHandler(authController.updateProfile));
router.post('/upgrade-to-creator', requireAuth, asyncHandler(authController.upgradeToCreator));

export default router;

