import type { Request } from 'express';
import { type BookingStatus, type CreateBookingInput } from '@eventflow/shared';
import { type IBooking } from './booking.model.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
export declare function transitionBookingStatus(bookingId: string, toStatus: BookingStatus, options?: {
    reason?: string;
    actor?: string;
}): Promise<IBooking>;
export declare function createBookingFromReservation(input: CreateBookingInput, req?: Request): Promise<{
    booking: IBooking;
    attendees: Awaited<ReturnType<typeof AttendeeModel.find>>;
    retrievalToken: string;
}>;
export declare function finalizeReservationToSold(booking: IBooking): Promise<void>;
//# sourceMappingURL=booking.service.d.ts.map