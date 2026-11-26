import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { getOrCreateEventConfig } from '../event/event.service.js';

const router = Router();

router.get('/fields', async (req, res, next) => {
  try {
    const config = await getOrCreateEventConfig();
    const ticketTypeId = req.query.ticketTypeId ? String(req.query.ticketTypeId) : undefined;
    const fields = config.registrationFields
      .filter((f) => f.enabled)
      .filter((f) => {
        if (!ticketTypeId || !f.categoryRestrictions || f.categoryRestrictions.length === 0) {
          return true;
        }
        return f.categoryRestrictions.includes(ticketTypeId);
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);

    sendSuccess(res, {
      fields,
      registrationOpen: config.operations.registrationOpen,
      maxTicketsPerBooking: config.operations.maxTicketsPerBooking,
    });
  } catch (err) {
    next(err);
  }
});

export const registrationRoutes = router;
