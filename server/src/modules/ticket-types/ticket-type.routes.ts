import { Router } from 'express';
import { createTicketTypeSchema } from '@eventflow/shared';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import {
  createTicketType,
  deleteTicketType,
  listAllTicketTypes,
  listPublicTicketTypes,
  updateTicketType,
} from './ticket-type.service.js';

const router = Router();

router.get('/public', async (_req, res, next) => {
  try {
    const items = await listPublicTicketTypes();
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, requireRole('admin', 'staff'), async (_req, res, next) => {
  try {
    const items = await listAllTicketTypes();
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validateBody(createTicketTypeSchema),
  async (req, res, next) => {
    try {
      const created = await createTicketType(
        req.body,
        { id: req.user!.id, email: req.user!.email },
        req,
      );
      sendSuccess(res, created, { statusCode: 201, message: 'Ticket category created' });
    } catch (err) {
      next(err);
    }
  },
);

router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const updated = await updateTicketType(
      String(req.params.id),
      req.body,
      { id: req.user!.id, email: req.user!.email },
      req,
    );
    sendSuccess(res, updated, { message: 'Ticket category updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await deleteTicketType(
      String(req.params.id),
      { id: req.user!.id, email: req.user!.email },
      req,
    );
    sendSuccess(res, result, { message: 'Ticket category deleted' });
  } catch (err) {
    next(err);
  }
});

export const ticketTypeRoutes = router;
