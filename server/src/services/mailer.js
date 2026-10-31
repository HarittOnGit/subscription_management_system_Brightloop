import nodemailer from 'nodemailer';

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendResetEmail(to, link) {
  // always print it, so the demo works with no internet and no SMTP
  console.log(`\n[password reset] ${to}\n${link}\n`);
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Reset your Brightloop password',
      text: `Use this link to reset your password (valid for 1 hour):\n${link}`,
      html: `<p>Use this link to reset your password (valid for 1 hour):</p><p><a href="${link}">${link}</a></p>`,
    });
  } catch (e) {
    console.error('[mail failed]', e.message); // never break the request because email failed
  }
}
