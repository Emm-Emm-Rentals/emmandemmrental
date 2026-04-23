import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM_ADDRESS || 'EMM Reservations <reservations@emmstay.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@emmstay.com';
const BRAND_COLOR = '#EE4B90';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'EMM';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency.toUpperCase(),
  }).format(amount);
}

function baseLayout(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SITE_NAME}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:${BRAND_COLOR};padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${SITE_NAME}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            © ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.<br>
            You received this email because of a booking action on our platform.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function reservationTable(r: {
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  nights?: number;
  adults: number;
  children?: number;
  totalPrice: number;
  currency?: string;
  id?: string;
}) {
  const nights = r.nights ?? Math.round(
    (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000
  );
  const rows = [
    ['Property', r.listingTitle],
    ['Check-in', formatDate(r.startDate)],
    ['Check-out', formatDate(r.endDate)],
    ['Duration', `${nights} night${nights !== 1 ? 's' : ''}`],
    ['Guests', `${r.adults} Adult${r.adults !== 1 ? 's' : ''}${r.children ? `, ${r.children} Child${r.children !== 1 ? 'ren' : ''}` : ''}`],
    ['Total', `<strong>${formatMoney(r.totalPrice, r.currency)}</strong>`],
    ...(r.id ? [['Reservation ID', `<span style="font-family:monospace;font-size:12px;">${r.id.slice(0, 12).toUpperCase()}</span>`]] : []),
  ] as [string, string][];

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:20px 0;">
    ${rows.map(([label, value], i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
      <td style="padding:11px 16px;font-size:13px;color:#6b7280;width:130px;">${label}</td>
      <td style="padding:11px 16px;font-size:13px;color:#111827;">${value}</td>
    </tr>`).join('')}
  </table>`;
}

// ─── 1. Booking Confirmation → Guest ─────────────────────────────────────────

export async function sendBookingConfirmationToUser(reservation: {
  id: string;
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  nights?: number;
  adults: number;
  children?: number;
  totalPrice: number;
  currency?: string;
  guestName?: string | null;
  guestEmail: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const html = baseLayout(`
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Booking Confirmed! 🎉</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">
      Hi ${reservation.guestName || 'there'},<br>your reservation is confirmed. Here are the details:
    </p>
    ${reservationTable(reservation)}
    <p style="margin:20px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
      We're looking forward to hosting you. If you have any questions, just reply to this email.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: reservation.guestEmail,
    subject: `Booking Confirmed — ${reservation.listingTitle}`,
    html,
  });
}

// ─── 2. New Booking Notification → Admin ─────────────────────────────────────

export async function sendBookingNotificationToAdmin(reservation: {
  id: string;
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  nights?: number;
  adults: number;
  children?: number;
  totalPrice: number;
  currency?: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  paymentStatus?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const html = baseLayout(`
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">New Booking Received</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">A new reservation has been made and payment confirmed.</p>
    ${reservationTable(reservation)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:8px 0 20px;">
      <tr style="background:#f9fafb;"><td style="padding:11px 16px;font-size:13px;color:#6b7280;width:130px;">Guest name</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${reservation.guestName || '—'}</td></tr>
      <tr><td style="padding:11px 16px;font-size:13px;color:#6b7280;">Guest email</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${reservation.guestEmail || '—'}</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:11px 16px;font-size:13px;color:#6b7280;">Guest phone</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${reservation.guestPhone || '—'}</td></tr>
      <tr><td style="padding:11px 16px;font-size:13px;color:#6b7280;">Payment</td>
        <td style="padding:11px 16px;font-size:13px;color:#16a34a;font-weight:600;">${reservation.paymentStatus?.toUpperCase() || 'PAID'}</td></tr>
    </table>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/reservations"
       style="display:inline-block;padding:12px 24px;background:${BRAND_COLOR};color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
      View in Admin →
    </a>
  `);

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New Booking — ${reservation.listingTitle}`,
    html,
  });
}

// ─── 3. Cancellation Request Notification → Admin ────────────────────────────

export async function sendCancellationRequestToAdmin(req: {
  id: string;
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const html = baseLayout(`
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Cancellation Request</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">A guest has requested a cancellation and is awaiting your review.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 20px;">
      ${[
        ['Property', req.listingTitle],
        ['Check-in', formatDate(req.startDate)],
        ['Check-out', formatDate(req.endDate)],
        ['Guest', req.guestName || '—'],
        ['Email', req.guestEmail || '—'],
        ['Reason', req.reason || 'No reason provided'],
      ].map(([label, value], i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
        <td style="padding:11px 16px;font-size:13px;color:#6b7280;width:130px;">${label}</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${value}</td>
      </tr>`).join('')}
    </table>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/cancellation-requests"
       style="display:inline-block;padding:12px 24px;background:${BRAND_COLOR};color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
      Review Request →
    </a>
  `);

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Cancellation Request — ${req.listingTitle}`,
    html,
  });
}

// ─── 4. Refund Initiated → Guest ─────────────────────────────────────────────

export async function sendRefundInitiatedToUser(req: {
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  refundAmount: number;
  currency?: string;
  adminNote?: string | null;
  guestName?: string | null;
  guestEmail: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const html = baseLayout(`
    <div style="display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;
         background:#dcfce7;color:#16a34a;margin-bottom:16px;">
      ✓ REFUND INITIATED
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Your refund is on the way</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">
      Hi ${req.guestName || 'there'}, we have initiated a refund for your reservation. Please allow 5–10 business days for it to appear on your original payment method.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 20px;">
      ${[
        ['Property', req.listingTitle],
        ['Check-in', formatDate(req.startDate)],
        ['Check-out', formatDate(req.endDate)],
        ['Refund amount', `<strong style="color:#16a34a;">${formatMoney(req.refundAmount / 100, req.currency)}</strong>`],
      ].map(([label, value], i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
        <td style="padding:11px 16px;font-size:13px;color:#6b7280;width:130px;">${label}</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${value}</td>
      </tr>`).join('')}
    </table>
    ${req.adminNote ? `
    <div style="background:#f9fafb;border-left:3px solid ${BRAND_COLOR};padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">Note</p>
      <p style="margin:0;font-size:14px;color:#374151;">${req.adminNote}</p>
    </div>` : ''}
    <p style="margin:0;font-size:14px;color:#6b7280;">
      If you have any questions, please contact us and we'll be happy to help.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: req.guestEmail,
    subject: `Refund Initiated — ${req.listingTitle}`,
    html,
  });
}

// ─── 5. Refund Request → Admin ────────────────────────────────────────────────

export async function sendRefundRequestToAdmin(req: {
  reservationId: string;
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const html = baseLayout(`
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Refund Request Received</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">A guest has submitted a refund request for the following reservation.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 20px;">
      ${[
        ['Property', req.listingTitle],
        ['Check-in', formatDate(req.startDate)],
        ['Check-out', formatDate(req.endDate)],
        ['Guest', req.guestName || '—'],
        ['Email', req.guestEmail || '—'],
        ['Reason', req.reason || 'No reason provided'],
        ['Reservation ID', `<span style="font-family:monospace;font-size:12px;">${req.reservationId.slice(0, 12).toUpperCase()}</span>`],
      ].map(([label, value], i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
        <td style="padding:11px 16px;font-size:13px;color:#6b7280;width:130px;">${label}</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${value}</td>
      </tr>`).join('')}
    </table>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/reservations"
       style="display:inline-block;padding:12px 24px;background:${BRAND_COLOR};color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
      View Reservation →
    </a>
  `);

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Refund Request — ${req.listingTitle}`,
    html,
  });
}

