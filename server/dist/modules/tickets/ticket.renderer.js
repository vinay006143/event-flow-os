import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let cachedGodBackdropBase64;
async function getGodBackdropBase64() {
    if (cachedGodBackdropBase64 !== undefined)
        return cachedGodBackdropBase64;
    const candidates = [
        path.resolve(process.cwd(), 'client/public/assets/event/moments/shiva-invocation.png'),
        path.resolve(process.cwd(), '../client/public/assets/event/moments/shiva-invocation.png'),
        path.resolve(__dirname, '../../../../client/public/assets/event/moments/shiva-invocation.png'),
    ];
    for (const filePath of candidates) {
        try {
            const raw = await fs.readFile(filePath);
            const resized = await sharp(raw)
                .resize(892, 540, { fit: 'cover', position: 'top' })
                .jpeg({ quality: 88 })
                .toBuffer();
            cachedGodBackdropBase64 = resized.toString('base64');
            return cachedGodBackdropBase64;
        }
        catch {
            // Try next candidate
        }
    }
    cachedGodBackdropBase64 = null;
    return null;
}
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
export async function generateQrDataUrl(qrToken) {
    return QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#111827', light: '#FFFFFF' },
    });
}
export async function generateQrPngBuffer(qrToken) {
    return QRCode.toBuffer(qrToken, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 420,
        color: { dark: '#040817', light: '#FFFFFF' },
    });
}
/**
 * Renders the 8:14 (960x1680) collector pass PNG with a divine Shiva header banner,
 * clean cream ticket card body (zero text overlap/overflow), and crisp gate QR stub.
 */
