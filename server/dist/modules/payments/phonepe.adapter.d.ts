import type { Request } from 'express';
export interface InitiatePaymentParams {
    merchantTransactionId: string;
    bookingReference: string;
    amountPaise: number;
    customerMobile: string;
    redirectUrl: string;
    callbackUrl: string;
}
export interface InitiatePaymentResult {
    provider: 'PHONEPE' | 'PHONEPE_DEV';
    redirectUrl: string;
    providerTransactionId?: string;
    rawResponse: Record<string, unknown>;
}
export interface PaymentStatusResult {
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    merchantTransactionId: string;
    providerTransactionId?: string;
    amountPaise: number;
    currency: string;
    failureReason?: string;
    rawResponse: Record<string, unknown>;
}
export interface VerifiedWebhookResult {
    verified: boolean;
    eventKey: string;
    merchantTransactionId: string;
    providerTransactionId?: string;
    amountPaise: number;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    failureReason?: string;
    rawPayload: Record<string, unknown>;
}
export interface RefundResult {
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    providerRefundId?: string;
    rawResponse: Record<string, unknown>;
    errorMessage?: string;
}
export interface PaymentGatewayAdapter {
    readonly mode: 'PHONEPE' | 'PHONEPE_DEV';
    initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
    checkPaymentStatus(merchantTransactionId: string): Promise<PaymentStatusResult>;
    verifyWebhook(req: Request): Promise<VerifiedWebhookResult>;
    initiateRefund(params: {
        merchantTransactionId: string;
        merchantRefundId: string;
        amountPaise: number;
    }): Promise<RefundResult>;
}
export declare function getPaymentGatewayAdapter(): PaymentGatewayAdapter;
export declare function signDevWebhookPayload(payload: Record<string, unknown>): string;
//# sourceMappingURL=phonepe.adapter.d.ts.map