// ─── 6. Refund Request Decision → Guest ──────────────────────────────────────

export async function sendRefundRequestDecisionToUser(req: {
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  action: 'approved' | 'rejected';
  adminNote?: string | null;
  guestName?: string | null;
  guestEmail: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const isApproved = req.action === 'approved';

  const html = baseLayout(`
    <div style="display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;
         background:${isApproved ? '#dcfce7' : '#fee2e2'};color:${isApproved ? '#16a34a' : '#dc2626'};margin-bottom:16px;">
      ${isApproved ? '✓ APPROVED' : '✗ DECLINED'}
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">
      ${isApproved ? 'Refund request approved' : 'Refund request declined'}
    </h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">
      Hi ${req.guestName || 'there'},
      ${isApproved
        ? 'your refund request has been approved. Our team is now processing your refund and you will receive a separate confirmation email once it has been initiated.'
        : 'after review, we were unable to approve your refund request for the following reservation.'}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 20px;">
      ${[
        ['Property', req.listingTitle],
        ['Check-in', formatDate(req.startDate)],
        ['Check-out', formatDate(req.endDate)],
      ].map(([label, value], i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
        <td style="padding:11px 16px;font-size:13px;color:#6b7280;width:130px;">${label}</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${value}</td>
      </tr>`).join('')}
    </table>
    ${req.adminNote ? `
    <div style="background:#f9fafb;border-left:3px solid ${BRAND_COLOR};padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">Note from admin</p>
      <p style="margin:0;font-size:14px;color:#374151;">${req.adminNote}</p>
    </div>` : ''}
    <p style="margin:0;font-size:14px;color:#6b7280;">
      ${isApproved
        ? 'You will receive another email once the refund has been processed.'
        : 'If you believe this is an error, please contact us directly.'}
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: req.guestEmail,
    subject: `Refund Request ${isApproved ? 'Approved' : 'Declined'} — ${req.listingTitle}`,
    html,
  });
}

