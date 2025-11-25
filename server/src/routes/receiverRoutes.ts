import { Router, type Router as ExpressRouter } from 'express';
import * as receiverController from '../controllers/receiverController';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router: ExpressRouter = Router();

router.get('/inbox', requireAuth, requireRole('receiver'), asyncHandler(receiverController.getInbox));
router.get('/countdowns/:id', requireAuth, requireRole('receiver'), asyncHandler(receiverController.getReceiverCountdown));
router.get('/countdowns/:id/days/:day', requireAuth, requireRole('receiver'), asyncHandler(receiverController.getReceiverDayContent));
router.post('/unlock-day', requireAuth, requireRole('receiver'), asyncHandler(receiverController.unlockDayWithQr));

export default router;

