import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

// Explicit host/port (STARTTLS on 587) rather than the "service: gmail"
// shorthand (which defaults to implicit TLS on 465) — 465 is more likely to
// be firewalled/timed-out on cloud hosts than 587.
const transporter =
  gmailUser && gmailAppPassword
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: gmailUser, pass: gmailAppPassword },
        connectionTimeout: 10_000,
        // Render's network has no working IPv6 route, but smtp.gmail.com
        // resolves to both A and AAAA records — without this, Node's
        // default DNS ordering can pick the IPv6 address and fail with
        // ENETUNREACH. Forcing IPv4 avoids that entirely. (Not in
        // nodemailer's TS types, but it's passed straight through to
        // net.connect, which does support it.)
        family: 4,
      } as any)
    : null;

// Fire-and-forget: a failed welcome email should never block account
// creation. Silently skips (logging why) when Gmail isn't configured, e.g.
// in local dev.
export async function sendWelcomeEmail(to: string, name: string) {
  if (!transporter) {
    console.log(`(email skipped, GMAIL_USER/GMAIL_APP_PASSWORD not set) Would welcome ${to}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `EduCentral <${gmailUser}>`,
      to,
      subject: "Welcome to EduCentral",
      text: `Hi ${name},\n\nWelcome to EduCentral! Your account has been created.\n\n— The EduCentral Team`,
      html: `<p>Hi ${name},</p><p>Welcome to <strong>EduCentral</strong>! Your account has been created.</p><p>— The EduCentral Team</p>`,
    });
  } catch (err) {
    console.error(`Failed to send welcome email to ${to}:`, err);
  }
}
