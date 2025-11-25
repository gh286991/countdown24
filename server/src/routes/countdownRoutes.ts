import { Router, type Router as ExpressRouter } from 'express';
import * as countdownController from '../controllers/countdownController';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router: ExpressRouter = Router();

router.get('/', requireAuth, asyncHandler(countdownController.getCountdowns));
router.get('/:id', requireAuth, asyncHandler(countdownController.getCountdownById));
router.post('/', requireAuth, requireRole('creator'), asyncHandler(countdownController.createCountdown));
router.put('/:id', requireAuth, requireRole('creator'), asyncHandler(countdownController.updateCountdown));
router.delete('/:id', requireAuth, requireRole('creator'), asyncHandler(countdownController.deleteCountdown));
router.post('/:id/assign', requireAuth, requireRole('creator'), asyncHandler(countdownController.assignReceivers));
router.get('/:id/receivers', requireAuth, requireRole('creator'), asyncHandler(countdownController.getReceivers));
router.delete('/:id/receivers/:receiverId', requireAuth, requireRole('creator'), asyncHandler(countdownController.removeReceiver));

export default router;

