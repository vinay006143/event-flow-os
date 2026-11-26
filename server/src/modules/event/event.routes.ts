import { Router } from 'express';
import { z } from 'zod';
import { registrationFieldSchema } from '@eventflow/shared';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { getOrCreateEventConfig, updateEventConfig } from './event.service.js';

const router = Router();

router.get('/public', async (_req, res, next) => {
  try {
    const config = await getOrCreateEventConfig();
    sendSuccess(res, config);
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, requireRole('admin', 'staff'), async (_req, res, next) => {
  try {
    const config = await getOrCreateEventConfig();
    sendSuccess(res, config);
  } catch (err) {
    next(err);
  }
});

router.patch('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const updated = await updateEventConfig(req.body, { id: req.user!.id, email: req.user!.email }, req);
    sendSuccess(res, updated, { message: 'Event configuration updated' });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/registration-fields',
  authenticate,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const fields = z.array(registrationFieldSchema).min(1).parse(req.body.fields ?? req.body);
      const updated = await updateEventConfig(
        { registrationFields: fields },
        { id: req.user!.id, email: req.user!.email },
        req,
      );
      sendSuccess(res, updated.registrationFields, { message: 'Registration fields updated' });
    } catch (err) {
      next(err);
    }
  },
);

export const eventRoutes = router;
