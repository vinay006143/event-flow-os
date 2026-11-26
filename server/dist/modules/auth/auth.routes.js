import { Router } from 'express';
import { z } from 'zod';
import { loginSchema } from '@eventflow/shared';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { UserModel } from '../users/user.model.js';
import { changeOwnPassword, loginWithPassword, logoutSession, refreshAuthSession, sanitizeUser, } from './auth.service.js';
const router = Router();
function getCookieOptions() {
    return {
        httpOnly: true,
        sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
        secure: env.COOKIE_SECURE,
        path: '/',
    };
}
function setAuthCookies(res, accessToken, refreshToken) {
    const opts = getCookieOptions();
    res.cookie('access_token', accessToken, opts);
    res.cookie('refresh_token', refreshToken, opts);
}
function clearAuthCookies(res) {
    const opts = getCookieOptions();
    res.clearCookie('access_token', opts);
    res.clearCookie('refresh_token', opts);
}
router.post('/admin/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
    try {
        const result = await loginWithPassword({ ...req.body, expectedRole: 'admin' }, req);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        sendSuccess(res, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/staff/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
    try {
        const result = await loginWithPassword({ ...req.body, expectedRole: 'staff' }, req);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        sendSuccess(res, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
    try {
        const result = await loginWithPassword(req.body, req);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        sendSuccess(res, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/refresh', async (req, res, next) => {
    try {
        const rawRefresh = req.body?.refreshToken ?? req.cookies?.refresh_token;
        const result = await refreshAuthSession(rawRefresh ?? '', req);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        sendSuccess(res, {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const rawRefresh = req.body?.refreshToken ?? req.cookies?.refresh_token;
        await logoutSession(rawRefresh, req.user?.id, req);
        clearAuthCookies(res);
        sendSuccess(res, { loggedOut: true });
    }
    catch (err) {
        next(err);
    }
});
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not found' } });
            return;
        }
        sendSuccess(res, { user: sanitizeUser(user) });
    }
    catch (err) {
        next(err);
    }
});
const changePasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8).max(128),
});
router.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req, res, next) => {
    try {
        await changeOwnPassword(req.user.id, req.body.currentPassword, req.body.newPassword, req);
        clearAuthCookies(res);
        sendSuccess(res, { passwordChanged: true });
    }
    catch (err) {
        next(err);
    }
});
export const authRoutes = router;
//# sourceMappingURL=auth.routes.js.map