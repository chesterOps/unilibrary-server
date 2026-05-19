import nodemailer from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getFrontendBaseUrl(): string {
  const configured =
    process.env.RESET_PASSWORD_URL ||
    process.env.CLIENT_URL ||
    process.env.FRONT_URL ||
    "http://localhost:5173";

  return configured.split(/\s+/)[0].replace(/\/$/, "");
}

export function buildPasswordResetUrl(token: string): string {
  return `${getFrontendBaseUrl()}/reset-password/${token}`;
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(options: MailOptions): Promise<boolean> {
  const transport = createTransport();

  if (!transport) {
    console.warn("[Email] SMTP is not configured; email was not sent.");
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured.");
    }
    return false;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    ...options,
  });

  return true;
}