export async function renderTicketPng(ticket, event, attendeeAge) {
    const [qrPng, godBgBase64] = await Promise.all([
        generateQrPngBuffer(ticket.qrToken),
        getGodBackdropBase64(),
    ]);
    const qrBase64 = qrPng.toString('base64');
    const isVip = /vip|premium/i.test(ticket.ticketTypeName);
    const formattedDate = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: event.timezone || 'Asia/Kolkata',
    }).format(event.eventDate);
    const attendeeDisplay = ticket.attendeeName.length > 22 ? `${ticket.attendeeName.slice(0, 20)}...` : ticket.attendeeName;
    const attendeeFontSize = attendeeDisplay.length > 15 ? 34 : 42;
    const ticketTypeDisplay = ticket.ticketTypeName.length > 36 ? `${ticket.ticketTypeName.slice(0, 34)}...` : ticket.ticketTypeName;
    const rawMob = ticket.attendeeMobile || '';
    const maskedMobile = rawMob.length > 4 ? `${'*'.repeat(Math.max(4, rawMob.length - 4))}${rawMob.slice(-4)}` : rawMob || 'Verified';
    const ageText = attendeeAge ? `${attendeeAge} yrs` : 'Admit 1';
    const doorsRaw = event.doorsOpenTime || '4:30 PM IST';
    const dateLine = `${formattedDate} • Gates ${doorsRaw}`;
    const dateLineSafe = dateLine.length > 46 ? formattedDate : dateLine;
    const gatesSubLine = dateLine.length > 46 ? `Gates ${doorsRaw}` : '';
    const venueDisplay = `${event.venue.name}, ${event.venue.city}`;
    const venueLine = venueDisplay.length > 44 ? `${venueDisplay.slice(0, 42)}...` : venueDisplay;
    const svg = `
  <svg width="960" height="1680" viewBox="0 0 960 1680" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#040A1E"/>
        <stop offset="100%" stop-color="#06102B"/>
      </linearGradient>
      <linearGradient id="headerFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#030712" stop-opacity="0.45"/>
        <stop offset="55%" stop-color="#040B22" stop-opacity="0.32"/>
        <stop offset="85%" stop-color="#06102B" stop-opacity="0.88"/>
        <stop offset="100%" stop-color="#06102B" stop-opacity="1"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FEF08A"/>
        <stop offset="45%" stop-color="#FBBF24"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
      <clipPath id="cardClip">
        <rect x="34" y="34" width="892" height="1612" rx="42"/>
      </clipPath>
      <clipPath id="headerClip">
        <rect x="34" y="34" width="892" height="540"/>
      </clipPath>
    </defs>

    <!-- Canvas Backdrop -->
    <rect width="960" height="1680" fill="#020617"/>

    <g clip-path="url(#cardClip)">
      <rect x="34" y="34" width="892" height="1612" fill="url(#bg)"/>

      <!-- 1. Top Divine Shiva Header Banner -->
      <g clip-path="url(#headerClip)">
        ${godBgBase64
        ? `<image x="34" y="34" width="892" height="540" preserveAspectRatio="xMidYMin slice" href="data:image/jpeg;base64,${godBgBase64}"/>`
        : ''}
        <rect x="34" y="34" width="892" height="540" fill="url(#headerFade)"/>
      </g>

      <!-- Top Gold Accent & Lanyard Slot -->
      <rect x="34" y="34" width="892" height="8" fill="url(#gold)"/>
      <rect x="405" y="58" width="150" height="24" rx="12" fill="#020617" stroke="#FBBF24" stroke-width="2" stroke-opacity="0.8"/>

      <!-- Left Trishul Emblem -->
      <rect x="76" y="102" width="70" height="70" rx="16" fill="#04091b" fill-opacity="0.88" stroke="#FBBF24" stroke-width="2" stroke-opacity="0.75"/>
      <path d="M111 113 L115 125 L113 129 V158 L111 162 L109 158 V129 L107 125 Z" fill="url(#gold)"/>
      <path d="M95 120 C92.5 127.5 94 135 99 139.5 C102.5 142 106 143 109 143 V139 C106 139 103.5 138 101.5 136 C98 132.5 98 128 100 123 Z" fill="url(#gold)"/>
      <path d="M127 120 C129.5 127.5 128 135 123 139.5 C119.5 142 116 143 113 143 V139 C116 139 118.5 138 120.5 136 C124 132.5 124 128 122 123 Z" fill="url(#gold)"/>
      <rect x="106.5" y="145" width="9" height="2.4" rx="1.2" fill="#FEF08A"/>

      <!-- Right VIP / Standard Pill -->
      <rect x="692" y="112" width="192" height="44" rx="22" fill="${isVip ? 'url(#gold)' : '#04091b'}" fill-opacity="${isVip ? '1' : '0.88'}" stroke="#FBBF24" stroke-width="1.8"/>
      <text x="788" y="140" text-anchor="middle" fill="${isVip ? '#040817' : '#FEF08A'}" font-family="Arial, sans-serif" font-size="17" font-weight="bold" letter-spacing="1.5">${isVip ? 'VIP ID PASS' : 'STANDARD'}</text>

      <!-- Centered Event Header Text over Smooth Dark Fade -->
      <text x="480" y="428" text-anchor="middle" fill="#FDE047" font-family="Arial, sans-serif" font-size="17" font-weight="bold" letter-spacing="5">${escapeXml((event.ticketTemplate.headerText || 'OFFICIAL ENTRY PASS').toUpperCase())}</text>
      <text x="480" y="486" text-anchor="middle" fill="#FFFFFF" font-family="Georgia, serif" font-size="52" font-weight="bold">${escapeXml(event.name)}</text>
      <text x="480" y="524" text-anchor="middle" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="22" font-weight="bold" letter-spacing="1.5">${escapeXml(event.subtitle || 'Nirantaram Sanatanam')}</text>

      <!-- 2. Clean Warm Cream Ticket Card Inside Navy Frame -->
      <rect x="74" y="566" width="812" height="946" rx="34" fill="#FAF6ED"/>

      <!-- Pass Holder Identity + Issued Status -->
      <text x="114" y="624" fill="#92400E" font-family="Arial, sans-serif" font-size="16" font-weight="bold" letter-spacing="3">PASS HOLDER IDENTITY</text>
      <text x="114" y="678" fill="#0F172A" font-family="Georgia, serif" font-size="${attendeeFontSize}" font-weight="bold">${escapeXml(attendeeDisplay)}</text>
      <text x="114" y="718" fill="#B45309" font-family="Arial, sans-serif" font-size="22" font-weight="bold">${escapeXml(ticketTypeDisplay)}</text>

      <rect x="676" y="610" width="166" height="44" rx="22" fill="#ECFDF5" stroke="#16A34A" stroke-width="1.8"/>
      <text x="759" y="638" text-anchor="middle" fill="#15803D" font-family="Arial, sans-serif" font-size="17" font-weight="bold">${escapeXml(ticket.status)}</text>

      <!-- Contained White Info Ledger Box (strictly zero text overflow) -->
      <rect x="114" y="748" width="732" height="222" rx="22" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"/>

      <text x="142" y="782" fill="#78716C" font-family="Arial, sans-serif" font-size="14" font-weight="bold" letter-spacing="2">DATE &amp; GATES</text>
      <text x="142" y="814" fill="#0F172A" font-family="Arial, sans-serif" font-size="21" font-weight="bold">${escapeXml(dateLineSafe)}</text>
      ${gatesSubLine ? `<text x="142" y="840" fill="#57534E" font-family="Arial, sans-serif" font-size="18" font-weight="bold">${escapeXml(gatesSubLine)}</text>` : ''}

      <line x1="142" y1="854" x2="818" y2="854" stroke="#F5F5F4" stroke-width="1.5"/>
      <text x="142" y="882" fill="#78716C" font-family="Arial, sans-serif" font-size="14" font-weight="bold" letter-spacing="2">VENUE</text>
      <text x="142" y="914" fill="#0F172A" font-family="Arial, sans-serif" font-size="21" font-weight="bold">${escapeXml(venueLine)}</text>

      <line x1="142" y1="928" x2="818" y2="928" stroke="#F5F5F4" stroke-width="1.5"/>
      <text x="142" y="954" fill="#78716C" font-family="Arial, sans-serif" font-size="14" font-weight="bold" letter-spacing="1.5">ADMIT: <tspan fill="#0F172A">${escapeXml(ageText)}</tspan></text>
      <text x="480" y="954" fill="#78716C" font-family="Arial, sans-serif" font-size="14" font-weight="bold" letter-spacing="1.5">MOBILE: <tspan fill="#0F172A" font-family="Courier New, monospace">${escapeXml(maskedMobile)}</tspan></text>

      <!-- 3. Perforated Tear Line & Navy Cutouts -->
      <line x1="114" y1="1008" x2="846" y2="1008" stroke="#D6D3D1" stroke-width="2.5" stroke-dasharray="10 10"/>
      <circle cx="74" cy="1008" r="22" fill="#06102B"/>
      <circle cx="886" cy="1008" r="22" fill="#06102B"/>

      <!-- 4. Crisp Framed QR Code Stub -->
      <rect x="255" y="1038" width="450" height="360" rx="28" fill="#FFFFFF" stroke="#FDE68A" stroke-width="2"/>
      <image x="310" y="1048" width="340" height="340" href="data:image/png;base64,${qrBase64}"/>

      <!-- Ticket ID & Booking Reference -->
      <text x="480" y="1444" text-anchor="middle" fill="#0F172A" font-family="Courier New, monospace" font-size="31" font-weight="bold" letter-spacing="3">${escapeXml(ticket.ticketId)}</text>
      <text x="480" y="1484" text-anchor="middle" fill="#57534E" font-family="Arial, sans-serif" font-size="18" font-weight="bold" letter-spacing="1">BOOKING REF: ${escapeXml(ticket.bookingReference)} • ADMIT ONE</text>

      <!-- 5. Luxury Navy Footer -->
      <text x="480" y="1572" text-anchor="middle" fill="#FDE047" font-family="Arial, sans-serif" font-size="19" font-weight="bold" letter-spacing="3">${escapeXml((event.subtitle || 'NIRANTARAM SANATANAM').toUpperCase())} • RAJAMAHENDRAVARAM</text>
      <text x="480" y="1608" text-anchor="middle" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="16">Enquiries: ${escapeXml(event.contact.phone)} • Present this 8:14 QR Pass at Entry Gate</text>
    </g>

    <!-- Subtle Gold Frame & Outer Gold Stroke -->
    <rect x="52" y="52" width="856" height="1576" rx="34" fill="none" stroke="url(#gold)" stroke-width="1.2" stroke-opacity="0.3"/>
    <rect x="34" y="34" width="892" height="1612" rx="42" fill="none" stroke="url(#gold)" stroke-width="3.5"/>
  </svg>`;
    return sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();
}
export async function renderTicketPdf(ticket, event) {
    const qrPng = await generateQrPngBuffer(ticket.qrToken);
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 48 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // Header banner
        doc.rect(48, 48, 499, 96).fill('#060f2b');
        doc
            .fillColor('#FCD34D')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text((event.ticketTemplate.headerText || 'OFFICIAL ENTRY PASS').toUpperCase(), 68, 66);
        doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text(event.name, 68, 84);
        doc.fillColor('#FDE68A').fontSize(12).font('Helvetica').text(event.subtitle || '', 68, 114);
        // Details card
        doc.roundedRect(48, 160, 499, 250, 8).stroke('#CBD5E1');
        doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('ATTENDEE', 68, 180);
        doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(ticket.attendeeName, 68, 194);
        doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('TICKET CATEGORY', 68, 228);
        doc.fillColor('#B45309').fontSize(13).font('Helvetica-Bold').text(ticket.ticketTypeName, 68, 242);
        doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('TICKET ID', 68, 272);
        doc.fillColor('#0F172A').fontSize(12).font('Courier-Bold').text(ticket.ticketId, 68, 286);
        doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('BOOKING REFERENCE', 68, 314);
        doc.fillColor('#0F172A').fontSize(11).font('Courier').text(ticket.bookingReference, 68, 328);
        doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('STATUS', 68, 356);
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(ticket.status, 68, 370);
        // QR Code on right
        doc.image(qrPng, 360, 185, { width: 165, height: 165 });
        doc
            .fillColor('#334155')
            .fontSize(9)
            .font('Courier-Bold')
            .text(ticket.ticketId, 360, 358, { width: 165, align: 'center' });
        // Event Venue & Date
        const formattedDate = new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: event.timezone || 'Asia/Kolkata',
        }).format(event.eventDate);
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('Event Date & Venue', 48, 434);
        doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`Date: ${formattedDate}`, 48, 454);
        doc.text(`Doors Open: ${event.doorsOpenTime}`, 48, 470);
        doc.text(`Venue: ${event.venue.name}, ${event.venue.address}`, 48, 486, { width: 499 });
        // Entry instructions
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('Entry Instructions', 48, 534);
        let y = 554;
        for (const line of event.ticketTemplate.entryInstructions) {
            doc.fillColor('#475569').fontSize(9.5).font('Helvetica').text(`• ${line}`, 54, y, { width: 490 });
            y += 18;
        }
        doc
            .fillColor('#64748B')
            .fontSize(8.5)
            .text(`Support: ${event.contact.email} | ${event.contact.phone} | ${event.ticketTemplate.footerText}`, 48, 740, { width: 499, align: 'center' });
        doc.end();
    });
}
//# sourceMappingURL=ticket.renderer.js.map