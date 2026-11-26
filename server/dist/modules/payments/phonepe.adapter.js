import crypto from 'crypto';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { BadRequestError } from '../../utils/errors.js';
/**
 * Development Payment Adapter for local testing & staging without live PhonePe credentials.
 * Clearly labeled as development mode — never claim production PhonePe is live under this adapter.
 */
class PhonePeDevAdapter {
    mode = 'PHONEPE_DEV';
    async initiatePayment(params) {
        const devRedirect = `${env.FRONTEND_URL}/payment?txn=${encodeURIComponent(params.merchantTransactionId)}&booking=${encodeURIComponent(params.bookingReference)}&mode=development`;
        logger.info({ merchantTransactionId: params.merchantTransactionId, amountPaise: params.amountPaise }, '[DEV PAYMENT ADAPTER] Initiated testable checkout session');
        return {
            provider: 'PHONEPE_DEV',
            redirectUrl: devRedirect,
            providerTransactionId: `DEVPG-${params.merchantTransactionId}`,
            rawResponse: { mode: 'development', amountPaise: params.amountPaise },
        };
    }
    async checkPaymentStatus(merchantTransactionId) {
        // Status is reconciled from DB / explicit simulated outcomes in dev mode
        return {
            status: 'PENDING',
            merchantTransactionId,
            amountPaise: 0,
            currency: 'INR',
            rawResponse: { mode: 'development', note: 'Use simulation endpoint or webhook in dev mode' },
        };
    }
    async verifyWebhook(req) {
        const signature = String(req.headers['x-dev-webhook-signature'] ?? '');
        const body = req.body;
        const rawStr = JSON.stringify(body);
        const expected = crypto
            .createHmac('sha256', env.JWT_ACCESS_SECRET)
            .update(rawStr)
            .digest('hex');
        const verified = signature.length === expected.length &&
            crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        const merchantTransactionId = String(body.merchantTransactionId ?? '');
        const statusRaw = String(body.status ?? 'PENDING').toUpperCase();
        const status = statusRaw === 'COMPLETED' ? 'COMPLETED' : statusRaw === 'FAILED' ? 'FAILED' : 'PENDING';
        return {
            verified,
            eventKey: String(body.eventId ?? `dev:${merchantTransactionId}:${status}`),
            merchantTransactionId,
            providerTransactionId: String(body.providerTransactionId ?? `DEVPG-${merchantTransactionId}`),
            amountPaise: Number(body.amountPaise ?? 0),
            status,
            failureReason: body.failureReason ? String(body.failureReason) : undefined,
            rawPayload: body,
        };
    }
    async initiateRefund(params) {
        logger.info(params, '[DEV PAYMENT ADAPTER] Refund confirmed in development mode');
        return {
            status: 'COMPLETED',
            providerRefundId: `DEVREF-${params.merchantRefundId}`,
            rawResponse: { mode: 'development', confirmed: true },
        };
    }
}
/**
 * Official PhonePe PG Integration Adapter (Standard Checkout / PG APIs + SHA256 X-VERIFY / Webhook auth).
 */
