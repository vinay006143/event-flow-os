export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(hash: string, plain: string): Promise<boolean>;
export declare function randomToken(bytes?: number): string;
export declare function sha256(input: string): string;
export declare function randomCode(length?: number): string;
export declare function generateTicketId(eventCode?: string): string;
export declare function generateBookingReference(eventCode?: string): string;
export declare function generateNumericOtp(digits?: number): string;
export interface QrTokenPayload {
    v: number;
    tid: string;
    eid: string;
    nonce: string;
}
/**
 * Generates an opaque, cryptographically signed QR token.
 * Contains zero PII or database documents: only version, ticket code, event id, random nonce, and HMAC-SHA256 signature.
 */
export declare function signQrToken(ticketId: string, eventId: string): {
    token: string;
    tokenHash: string;
};
export declare function verifyQrTokenFormat(token: string): {
    valid: true;
    ticketId: string;
    eventId: string;
    tokenHash: string;
} | {
    valid: false;
};
//# sourceMappingURL=crypto.d.ts.map