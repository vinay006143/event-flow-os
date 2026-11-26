import { Router } from 'express';
import { createReservationSchema } from '@eventflow/shared';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { ReservationModel } from './reservation.model.js';
import { createInventoryReservation, releaseReservation } from './reservation.service.js';

const router = Router();

router.post('/', validateBody(createReservationSchema), async (req, res, next) => {
  try {
    const reservation = await createInventoryReservation(req.body);
    sendSuccess(res, reservation, { statusCode: 201 });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const reservation = await ReservationModel.findById(req.params.id);
    if (!reservation) throw new NotFoundError('Reservation not found');
    sendSuccess(res, reservation);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/release', async (req, res, next) => {
  try {
    const released = await releaseReservation(req.params.id!, 'RELEASED');
    if (!released) throw new NotFoundError('Active reservation not found');
    sendSuccess(res, released, { message: 'Reservation released' });
  } catch (err) {
    next(err);
  }
});

export const reservationRoutes = router;
