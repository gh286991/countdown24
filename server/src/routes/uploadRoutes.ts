import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as uploadController from '../controllers/uploadController.js';

const router: ExpressRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', requireAuth, requireRole('creator'), upload.single('file'), asyncHandler(uploadController.uploadAsset));
router.get('/library', requireAuth, requireRole('creator'), asyncHandler(uploadController.getAssetLibrary));
router.delete('/library/:assetId', requireAuth, requireRole('creator'), asyncHandler(uploadController.removeAssetFromLibrary));
router.post('/presigned', requireAuth, asyncHandler(uploadController.getPresignedUrlForAsset));
router.post('/presigned/batch', requireAuth, asyncHandler(uploadController.getBatchPresignedUrls));

export default router;
