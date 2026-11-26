import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { UserModel } from './user.model.js';
import { sanitizeUser } from '../auth/auth.service.js';
const router = Router();
router.get('/', authenticate, requireRole('admin'), async (_req, res, next) => {
    try {
        const users = await UserModel.find().sort({ role: 1, createdAt: -1 });
        sendSuccess(res, users.map(sanitizeUser));
    }
    catch (err) {
        next(err);
    }
});
export const usersRoutes = router;
//# sourceMappingURL=users.routes.js.map