class PhonePeOfficialAdapter {
    mode = 'PHONEPE';
    signXVerify(base64Payload, apiEndpoint) {
        if (!env.PHONEPE_SALT_KEY) {
            throw new BadRequestError('PhonePe credentials are not configured', 'PAYMENT_CONFIG_MISSING');
        }
        const checksum = crypto
            .createHash('sha256')
            .update(`${base64Payload}${apiEndpoint}${env.PHONEPE_SALT_KEY}`)
            .digest('hex');
        return `${checksum}###${env.PHONEPE_SALT_INDEX}`;
    }
    async initiatePayment(params) {
        const payload = {
            merchantId: env.PHONEPE_MERCHANT_ID,
            merchantTransactionId: params.merchantTransactionId,
            merchantUserId: `MUID-${params.bookingReference}`,
            amount: params.amountPaise,
            redirectUrl: params.redirectUrl,
            redirectMode: 'REDIRECT',
            callbackUrl: params.callbackUrl,
            mobileNumber: params.customerMobile,
            paymentInstrument: { type: 'PAY_PAGE' },
        };
        const base64Payload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
        const endpoint = '/pg/v1/pay';
        const xVerify = this.signXVerify(base64Payload, endpoint);
        const response = await fetch(`${env.PHONEPE_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
            },
            body: JSON.stringify({ request: base64Payload }),
        });
        const data = (await response.json());
        const redirectUrl = data.data?.instrumentResponse?.redirectInfo?.url;
        if (!response.ok || !data.success || !redirectUrl) {
            throw new BadRequestError(data.message || 'PhonePe payment initiation failed', 'PHONEPE_INIT_FAILED', data);
        }
        return {
            provider: 'PHONEPE',
            redirectUrl,
            rawResponse: data,
        };
    }
    async checkPaymentStatus(merchantTransactionId) {
        const endpoint = `/pg/v1/status/${env.PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
        const checksum = crypto
            .createHash('sha256')
            .update(`${endpoint}${env.PHONEPE_SALT_KEY}`)
            .digest('hex');
        const xVerify = `${checksum}###${env.PHONEPE_SALT_INDEX}`;
        const response = await fetch(`${env.PHONEPE_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': env.PHONEPE_MERCHANT_ID,
            },
        });
        const data = (await response.json());
        const state = data.data?.state;
        const status = data.code === 'PAYMENT_SUCCESS' || state === 'COMPLETED'
            ? 'COMPLETED'
            : state === 'FAILED' || data.code === 'PAYMENT_ERROR' || data.code === 'PAYMENT_DECLINED'
                ? 'FAILED'
                : 'PENDING';
        return {
            status,
            merchantTransactionId,
            providerTransactionId: data.data?.transactionId,
            amountPaise: Number(data.data?.amount ?? 0),
            currency: 'INR',
            failureReason: status === 'FAILED' ? data.message : undefined,
            rawResponse: data,
        };
    }
    async verifyWebhook(req) {
        const body = req.body;
        // Support PhonePe PG v1 X-VERIFY SHA256 verification
        const xVerify = String(req.headers['x-verify'] ?? '');
        if (body.response && xVerify && env.PHONEPE_SALT_KEY) {
            const expected = `${crypto
                .createHash('sha256')
                .update(`${body.response}${env.PHONEPE_SALT_KEY}`)
                .digest('hex')}###${env.PHONEPE_SALT_INDEX}`;
            const verified = xVerify.length === expected.length &&
                crypto.timingSafeEqual(Buffer.from(xVerify), Buffer.from(expected));
            const decoded = JSON.parse(Buffer.from(body.response, 'base64').toString('utf8'));
            const state = decoded.data?.state;
            const status = decoded.code === 'PAYMENT_SUCCESS' || state === 'COMPLETED'
                ? 'COMPLETED'
                : state === 'FAILED' || decoded.code === 'PAYMENT_ERROR'
                    ? 'FAILED'
                    : 'PENDING';
            const mTxnId = String(decoded.data?.merchantTransactionId ?? '');
            return {
                verified,
                eventKey: `phonepe:${mTxnId}:${decoded.data?.transactionId ?? ''}:${status}`,
                merchantTransactionId: mTxnId,
                providerTransactionId: decoded.data?.transactionId,
                amountPaise: Number(decoded.data?.amount ?? 0),
                status,
                failureReason: status === 'FAILED' ? decoded.message : undefined,
                rawPayload: decoded,
            };
        }
        // Support PhonePe Standard Checkout v2 Authorization SHA256(username:password) verification
        const authHeader = String(req.headers.authorization ?? '');
        if (env.PHONEPE_WEBHOOK_USERNAME && env.PHONEPE_WEBHOOK_PASSWORD && authHeader) {
            const expectedDigest = crypto
                .createHash('sha256')
                .update(`${env.PHONEPE_WEBHOOK_USERNAME}:${env.PHONEPE_WEBHOOK_PASSWORD}`)
                .digest('hex');
            const incoming = authHeader.replace(/^SHA256\s+/i, '').trim();
            const verified = incoming.length === expectedDigest.length &&
                crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(expectedDigest));
            const payload = (body.payload ?? {});
            const mTxnId = String(payload.merchantOrderId ?? payload.merchantTransactionId ?? '');
            const state = String(payload.state ?? 'PENDING').toUpperCase();
            const status = state === 'COMPLETED' ? 'COMPLETED' : state === 'FAILED' ? 'FAILED' : 'PENDING';
            return {
                verified,
                eventKey: `phonepe-v2:${mTxnId}:${String(payload.orderId ?? '')}:${status}`,
                merchantTransactionId: mTxnId,
                providerTransactionId: payload.orderId ? String(payload.orderId) : undefined,
                amountPaise: Number(payload.amount ?? 0),
                status,
                rawPayload: body,
            };
        }
        return {
            verified: false,
            eventKey: `unverified:${Date.now()}`,
            merchantTransactionId: '',
            amountPaise: 0,
            status: 'FAILED',
            rawPayload: body,
        };
    }
    async initiateRefund(params) {
        const payload = {
            merchantId: env.PHONEPE_MERCHANT_ID,
            merchantUserId: `MUID-REF-${params.merchantTransactionId}`,
            originalTransactionId: params.merchantTransactionId,
            merchantTransactionId: params.merchantRefundId,
            amount: params.amountPaise,
            callbackUrl: env.PHONEPE_CALLBACK_URL,
        };
        const base64Payload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
        const endpoint = '/pg/v1/refund';
        const xVerify = this.signXVerify(base64Payload, endpoint);
        const response = await fetch(`${env.PHONEPE_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
            },
            body: JSON.stringify({ request: base64Payload }),
        });
        const data = (await response.json());
        if (!response.ok || !data.success) {
            return {
                status: 'FAILED',
                rawResponse: data,
                errorMessage: data.message ?? 'PhonePe refund request failed',
            };
        }
        const status = data.data?.state === 'COMPLETED' ? 'COMPLETED' : 'PENDING';
        return {
            status,
            providerRefundId: data.data?.transactionId,
            rawResponse: data,
        };
    }
}
export function getPaymentGatewayAdapter() {
    if (env.PAYMENT_PROVIDER_MODE === 'development') {
        return new PhonePeDevAdapter();
    }
    return new PhonePeOfficialAdapter();
}
export function signDevWebhookPayload(payload) {
    return crypto
        .createHmac('sha256', env.JWT_ACCESS_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
}
//# sourceMappingURL=phonepe.adapter.js.map