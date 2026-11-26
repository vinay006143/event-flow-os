import { TicketTypeModel } from './ticket-type.model.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';
export function computeAvailable(tt) {
    return Math.max(0, tt.capacity - tt.soldQuantity - tt.reservedQuantity);
}
export async function listPublicTicketTypes() {
    const now = new Date();
    const types = await TicketTypeModel.find({ isActive: true }).sort({ displayOrder: 1, price: 1 });
    return types.map((tt) => {
        const obj = tt.toObject();
        const saleNotStarted = tt.saleStart ? now < tt.saleStart : false;
        const saleEnded = tt.saleEnd ? now > tt.saleEnd : false;
        return {
            ...obj,
            id: String(tt._id),
            availableQuantity: computeAvailable(tt),
            onSale: tt.isActive && !saleNotStarted && !saleEnded,
        };
    });
}
export async function listAllTicketTypes() {
    const types = await TicketTypeModel.find().sort({ displayOrder: 1, price: 1 });
    return types.map((tt) => ({
        ...tt.toObject(),
        id: String(tt._id),
        availableQuantity: computeAvailable(tt),
    }));
}
export async function createTicketType(input, actor, req) {
    const existing = await TicketTypeModel.findOne({ code: String(input.code).toUpperCase() });
    if (existing) {
        throw new ConflictError('Ticket category code already exists');
    }
    const created = await TicketTypeModel.create(input);
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'TICKET_TYPE_CREATED',
        entityType: 'TicketType',
        entityId: String(created._id),
        entityReference: created.code,
        req,
        metadata: { price: created.price, capacity: created.capacity },
    });
    return { ...created.toObject(), id: String(created._id), availableQuantity: computeAvailable(created) };
}
export async function updateTicketType(id, updates, actor, req) {
    const tt = await TicketTypeModel.findById(id);
    if (!tt)
        throw new NotFoundError('Ticket category not found');
    if (updates.capacity !== undefined) {
        const nextCap = Number(updates.capacity);
        if (nextCap < tt.soldQuantity + tt.reservedQuantity) {
            throw new BadRequestError(`Capacity cannot be reduced below sold + reserved (${tt.soldQuantity + tt.reservedQuantity})`);
        }
    }
    Object.assign(tt, updates);
    await tt.save();
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'TICKET_TYPE_UPDATED',
        entityType: 'TicketType',
        entityId: String(tt._id),
        entityReference: tt.code,
        req,
        metadata: { updates },
    });
    return { ...tt.toObject(), id: String(tt._id), availableQuantity: computeAvailable(tt) };
}
export async function deleteTicketType(id, actor, req) {
    const tt = await TicketTypeModel.findById(id);
    if (!tt)
        throw new NotFoundError('Ticket category not found');
    if (tt.soldQuantity > 0 || tt.reservedQuantity > 0) {
        throw new BadRequestError('Cannot delete a category with sold or reserved passes. Deactivate it instead.', 'TICKET_TYPE_IN_USE');
    }
    await tt.deleteOne();
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'TICKET_TYPE_DELETED',
        entityType: 'TicketType',
        entityId: String(tt._id),
        entityReference: tt.code,
        req,
    });
    return { deleted: true, id: String(tt._id) };
}
//# sourceMappingURL=ticket-type.service.js.map