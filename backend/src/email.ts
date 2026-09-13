import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

const transporter =
  gmailUser && gmailAppPassword
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailAppPassword },
      })
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
