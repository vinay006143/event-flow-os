import type { CreateReservationInput } from '@eventflow/shared';
import { type IReservation } from './reservation.model.js';
export declare function createInventoryReservation(input: CreateReservationInput): Promise<IReservation>;
export declare function releaseReservation(reservationId: string, nextStatus?: 'RELEASED' | 'EXPIRED'): Promise<(import("mongoose").Document<unknown, {}, IReservation, {}, {}> & IReservation & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function expireStaleReservations(): Promise<number>;
//# sourceMappingURL=reservation.service.d.ts.map