import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { PaymentModel, WebhookEventModel } from './payment.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import { finalizeReservationToSold, transitionBookingStatus } from '../bookings/booking.service.js';
import { issueTicketsForPaidBooking } from '../tickets/ticket.service.js';
import { dispatchBookingTicketsNotifications } from '../notifications/notification.service.js';
import { getPaymentGatewayAdapter } from './phonepe.adapter.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { randomCode } from '../../utils/crypto.js';
import { recordAudit } from '../audit/audit.service.js';
export async function initiatePaymentForBooking(bookingId, idempotencyKey, req) {
    if (idempotencyKey) {
        const existing = await PaymentModel.findOne({ idempotencyKey });
        if (existing)
            return existing;
    }
    const eventConfig = await getOrCreateEventConfig();
    if (!eventConfig.operations.checkoutEnabled || !eventConfig.operations.salesOpen) {
        throw new BadRequestError('Checkout is currently disabled', 'CHECKOUT_DISABLED');
    }
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
        throw new NotFoundError('Booking not found');
    if (booking.status === 'PAID') {
        throw new ConflictError('Booking is already paid', 'ALREADY_PAID');
    }
    if (!['RESERVED', 'FAILED', 'PENDING_PAYMENT'].includes(booking.status)) {
        throw new BadRequestError(`Cannot initiate payment for booking in ${booking.status} state`);
    }
    const adapter = getPaymentGatewayAdapter();
    const merchantTransactionId = `TXN-${booking.bookingReference}-${randomCode(6)}`;
    const amountPaise = Math.round(booking.finalAmount * 100);
    await transitionBookingStatus(String(booking._id), 'PENDING_PAYMENT', {
        actor: 'public',
        reason: `Payment initiated (${merchantTransactionId})`,
    });
    // Zero-rupee booking (e.g. 100% promo or free ticket) — verified server-side without gateway redirect
    if (amountPaise === 0) {
        const payment = await PaymentModel.create({
            merchantTransactionId,
            providerTransactionId: `FREE-${merchantTransactionId}`,
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            provider: adapter.mode,
            amount: 0,
            amountPaise: 0,
            currency: booking.currency,
            status: 'INITIATED',
            redirectUrl: `${env.FRONTEND_URL}/payment/success?booking=${encodeURIComponent(booking.bookingReference)}`,
            idempotencyKey,
        });
        await settleVerifiedPayment({
            payment,
            status: 'COMPLETED',
            amountPaise: 0,
            currency: 'INR',
            providerTransactionId: `FREE-${merchantTransactionId}`,
            rawResponse: { freePass: true },
        });
        return (await PaymentModel.findById(payment._id));
    }
    const redirectUrl = `${env.PHONEPE_REDIRECT_URL}?txn=${encodeURIComponent(merchantTransactionId)}&booking=${encodeURIComponent(booking.bookingReference)}`;
    const initRes = await adapter.initiatePayment({
        merchantTransactionId,
        bookingReference: booking.bookingReference,
        amountPaise,
        customerMobile: booking.primaryContact.mobile,
        redirectUrl,
        callbackUrl: env.PHONEPE_CALLBACK_URL,
    });
    const payment = await PaymentModel.create({
        merchantTransactionId,
        providerTransactionId: initRes.providerTransactionId,
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        provider: initRes.provider,
        amount: booking.finalAmount,
        amountPaise,
        currency: booking.currency,
        status: 'PENDING',
        redirectUrl: initRes.redirectUrl,
        idempotencyKey,
        rawInitResponse: initRes.rawResponse,
    });
    await recordAudit({
        actorRole: 'public',
        action: 'PAYMENT_INITIATED',
        entityType: 'Payment',
        entityId: String(payment._id),
        entityReference: merchantTransactionId,
        req,
        metadata: { bookingReference: booking.bookingReference, amount: booking.finalAmount, provider: adapter.mode },
    });
    return payment;
}
export async function settleVerifiedPayment(params) {
    const { payment } = params;
    const booking = await BookingModel.findById(payment.bookingId);
    if (!booking)
        throw new NotFoundError('Booking linked to payment not found');
    // Strict server-side validation of amount & currency
    if (params.status === 'COMPLETED') {
        if (params.amountPaise !== payment.amountPaise) {
            throw new BadRequestError(`Payment amount mismatch: expected ${payment.amountPaise} paise, got ${params.amountPaise}`, 'PAYMENT_AMOUNT_MISMATCH');
        }
        if (params.currency.toUpperCase() !== payment.currency.toUpperCase()) {
            throw new BadRequestError('Payment currency mismatch', 'PAYMENT_CURRENCY_MISMATCH');
        }
        // Idempotent completion guard
        const updatedPayment = await PaymentModel.findOneAndUpdate({ _id: payment._id, status: { $ne: 'COMPLETED' } }, {
            $set: {
                status: 'COMPLETED',
                verifiedAt: new Date(),
                ...(params.providerTransactionId ? { providerTransactionId: params.providerTransactionId } : {}),
                ...(params.rawResponse ? { rawStatusResponse: params.rawResponse } : {}),
            },
        }, { new: true });
        if (updatedPayment) {
            await finalizeReservationToSold(booking);
            await transitionBookingStatus(String(booking._id), 'PAID', {
                actor: 'payment-verifier',
                reason: `Verified payment ${payment.merchantTransactionId}`,
            });
            await recordAudit({
                actorRole: 'system',
                action: 'PAYMENT_VERIFIED_COMPLETED',
                entityType: 'Payment',
                entityId: String(payment._id),
                entityReference: payment.merchantTransactionId,
                metadata: { bookingReference: booking.bookingReference, amount: payment.amount },
            });
        }
        // Issue tickets after verified payment; failures are marked on booking for recovery without losing payment
        if (booking.ticketGenerationStatus !== 'COMPLETED') {
            try {
                await issueTicketsForPaidBooking(String(booking._id));
                try {
                    await dispatchBookingTicketsNotifications(String(booking._id));
                }
                catch (notifErr) {
                    logger.error({ err: notifErr, bookingId: booking._id }, 'Ticket notification failed (booking remains PAID)');
                }
            }
            catch (ticketErr) {
                logger.error({ err: ticketErr, bookingId: booking._id }, 'Ticket generation failed (marked for recovery)');
            }
        }
        return (await PaymentModel.findById(payment._id));
    }
    if (params.status === 'FAILED') {
        if (payment.status === 'COMPLETED') {
            return payment; // Never downgrade an already verified payment
        }
        payment.status = 'FAILED';
        payment.failureReason = params.failureReason ?? 'Payment failed at gateway';
        if (params.rawResponse)
            payment.rawStatusResponse = params.rawResponse;
        await payment.save();
        if (booking.status === 'PENDING_PAYMENT') {
            await transitionBookingStatus(String(booking._id), 'FAILED', {
                actor: 'payment-verifier',
                reason: payment.failureReason,
            });
        }
        return payment;
    }
    if (params.rawResponse) {
        payment.rawStatusResponse = params.rawResponse;
        await payment.save();
    }
    return payment;
}
export async function processPhonePeWebhook(req) {
    const adapter = getPaymentGatewayAdapter();
    const verifiedData = await adapter.verifyWebhook(req);
    // Idempotency check
    const existingEvent = await WebhookEventModel.findOne({ eventKey: verifiedData.eventKey });
    if (existingEvent) {
        return { duplicate: true, event: existingEvent };
    }
    if (!verifiedData.verified) {
        await WebhookEventModel.create({
            provider: adapter.mode,
            eventKey: `rejected:${Date.now()}:${Math.random()}`,
            merchantTransactionId: verifiedData.merchantTransactionId,
            verified: false,
            processingStatus: 'REJECTED',
            payload: verifiedData.rawPayload,
            errorMessage: 'Webhook signature verification failed',
        });
        throw new UnauthorizedError('Invalid payment webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
    }
    const payment = await PaymentModel.findOne({
        merchantTransactionId: verifiedData.merchantTransactionId,
    });
    if (!payment) {
        throw new NotFoundError('Payment record not found for webhook');
    }
    await WebhookEventModel.create({
        provider: adapter.mode,
        eventKey: verifiedData.eventKey,
        merchantTransactionId: verifiedData.merchantTransactionId,
        verified: true,
        processingStatus: 'PROCESSED',
        payload: verifiedData.rawPayload,
    });
    const settled = await settleVerifiedPayment({
        payment,
        status: verifiedData.status,
        amountPaise: verifiedData.amountPaise || payment.amountPaise,
        currency: 'INR',
        providerTransactionId: verifiedData.providerTransactionId,
        failureReason: verifiedData.failureReason,
        rawResponse: verifiedData.rawPayload,
    });
    return { duplicate: false, payment: settled };
}
//# sourceMappingURL=payment.service.js.map