import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { NotificationLogModel } from './notification.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { renderTicketPng } from '../tickets/ticket.renderer.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
]);
const MAX_IMAGE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
function parseAdminImageAttachment(input) {
    if (!input)
        return undefined;
    const filename = (input.filename || 'attachment.png').replace(/[^a-zA-Z0-9._-]/g, '_');
    if (input.dataUrl) {
        const match = input.dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
        const rawMime = match?.[1];
        const rawBase64 = match?.[2];
        if (!rawMime || !rawBase64) {
            throw new BadRequestError('Unsupported image format. Upload PNG, JPG, WEBP, or GIF image.');
        }
        const mimeType = rawMime.toLowerCase() === 'image/jpg' ? 'image/jpeg' : rawMime.toLowerCase();
        const buffer = Buffer.from(rawBase64.replace(/\s+/g, ''), 'base64');
        if (buffer.length === 0) {
            throw new BadRequestError('Attached image file is empty');
        }
        if (buffer.length > MAX_IMAGE_ATTACHMENT_BYTES) {
            throw new BadRequestError('Attached image exceeds maximum size of 5 MB');
        }
        return { filename, mimeType, buffer };
    }
    if (input.url) {
        let parsed;
        try {
            parsed = new URL(input.url);
        }
        catch {
            throw new BadRequestError('Attachment image URL must be a valid URL');
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new BadRequestError('Attachment image URL must start with http:// or https://');
        }
        const mimeType = input.mimeType && ALLOWED_IMAGE_MIME_TYPES.has(input.mimeType.toLowerCase())
            ? input.mimeType.toLowerCase()
            : 'image/png';
        return { filename, mimeType, url: parsed.toString() };
    }
    return undefined;
}
function buildAttachmentLogMeta(attachments = []) {
    const first = attachments[0];
    if (!first) {
        return { hasAttachment: false, attachmentCount: 0 };
    }
    const totalBytes = attachments.reduce((sum, a) => sum + (a.buffer?.length ?? 0), 0);
    return {
        hasAttachment: true,
        attachmentName: first.filename,
        attachmentMimeType: first.mimeType,
        attachmentCount: attachments.length,
        attachmentSizeBytes: totalBytes > 0 ? totalBytes : undefined,
        attachmentUrl: first.url,
    };
}
async function uploadWhatsAppMedia(att) {
    if (!att.buffer) {
        throw new Error('Cannot upload media without binary buffer');
    }
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', att.mimeType);
    form.append('file', new Blob([new Uint8Array(att.buffer)], { type: att.mimeType }), att.filename);
    const response = await fetch(`${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: form,
    });
    const data = (await response.json());
    if (!response.ok || !data.id) {
        throw new Error(data.error?.message ?? `WhatsApp media upload failed (${response.status})`);
    }
    return data.id;
}
async function sendViaWhatsAppAdapter(to, text, attachments = []) {
    if (env.WHATSAPP_PROVIDER_MODE === 'meta_cloud' && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN) {
        const cleanPhone = to.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const primaryImage = attachments[0];
        let payload;
        if (primaryImage) {
            const caption = text.slice(0, 1024);
            if (primaryImage.buffer) {
                const mediaId = await uploadWhatsAppMedia(primaryImage);
                payload = {
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'image',
                    image: { id: mediaId, caption },
                };
            }
            else if (primaryImage.url) {
                payload = {
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'image',
                    image: { link: primaryImage.url, caption },
                };
            }
            else {
                payload = {
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'text',
                    text: { body: text },
                };
            }
        }
        else {
            payload = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: { body: text },
            };
        }
        const response = await fetch(`${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = (await response.json());
        if (!response.ok) {
            return { success: false, error: data.error?.message ?? `WhatsApp HTTP ${response.status}` };
        }
        return { success: true, providerMessageId: data.messages?.[0]?.id };
    }
    // Development adapter
    logger.info({
        to,
        preview: text.slice(0, 120),
        attachmentCount: attachments.length,
        attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            bytes: a.buffer?.length ?? 0,
            url: a.url,
        })),
    }, '[DEV WHATSAPP ADAPTER] Message dispatched');
    return { success: true, providerMessageId: `dev-wa-${Date.now()}` };
}
async function sendViaEmailAdapter(to, subject, html, attachments = []) {
    const mailAttachments = [];
    for (const a of attachments) {
        if (a.buffer) {
            mailAttachments.push({
                filename: a.filename,
                content: a.buffer,
                contentType: a.mimeType,
                ...(a.cid ? { cid: a.cid } : {}),
            });
        }
        else if (a.url) {
            mailAttachments.push({
                filename: a.filename,
                path: a.url,
                contentType: a.mimeType,
                ...(a.cid ? { cid: a.cid } : {}),
            });
        }
    }
    if (env.EMAIL_PROVIDER_MODE === 'smtp' && env.SMTP_HOST && env.SMTP_USER) {
        const transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        });
        const info = await transporter.sendMail({
            from: env.EMAIL_FROM,
            to,
            subject,
            html,
            attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
        });
        return { success: true, providerMessageId: info.messageId };
    }
    logger.info({
        to,
        subject,
        attachmentCount: mailAttachments.length,
        attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            bytes: a.buffer?.length ?? 0,
            url: a.url,
        })),
    }, '[DEV EMAIL ADAPTER] Email dispatched');
    return { success: true, providerMessageId: `dev-email-${Date.now()}` };
}
async function deliverNotification(log, fullBody, attachments = []) {
    log.attempts += 1;
    try {
        const res = log.channel === 'WHATSAPP'
            ? await sendViaWhatsAppAdapter(log.recipient, fullBody, attachments)
            : await sendViaEmailAdapter(log.recipient, log.subject ?? 'EventFlow OS Notification', fullBody, attachments);
        if (res.success) {
            log.status = 'SENT';
            log.providerMessageId = res.providerMessageId;
            log.sentAt = new Date();
            log.lastError = undefined;
        }
        else {
            log.status = 'FAILED';
            log.lastError = res.error ?? 'Unknown delivery failure';
        }
    }
    catch (err) {
        log.status = 'FAILED';
        log.lastError = err instanceof Error ? err.message : 'Notification exception';
    }
    await log.save();
    return log;
}
export async function dispatchBookingTicketsNotifications(bookingId) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
        throw new NotFoundError('Booking not found');
    const tickets = await TicketModel.find({ bookingId: booking._id, status: 'ISSUED' });
    const event = await getOrCreateEventConfig();
    const attendeeDocs = await AttendeeModel.find({ _id: { $in: tickets.map((t) => t.attendeeId) } })
        .select('age')
        .lean();
    const ageByAttendeeId = new Map(attendeeDocs.map((a) => [String(a._id), a.age]));
    const ticketAttachments = [];
    for (const [i, t] of tickets.entries()) {
        try {
            const png = await renderTicketPng(t, event, ageByAttendeeId.get(String(t.attendeeId)));
            ticketAttachments.push({
                filename: `${t.ticketId}-pass.png`,
                mimeType: 'image/png',
                buffer: png,
                cid: `ticket-pass-${i}@eventflow`,
            });
        }
        catch (err) {
            logger.warn({ ticketId: t.ticketId, err }, 'Could not render ticket PNG attachment; falling back to link only');
        }
    }
    const logs = [];
    const passLinks = tickets.map((t) => `${t.attendeeName} (${t.ticketId}): ${env.FRONTEND_URL}/ticket/${t.secureReference}`);
    // WhatsApp per booking (with pass image attachment + individual pass links)
    if (booking.whatsappOptIn && event.notifications.whatsappEnabled) {
        const waText = [
            `Namaste ${booking.primaryContact.fullName},`,
            `Your booking ${booking.bookingReference} for ${event.name} (${event.subtitle}) is confirmed!`,
            `Venue: ${event.venue.name}, ${event.venue.city}`,
            `Individual Passes:`,
            ...passLinks,
        ].join('\n');
        const waAttachments = ticketAttachments.slice(0, 1);
        const waLog = await NotificationLogModel.create({
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            channel: 'WHATSAPP',
            templateType: 'TICKET_DELIVERY',
            recipient: booking.primaryContact.mobile,
            messagePreview: waText.slice(0, 280),
            status: 'QUEUED',
            providerMode: env.WHATSAPP_PROVIDER_MODE,
            ...buildAttachmentLogMeta(waAttachments),
        });
        logs.push(await deliverNotification(waLog, waText, waAttachments));
    }
    // Email confirmation with embedded + attached 8:14 PNG passes
    if (event.notifications.emailEnabled && booking.primaryContact.email) {
        const subject = `Your Tickets for ${event.name} — ${booking.bookingReference}`;
        const inlinePassHtml = ticketAttachments
            .map((att, idx) => `<div style="margin:12px 0;"><p style="margin:0 0 6px;font-size:12px;color:#57534e;">Pass ${idx + 1}: ${escapeHtmlText(att.filename)}</p><img src="cid:${att.cid}" alt="${escapeHtmlText(att.filename)}" style="max-width:320px;width:100%;border-radius:12px;border:1px solid #e7e5e4;" /></div>`)
            .join('');
        const html = `
      <h2>${escapeHtmlText(event.name)} — ${escapeHtmlText(event.subtitle)}</h2>
      <p>Namaste ${escapeHtmlText(booking.primaryContact.fullName)},</p>
      <p>Your booking <strong>${escapeHtmlText(booking.bookingReference)}</strong> (${tickets.length} ticket(s)) is confirmed. Your high-resolution ticket pass image(s) are attached to this email.</p>
      <ul>
        ${tickets
            .map((t) => `<li><strong>${escapeHtmlText(t.attendeeName)}</strong> — ${escapeHtmlText(t.ticketTypeName)} (${escapeHtmlText(t.ticketId)}) — <a href="${env.FRONTEND_URL}/ticket/${t.secureReference}">View & Download Pass</a></li>`)
            .join('')}
      </ul>
      ${inlinePassHtml}
      <p>Venue: ${escapeHtmlText(event.venue.name)}, ${escapeHtmlText(event.venue.address)}</p>
    `;
        const emailLog = await NotificationLogModel.create({
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            channel: 'EMAIL',
            templateType: 'TICKET_DELIVERY',
            recipient: booking.primaryContact.email,
            subject,
            messagePreview: `${tickets.length} individual ticket(s) sent for ${booking.bookingReference}`,
            status: 'QUEUED',
            providerMode: env.EMAIL_PROVIDER_MODE,
            ...buildAttachmentLogMeta(ticketAttachments),
        });
        logs.push(await deliverNotification(emailLog, html, ticketAttachments));
    }
    return logs;
}
export async function sendOtpNotification(params) {
    const text = `Your EventFlow OS verification OTP is ${params.otp}. Valid for ${env.OTP_EXPIRES_MINUTES} minutes. Do not share it with anyone.`;
    const waLog = await NotificationLogModel.create({
        channel: 'WHATSAPP',
        templateType: 'OTP',
        recipient: params.mobile,
        messagePreview: 'Verification OTP dispatched',
        status: 'QUEUED',
        providerMode: env.WHATSAPP_PROVIDER_MODE,
    });
    await deliverNotification(waLog, text);
    if (params.email) {
        const emailLog = await NotificationLogModel.create({
            channel: 'EMAIL',
            templateType: 'OTP',
            recipient: params.email,
            subject: 'EventFlow OS — Ticket Retrieval OTP',
            messagePreview: 'Verification OTP dispatched via email',
            status: 'QUEUED',
            providerMode: env.EMAIL_PROVIDER_MODE,
        });
        await deliverNotification(emailLog, `<p>${text}</p>`);
    }
}
export async function retryNotificationById(logId) {
    const log = await NotificationLogModel.findById(logId);
    if (!log)
        throw new NotFoundError('Notification log not found');
    if (log.bookingId && (log.templateType === 'TICKET_DELIVERY' || log.templateType === 'TICKET_RESEND')) {
        const results = await dispatchBookingTicketsNotifications(String(log.bookingId));
        return results[0] ?? log;
    }
    return deliverNotification(log, log.messagePreview);
}
function escapeHtmlText(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function personalizeMessage(template, recipient) {
    return template
        .replace(/\{\{\s*name\s*\}\}/gi, recipient.attendeeName)
        .replace(/\{\{\s*ticketId\s*\}\}/gi, recipient.ticketId)
        .replace(/\{\{\s*bookingRef\s*\}\}/gi, recipient.bookingReference)
        .replace(/\{\{\s*category\s*\}\}/gi, recipient.ticketTypeName);
}
async function resolveBroadcastRecipients(params) {
    const statusFilter = params.audience === 'CHECKED_IN'
        ? ['CHECKED_IN']
        : params.audience === 'NOT_CHECKED_IN'
            ? ['ISSUED', 'CHECKED_OUT']
            : ['ISSUED', 'CHECKED_IN', 'CHECKED_OUT'];
    const ticketFilter = { status: { $in: statusFilter } };
    if (params.audience === 'TICKET_TYPE' && params.ticketTypeId) {
        ticketFilter.ticketTypeId = params.ticketTypeId;
    }
    const tickets = await TicketModel.find(ticketFilter).lean();
    if (tickets.length === 0)
        return [];
    const [attendees, bookings] = await Promise.all([
        AttendeeModel.find({ _id: { $in: tickets.map((t) => t.attendeeId) }, status: 'ACTIVE' })
            .select('fullName mobile email')
            .lean(),
        BookingModel.find({ _id: { $in: tickets.map((t) => t.bookingId) }, status: 'PAID' })
            .select('primaryContact')
            .lean(),
    ]);
    const attMap = new Map(attendees.map((a) => [String(a._id), a]));
    const bookMap = new Map(bookings.map((b) => [String(b._id), b]));
    const resolved = [];
    for (const t of tickets) {
        const att = attMap.get(String(t.attendeeId));
        const bk = bookMap.get(String(t.bookingId));
        if (!bk)
            continue;
        const mobile = (att?.mobile || t.attendeeMobile || bk.primaryContact?.mobile || '').trim();
        const email = (att?.email || bk.primaryContact?.email || '').trim().toLowerCase() || undefined;
        if (!mobile && !email)
            continue;
        resolved.push({
            attendeeName: att?.fullName || t.attendeeName,
            mobile,
            email,
            ticketId: t.ticketId,
            bookingId: String(t.bookingId),
            bookingReference: t.bookingReference,
            ticketTypeName: t.ticketTypeName,
        });
    }
    return resolved;
}
export async function previewBroadcastRecipients(params) {
    const list = await resolveBroadcastRecipients(params);
    const uniquePhones = new Set(list.map((r) => r.mobile.replace(/[^0-9]/g, '')).filter(Boolean));
    const uniqueEmails = new Set(list.map((r) => r.email).filter(Boolean));
    return {
        attendeeCount: list.length,
        uniqueWhatsAppCount: uniquePhones.size,
        uniqueEmailCount: uniqueEmails.size,
        whatsappMode: env.WHATSAPP_PROVIDER_MODE,
        emailMode: env.EMAIL_PROVIDER_MODE,
    };
}
export async function broadcastAdminAnnouncement(params) {
    if (!params.channels.length) {
        throw new BadRequestError('Select at least one delivery channel (WhatsApp or Email)');
    }
    const parsedAttachment = parseAdminImageAttachment(params.attachment);
    const emailAttachment = parsedAttachment
        ? {
            ...parsedAttachment,
            cid: parsedAttachment.buffer ? 'broadcast-image@eventflow' : undefined,
        }
        : undefined;
    const waAttachments = parsedAttachment ? [parsedAttachment] : [];
    const emailAttachments = emailAttachment ? [emailAttachment] : [];
    const logAttachmentMeta = buildAttachmentLogMeta(parsedAttachment ? [parsedAttachment] : []);
    const recipients = await resolveBroadcastRecipients({
        audience: params.audience,
        ticketTypeId: params.ticketTypeId,
    });
    if (recipients.length === 0) {
        throw new BadRequestError('No matching confirmed attendees found for this audience');
    }
    const event = await getOrCreateEventConfig();
    const wantWa = params.channels.includes('WHATSAPP');
    const wantEmail = params.channels.includes('EMAIL');
    const seenPhones = new Set();
    const seenEmails = new Set();
    const stats = {
        recipientCount: recipients.length,
        whatsapp: { attempted: 0, sent: 0, failed: 0 },
        email: { attempted: 0, sent: 0, failed: 0 },
        attachment: parsedAttachment
            ? {
                filename: parsedAttachment.filename,
                mimeType: parsedAttachment.mimeType,
                sizeBytes: parsedAttachment.buffer?.length,
                url: parsedAttachment.url,
            }
            : null,
    };
    for (const r of recipients) {
        const personalized = personalizeMessage(params.message, r);
        if (wantWa && r.mobile) {
            const phoneKey = r.mobile.replace(/[^0-9]/g, '') || r.mobile;
            if (!seenPhones.has(phoneKey)) {
                seenPhones.add(phoneKey);
                stats.whatsapp.attempted += 1;
                const waText = params.subject
                    ? `*${params.subject}*\n\n${personalized}\n\n— ${event.name}`
                    : `${personalized}\n\n— ${event.name}`;
                const log = await NotificationLogModel.create({
                    bookingId: r.bookingId,
                    bookingReference: r.bookingReference,
                    ticketId: r.ticketId,
                    channel: 'WHATSAPP',
                    templateType: 'ANNOUNCEMENT',
                    recipient: r.mobile,
                    subject: params.subject,
                    messagePreview: waText.slice(0, 1000),
                    status: 'QUEUED',
                    providerMode: env.WHATSAPP_PROVIDER_MODE,
                    ...logAttachmentMeta,
                });
                const out = await deliverNotification(log, waText, waAttachments);
                if (out.status === 'SENT')
                    stats.whatsapp.sent += 1;
                else
                    stats.whatsapp.failed += 1;
            }
        }
        if (wantEmail && r.email) {
            if (!seenEmails.has(r.email)) {
                seenEmails.add(r.email);
                stats.email.attempted += 1;
                const safeBodyHtml = escapeHtmlText(personalized).replace(/\n/g, '<br/>');
                const imageBlockHtml = emailAttachment
                    ? `<div style="margin:16px 0;"><img src="${emailAttachment.cid ? `cid:${emailAttachment.cid}` : escapeHtmlText(emailAttachment.url || '')}" alt="${escapeHtmlText(emailAttachment.filename)}" style="max-width:100%;height:auto;border-radius:10px;border:1px solid #e7e5e4;display:block;" /></div>`
                    : '';
                const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e7e5e4;border-radius:12px;">
            <h2 style="margin:0 0 8px;color:#06102b;">${escapeHtmlText(event.name)} — ${escapeHtmlText(event.subtitle)}</h2>
            <p style="margin:0 0 16px;color:#b45309;font-weight:bold;">${escapeHtmlText(params.subject)}</p>
            ${imageBlockHtml}
            <div style="line-height:1.6;color:#1c1917;">${safeBodyHtml}</div>
            <hr style="margin:20px 0;border:none;border-top:1px solid #e7e5e4;" />
            <p style="margin:0;font-size:12px;color:#78716c;">Venue: ${escapeHtmlText(event.venue.name)}, ${escapeHtmlText(event.venue.city)} • Support: ${escapeHtmlText(event.contact.phone)}</p>
          </div>
        `;
                const log = await NotificationLogModel.create({
                    bookingId: r.bookingId,
                    bookingReference: r.bookingReference,
                    ticketId: r.ticketId,
                    channel: 'EMAIL',
                    templateType: 'ANNOUNCEMENT',
                    recipient: r.email,
                    subject: params.subject,
                    messagePreview: personalized.slice(0, 1000),
                    status: 'QUEUED',
                    providerMode: env.EMAIL_PROVIDER_MODE,
                    ...logAttachmentMeta,
                });
                const out = await deliverNotification(log, html, emailAttachments);
                if (out.status === 'SENT')
                    stats.email.sent += 1;
                else
                    stats.email.failed += 1;
            }
        }
    }
    return stats;
}
//# sourceMappingURL=notification.service.js.map