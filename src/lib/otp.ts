import { Resend } from 'resend';
import twilio from 'twilio';

// Initialize Twilio Client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM_ADDRESS || 'EMM Reservations <reservations@emmstay.com>';
const BRAND_COLOR = '#EE4B90';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'EMM';

export async function sendOtp(identifier: string, type: 'PHONE' | 'EMAIL', otp: string) {
    try {
        if (type === 'PHONE') {
            await sendSmsOtp(identifier, otp);
        } else {
            await sendEmailOtp(identifier, otp);
        }
        return { success: true };
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP');
    }
}

async function sendSmsOtp(phoneNumber: string, otp: string) {
    const isDev = process.env.NODE_ENV === 'development';
    const hasTwilio = process.env.TWILIO_PHONE_NUMBER &&
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        !process.env.TWILIO_PHONE_NUMBER.includes('9249089266'); // Ignore the placeholder number

    if (isDev && !hasTwilio) {
        console.log('------------------------------------------');
        console.log(`DEV MODE OTP for ${phoneNumber}: ${otp}`);
        console.log('------------------------------------------');
        return;
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('TWILIO_PHONE_NUMBER is not defined');
    }

    await twilioClient.messages.create({
        body: `Your verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
    });
}

async function sendEmailOtp(email: string, otp: string) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SITE_NAME}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${SITE_NAME}</p>
        </td></tr>
        <tr><td style="padding:36px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Your verification code</p>
          <div style="display:inline-block;margin:16px 0;padding:18px 40px;background:#f9fafb;border:2px dashed #e5e7eb;border-radius:12px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#111827;font-family:monospace;">${otp}</span>
          </div>
          <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">Expires in 5 minutes. Do not share this code with anyone.</p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
        from: FROM,
        to: email,
        subject: `${otp} is your ${SITE_NAME} verification code`,
        html,
    });
}
