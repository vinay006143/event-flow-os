import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { BookingModel } from '../bookings/booking.model.js';
import { TicketTypeModel } from '../ticket-types/ticket-type.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { CheckinModel } from '../checkins/checkin.model.js';
import { GateModel } from '../gates/gate.model.js';
import { ScannerDeviceModel } from '../devices/device.model.js';
import { UserModel } from '../users/user.model.js';
import { NotificationLogModel } from '../notifications/notification.model.js';
import { SupportTicketModel } from '../support/support.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';

const router = Router();

router.get('/dashboard', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const [
      eventConfig,
      ticketTypes,
      bookingAgg,
      paymentAgg,
      ticketStatusAgg,
      gateAgg,
      salesTimeline,
      recentBookings,
      recentCheckins,
      failedTicketsCount,
      failedNotificationsCount,
      openSupportCount,
    ] = await Promise.all([
      getOrCreateEventConfig(),
      TicketTypeModel.find().sort({ displayOrder: 1 }).lean(),
      BookingModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            tickets: { $sum: '$totalTickets' },
            gross: { $sum: '$subtotalAmount' },
            net: { $sum: '$finalAmount' },
            refunded: { $sum: '$refundedAmount' },
          },
        },
      ]),
      PaymentModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
            refunded: { $sum: '$refundedAmount' },
          },
        },
      ]),
      TicketModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      CheckinModel.aggregate([
        { $match: { result: 'VALID' } },
        { $group: { _id: '$gateName', count: { $sum: 1 } } },
      ]),
      BookingModel.aggregate([
        { $match: { status: { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            bookings: { $sum: 1 },
            tickets: { $sum: '$totalTickets' },
            revenue: { $sum: '$finalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      BookingModel.find().sort({ createdAt: -1 }).limit(8).lean(),
      CheckinModel.find().sort({ createdAt: -1 }).limit(10).lean(),
      BookingModel.countDocuments({ status: 'PAID', ticketGenerationStatus: 'FAILED' }),
      NotificationLogModel.countDocuments({ status: 'FAILED' }),
      SupportTicketModel.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
    ]);

    const totalCapacity = ticketTypes.reduce((s, t) => s + t.capacity, 0);
    const totalSold = ticketTypes.reduce((s, t) => s + t.soldQuantity, 0);
    const totalReserved = ticketTypes.reduce((s, t) => s + t.reservedQuantity, 0);
    const availableTickets = Math.max(0, totalCapacity - totalSold - totalReserved);

    const paidStatuses = new Set(['PAID', 'PARTIALLY_REFUNDED']);
    const paidBookings = bookingAgg.filter((b) => paidStatuses.has(String(b._id)));
    const grossRevenue = paidBookings.reduce((s, b) => s + b.gross, 0);
    const collectedRevenue = paidBookings.reduce((s, b) => s + b.net, 0);
    const totalRefunded = bookingAgg.reduce((s, b) => s + b.refunded, 0);
    const netRevenue = Math.max(0, collectedRevenue - totalRefunded);

    const ticketMap = new Map(ticketStatusAgg.map((t) => [String(t._id), t.count as number]));
    const issuedCount = ticketMap.get('ISSUED') ?? 0;
    const checkedInCount = ticketMap.get('CHECKED_IN') ?? 0;
    const checkedOutCount = ticketMap.get('CHECKED_OUT') ?? 0;
    const activeAttendees = issuedCount + checkedInCount + checkedOutCount;
    const totalEntered = checkedInCount + checkedOutCount;
    const attendancePct = activeAttendees > 0 ? Math.round((totalEntered / activeAttendees) * 1000) / 10 : 0;

    sendSuccess(res, {
      event: {
        name: eventConfig.name,
        subtitle: eventConfig.subtitle,
        eventDate: eventConfig.eventDate,
        operations: eventConfig.operations,
      },
      kpis: {
        totalBookings: bookingAgg.reduce((s, b) => s + b.count, 0),
        paidBookings: paidBookings.reduce((s, b) => s + b.count, 0),
        totalTicketsSold: totalSold,
        totalReserved,
        availableTickets,
        totalCapacity,
        totalAttendees: activeAttendees,
        checkedInCount,
        checkedOutCount,
        remainingAttendees: issuedCount,
        attendancePercentage: attendancePct,
        grossRevenue,
        netRevenue,
        totalRefunded,
      },
      paymentBreakdown: paymentAgg,
      ticketStatusBreakdown: ticketStatusAgg,
      categorySales: ticketTypes.map((tt) => ({
        id: String(tt._id),
        name: tt.name,
        code: tt.code,
        price: tt.price,
        capacity: tt.capacity,
        soldQuantity: tt.soldQuantity,
        reservedQuantity: tt.reservedQuantity,
        availableQuantity: Math.max(0, tt.capacity - tt.soldQuantity - tt.reservedQuantity),
        revenue: tt.soldQuantity * tt.price,
      })),
      gateActivity: gateAgg.map((g) => ({ gateName: g._id || 'Unknown', count: g.count })),
      salesTimeline: salesTimeline.map((d) => ({
        date: d._id,
        bookings: d.bookings,
        tickets: d.tickets,
        revenue: d.revenue,
      })),
      recentBookings,
      recentCheckins,
      alerts: {
        failedTicketGenerations: failedTicketsCount,
        failedNotifications: failedNotificationsCount,
        openSupportTickets: openSupportCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Event Day Control Center — live operational telemetry
router.get('/event-day', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const [
      eventConfig,
      checkedInCount,
      checkedOutCount,
      issuedCount,
      gates,
      gateStats,
      devices,
      staff,
      recentScans,
      duplicateAlerts,
      invalidAttempts,
      failedTickets,
      failedNotifications,
    ] = await Promise.all([
      getOrCreateEventConfig(),
      TicketModel.countDocuments({ status: 'CHECKED_IN' }),
      TicketModel.countDocuments({ status: 'CHECKED_OUT' }),
      TicketModel.countDocuments({ status: 'ISSUED' }),
      GateModel.find().sort({ code: 1 }).lean(),
      CheckinModel.aggregate([
        {
          $group: {
            _id: { gateId: '$gateId', result: '$result' },
            count: { $sum: 1 },
          },
        },
      ]),
      ScannerDeviceModel.find().populate('assignedGateId', 'code name').lean(),
      UserModel.find({ role: 'staff' }).select('name email status assignedGateIds lastLoginAt').lean(),
      CheckinModel.find().sort({ createdAt: -1 }).limit(25).lean(),
      CheckinModel.find({ result: 'ALREADY_CHECKED_IN' }).sort({ createdAt: -1 }).limit(15).lean(),
      CheckinModel.find({
        result: { $in: ['INVALID', 'REVOKED', 'CANCELLED', 'REFUNDED', 'WRONG_EVENT', 'UNAUTHORIZED_GATE', 'NOT_CHECKED_IN'] },
      })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      BookingModel.find({ status: 'PAID', ticketGenerationStatus: 'FAILED' })
        .select('bookingReference primaryContact ticketGenerationError')
        .lean(),
      NotificationLogModel.find({ status: 'FAILED' })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
    ]);

    const totalEligible = checkedInCount + checkedOutCount + issuedCount;
    const totalEntered = checkedInCount + checkedOutCount;
    const checkinPercentage = totalEligible > 0 ? Math.round((totalEntered / totalEligible) * 1000) / 10 : 0;

    sendSuccess(res, {
      operations: eventConfig.operations,
      liveCounts: {
        checkedInCount,
        checkedOutCount,
        remainingAttendees: issuedCount,
        totalEligible,
        checkinPercentage,
      },
      gates: gates.map((g) => {
        const valid =
          gateStats.find((s) => String(s._id.gateId) === String(g._id) && s._id.result === 'VALID')?.count ?? 0;
        const checkedOut =
          gateStats.find((s) => String(s._id.gateId) === String(g._id) && s._id.result === 'CHECKED_OUT')?.count ?? 0;
        const rejected = gateStats
          .filter(
            (s) =>
              String(s._id.gateId) === String(g._id) &&
              s._id.result !== 'VALID' &&
              s._id.result !== 'CHECKED_OUT',
          )
          .reduce((sum, s) => sum + s.count, 0);
        return { ...g, validScans: valid, checkoutScans: checkedOut, rejectedScans: rejected };
      }),
      devices,
      staff,
      recentScans,
      alerts: {
        duplicateScans: duplicateAlerts,
        invalidAttempts,
        paymentRecoveryAlerts: failedTickets,
        notificationFailures: failedNotifications,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const analyticsRoutes = router;
