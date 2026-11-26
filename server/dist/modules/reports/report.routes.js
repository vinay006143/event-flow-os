import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { BookingModel } from '../bookings/booking.model.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
import { CheckinModel } from '../checkins/checkin.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { recordAudit } from '../audit/audit.service.js';
const router = Router();
function toCsv(headers, rows) {
    const escape = (val) => {
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
    };
    return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}
router.get('/export/:type', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const reportType = req.params.type;
        let csv = '';
        let filename = `eventflow-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
        if (reportType === 'bookings') {
            const bookings = await BookingModel.find().sort({ createdAt: -1 }).lean();
            csv = toCsv(['BookingReference', 'Status', 'Name', 'Mobile', 'Email', 'Tickets', 'Subtotal', 'Discount', 'FinalAmount', 'Refunded', 'PromoCode', 'CreatedAt'], bookings.map((b) => [
                b.bookingReference,
                b.status,
                b.primaryContact.fullName,
                b.primaryContact.mobile,
                b.primaryContact.email,
                b.totalTickets,
                b.subtotalAmount,
                b.discountAmount,
                b.finalAmount,
                b.refundedAmount,
                b.promoCode ?? '',
                b.createdAt.toISOString(),
            ]));
        }
        else if (reportType === 'attendees') {
            const attendees = await AttendeeModel.find().sort({ createdAt: -1 }).lean();
            csv = toCsv(['BookingReference', 'FullName', 'Age', 'Mobile', 'Email', 'Category', 'Status', 'CreatedAt'], attendees.map((a) => [
                a.bookingReference,
                a.fullName,
                a.age ?? '',
                a.mobile,
                a.email ?? '',
                a.ticketTypeName,
                a.status,
                a.createdAt.toISOString(),
            ]));
        }
        else if (reportType === 'checkins') {
            const checkins = await CheckinModel.find().sort({ createdAt: -1 }).lean();
            csv = toCsv(['Timestamp', 'Result', 'Method', 'TicketId', 'BookingReference', 'AttendeeName', 'Category', 'Gate', 'Staff', 'Message'], checkins.map((c) => [
                c.createdAt.toISOString(),
                c.result,
                c.method,
                c.ticketId ?? '',
                c.bookingReference ?? '',
                c.attendeeName ?? '',
                c.ticketTypeName ?? '',
                c.gateName ?? '',
                c.staffName,
                c.message,
            ]));
        }
        else if (reportType === 'payments') {
            const payments = await PaymentModel.find().sort({ createdAt: -1 }).lean();
            csv = toCsv(['MerchantTxnId', 'ProviderTxnId', 'BookingReference', 'Provider', 'Amount', 'Refunded', 'Status', 'VerifiedAt', 'CreatedAt'], payments.map((p) => [
                p.merchantTransactionId,
                p.providerTransactionId ?? '',
                p.bookingReference,
                p.provider,
                p.amount,
                p.refundedAmount,
                p.status,
                p.verifiedAt ? p.verifiedAt.toISOString() : '',
                p.createdAt.toISOString(),
            ]));
        }
        else {
            res.status(400).json({ success: false, error: { code: 'INVALID_REPORT', message: 'Unknown report type' } });
            return;
        }
        await recordAudit({
            actorId: req.user.id,
            actorRole: 'admin',
            actorEmail: req.user.email,
            action: 'REPORT_EXPORTED',
            entityType: 'Report',
            entityReference: reportType,
            req,
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }
    catch (err) {
        next(err);
    }
});
export const reportRoutes = router;
//# sourceMappingURL=report.routes.js.map