import "server-only";

/**
 * Transactional email. Configure SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465) and MAIL_FROM.
 * Without SMTP in development, messages are logged to the server console so flows can be tested.
 * Without SMTP in production, sending fails loudly in logs and returns false.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
      return true;
    }
    console.error("SMTP_URL is not configured; cannot send email:", subject);
    return false;
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(url);
  await transport.sendMail({ from: process.env.MAIL_FROM ?? "Jersey Studio <no-reply@localhost>", to, subject, text });
  return true;
}