// ─── 7. Cancellation Decision → Guest ────────────────────────────────────────

export async function sendCancellationDecisionToUser(req: {
  listingTitle: string;
  startDate: Date | string;
  endDate: Date | string;
  action: 'approved' | 'rejected';
  adminNote?: string | null;
  guestName?: string | null;
  guestEmail: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const isApproved = req.action === 'approved';
  const subjectLine = isApproved
    ? `Cancellation Approved — ${req.listingTitle}`
    : `Cancellation Rejected — ${req.listingTitle}`;

  const headline = isApproved ? 'Your cancellation has been approved' : 'Cancellation request declined';
  const intro = isApproved
    ? 'Your cancellation request has been approved. Your reservation has been cancelled.'
    : 'After review, we were unable to approve your cancellation request for the following reservation.';

  const html = baseLayout(`
    <div style="display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;
         background:${isApproved ? '#dcfce7' : '#fee2e2'};color:${isApproved ? '#16a34a' : '#dc2626'};margin-bottom:16px;">
      ${isApproved ? '✓ APPROVED' : '✗ DECLINED'}
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">${headline}</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi ${req.guestName || 'there'}, ${intro}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 20px;">
      ${[
        ['Property', req.listingTitle],
        ['Check-in', formatDate(req.startDate)],
        ['Check-out', formatDate(req.endDate)],
      ].map(([label, value], i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
        <td style="padding:11px 16px;font-size:13px;color:#6b7280;width:130px;">${label}</td>
        <td style="padding:11px 16px;font-size:13px;color:#111827;">${value}</td>
      </tr>`).join('')}
    </table>
    ${req.adminNote ? `
    <div style="background:#f9fafb;border-left:3px solid ${BRAND_COLOR};padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">Note from admin</p>
      <p style="margin:0;font-size:14px;color:#374151;">${req.adminNote}</p>
    </div>` : ''}
    <p style="margin:0;font-size:14px;color:#6b7280;">
      ${isApproved
        ? 'If a refund is due, it will be processed to your original payment method within 5–10 business days.'
        : 'If you believe this is an error, please contact us directly.'}
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: req.guestEmail,
    subject: subjectLine,
    html,
  });
}
