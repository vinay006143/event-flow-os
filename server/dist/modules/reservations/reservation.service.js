import { ReservationModel } from './reservation.model.js';
import { TicketTypeModel } from '../ticket-types/ticket-type.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import { validateAndCalculatePromo } from '../promo-codes/promo-code.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { randomCode } from '../../utils/crypto.js';
import { logger } from '../../config/logger.js';
export async function createInventoryReservation(input) {
    if (input.idempotencyKey) {
        const existing = await ReservationModel.findOne({
            idempotencyKey: input.idempotencyKey,
            status: 'ACTIVE',
            expiresAt: { $gt: new Date() },
        });
        if (existing)
            return existing;
    }
    const eventConfig = await getOrCreateEventConfig();
    if (!eventConfig.operations.salesOpen || !eventConfig.operations.registrationOpen) {
        throw new BadRequestError('Ticket sales are currently paused by the organizer', 'SALES_PAUSED');
    }
    // Merge duplicate ticketTypeIds in request
    const grouped = new Map();
    for (const item of input.items) {
        grouped.set(item.ticketTypeId, (grouped.get(item.ticketTypeId) ?? 0) + item.quantity);
    }
    const totalQty = Array.from(grouped.values()).reduce((sum, q) => sum + q, 0);
    if (totalQty > eventConfig.operations.maxTicketsPerBooking) {
        throw new BadRequestError(`Maximum ${eventConfig.operations.maxTicketsPerBooking} tickets allowed per booking`, 'MAX_TICKETS_EXCEEDED');
    }
    // First release any expired reservations opportunistically if needed
    await expireStaleReservations();
    const lockedItems = [];
    const reservationItems = [];
    const now = new Date();
    try {
        for (const [ticketTypeId, quantity] of grouped.entries()) {
            const tt = await TicketTypeModel.findById(ticketTypeId);
            if (!tt || !tt.isActive) {
                throw new NotFoundError('Selected ticket category is not available');
            }
            if (tt.saleStart && now < tt.saleStart) {
                throw new BadRequestError(`Sales for ${tt.name} have not started yet`);
            }
            if (tt.saleEnd && now > tt.saleEnd) {
                throw new BadRequestError(`Sales for ${tt.name} have ended`);
            }
            if (quantity > tt.maxPerBooking) {
                throw new BadRequestError(`Maximum ${tt.maxPerBooking} ${tt.name} tickets per booking`);
            }
            // Atomic conditional inventory lock prevents overselling under concurrency
            const locked = await TicketTypeModel.findOneAndUpdate({
                _id: tt._id,
                isActive: true,
                $expr: {
                    $gte: [
                        { $subtract: ['$capacity', { $add: ['$soldQuantity', '$reservedQuantity'] }] },
                        quantity,
                    ],
                },
            }, { $inc: { reservedQuantity: quantity } }, { new: true });
            if (!locked) {
                throw new ConflictError(`Insufficient available inventory for ${tt.name}`, 'INSUFFICIENT_INVENTORY');
            }
            lockedItems.push({ ticketTypeId: String(tt._id), quantity });
            reservationItems.push({
                ticketTypeId: tt._id,
                ticketTypeName: tt.name,
                ticketTypeCode: tt.code,
                quantity,
                unitPrice: tt.price,
            });
        }
    }
    catch (err) {
        // Rollback any already-locked items
        for (const locked of lockedItems) {
            await TicketTypeModel.updateOne({ _id: locked.ticketTypeId, reservedQuantity: { $gte: locked.quantity } }, { $inc: { reservedQuantity: -locked.quantity } });
        }
        throw err;
    }
    const subtotalAmount = reservationItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    let discountAmount = 0;
    let appliedPromoCode;
    if (input.promoCode) {
        try {
            const promoResult = await validateAndCalculatePromo({
                code: input.promoCode,
                items: reservationItems.map((i) => ({
                    ticketTypeId: String(i.ticketTypeId),
                    unitPrice: i.unitPrice,
                    quantity: i.quantity,
                })),
            });
            discountAmount = promoResult.discountAmount;
            appliedPromoCode = promoResult.promoCode.code;
        }
        catch (err) {
            // Rollback locked inventory if promo validation fails
            for (const locked of lockedItems) {
                await TicketTypeModel.updateOne({ _id: locked.ticketTypeId, reservedQuantity: { $gte: locked.quantity } }, { $inc: { reservedQuantity: -locked.quantity } });
            }
            throw err;
        }
    }
    const expiresAt = new Date(Date.now() + eventConfig.operations.reservationExpiryMinutes * 60 * 1000);
    const reservation = await ReservationModel.create({
        reservationCode: `RES-${randomCode(8)}`,
        items: reservationItems,
        totalQuantity: totalQty,
        subtotalAmount,
        discountAmount,
        finalAmount: Math.max(0, subtotalAmount - discountAmount),
        promoCode: appliedPromoCode,
        status: 'ACTIVE',
        idempotencyKey: input.idempotencyKey,
        expiresAt,
    });
    return reservation;
}
export async function releaseReservation(reservationId, nextStatus = 'RELEASED') {
    const reservation = await ReservationModel.findOneAndUpdate({ _id: reservationId, status: 'ACTIVE' }, { $set: { status: nextStatus } }, { new: true });
    if (!reservation)
        return null;
    for (const item of reservation.items) {
        await TicketTypeModel.updateOne({ _id: item.ticketTypeId, reservedQuantity: { $gte: item.quantity } }, { $inc: { reservedQuantity: -item.quantity } });
    }
    return reservation;
}
export async function expireStaleReservations() {
    const now = new Date();
    const stale = await ReservationModel.find({
        status: 'ACTIVE',
        expiresAt: { $lte: now },
    }).limit(100);
    let releasedCount = 0;
    for (const resv of stale) {
        const updated = await ReservationModel.findOneAndUpdate({ _id: resv._id, status: 'ACTIVE' }, { $set: { status: 'EXPIRED' } }, { new: true });
        if (updated) {
            for (const item of updated.items) {
                await TicketTypeModel.updateOne({ _id: item.ticketTypeId, reservedQuantity: { $gte: item.quantity } }, { $inc: { reservedQuantity: -item.quantity } });
            }
            releasedCount++;
        }
    }
    if (releasedCount > 0) {
        logger.info({ releasedCount }, 'Expired stale ticket reservations and restored inventory');
    }
    return releasedCount;
}
//# sourceMappingURL=reservation.service.js.map