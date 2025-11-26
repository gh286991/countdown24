import { Router, type Router as ExpressRouter } from 'express';
import * as countdownController from '../controllers/countdownController';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router: ExpressRouter = Router();

// 公開路由（不需要認證）
router.get('/invite/check/:token', asyncHandler(countdownController.checkInvitation));

// 需要認證的路由
router.get('/', requireAuth, asyncHandler(countdownController.getCountdowns));
router.get('/:id', requireAuth, asyncHandler(countdownController.getCountdownById));
router.post('/', requireAuth, requireRole('creator'), asyncHandler(countdownController.createCountdown));
router.put('/:id', requireAuth, requireRole('creator'), asyncHandler(countdownController.updateCountdown));
router.delete('/:id', requireAuth, requireRole('creator'), asyncHandler(countdownController.deleteCountdown));
router.post('/:id/assign', requireAuth, requireRole('creator'), asyncHandler(countdownController.assignReceivers));
router.get('/:id/receivers', requireAuth, requireRole('creator'), asyncHandler(countdownController.getReceivers));
router.delete('/:id/receivers/:receiverId', requireAuth, requireRole('creator'), asyncHandler(countdownController.removeReceiver));
router.post('/:id/invite', requireAuth, requireRole('creator'), asyncHandler(countdownController.createInvitation));
router.post('/invite/accept/:token', requireAuth, asyncHandler(countdownController.acceptInvitation));
router.post('/:id/generate-qr', requireAuth, requireRole('creator'), asyncHandler(countdownController.generateDayQrCode));
router.get('/:id/print-cards', requireAuth, requireRole('creator'), asyncHandler(countdownController.getPrintCardsForCountdown));
router.put('/:id/print-cards/:day', requireAuth, requireRole('creator'), asyncHandler(countdownController.savePrintCard));
router.delete('/:id/print-cards/:day', requireAuth, requireRole('creator'), asyncHandler(countdownController.deletePrintCard));

export default router;
