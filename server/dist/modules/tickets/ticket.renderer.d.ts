import type { IEventConfig } from '../event/event.model.js';
import type { ITicket } from './ticket.model.js';
export declare function generateQrDataUrl(qrToken: string): Promise<string>;
export declare function generateQrPngBuffer(qrToken: string): Promise<Buffer>;
/**
 * Renders the 8:14 (960x1680) collector pass PNG with a divine Shiva header banner,
 * clean cream ticket card body (zero text overlap/overflow), and crisp gate QR stub.
 */
export declare function renderTicketPng(ticket: ITicket, event: IEventConfig, attendeeAge?: number | null): Promise<Buffer>;
export declare function renderTicketPdf(ticket: ITicket, event: IEventConfig): Promise<Buffer>;
//# sourceMappingURL=ticket.renderer.d.ts.map