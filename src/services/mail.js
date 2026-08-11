const nodemailer = require("nodemailer");

let transporterPromise = null;

function mailConfig() {
  const host = process.env.SMTP_HOST || "smtp.sendgrid.net";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || "apikey";
  const pass = process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || "";
  const from =
    process.env.SMTP_FROM || "Farahy CRM <info@farahy.net>";
  return { host, port, user, pass, from };
}

async function getTransporter() {
  if (transporterPromise) return transporterPromise;
  transporterPromise = (async () => {
    const { host, port, user, pass } = mailConfig();
    if (!pass) {
      throw new Error("SMTP_PASS / SENDGRID_API_KEY is not configured");
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  })().catch((err) => {
    transporterPromise = null;
    throw err;
  });
  return transporterPromise;
}

async function sendMail({ to, subject, html, text }) {
  const { from } = mailConfig();
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " "),
  });
  return info;
}

function crmWebUrl() {
  return (
    process.env.CRM_WEB_URL ||
    "https://crm.farahy.net"
  ).replace(/\/$/, "");
}

async function sendInviteEmail({ to, displayName }) {
  const link = `${crmWebUrl()}/?setup=1`;
  const name = displayName || to.split("@")[0];
  const subject = "Welcome to Farahy CRM — Set up your account";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
      <h2 style="color: #1a365d;">Farahy CRM</h2>
      <p>Hi ${name},</p>
      <p>An account has been created for you on Farahy CRM.</p>
      <p>Open the link below, enter your email address, request a verification code, then set your password:</p>
      <p style="margin: 28px 0; text-align: center;">
        <a href="${link}" style="background:#1a365d;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block;">
          Open CRM Login
        </a>
      </p>
      <p style="font-size:13px;color:#666;">If the button does not work, use this link:<br/>${link}</p>
      <p>If you did not expect this email, you can ignore it.</p>
    </div>
  `;
  return sendMail({ to, subject, html });
}

async function sendVerificationCodeEmail({ to, code, purpose }) {
  const isSetup = purpose === "setup";
  const subject = isSetup
    ? "Farahy CRM — Your verification code"
    : "Farahy CRM — Password reset code";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
      <h2 style="color: #1a365d;">Farahy CRM</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; letter-spacing: 4px; font-weight: bold; text-align: center; margin: 24px 0;">
        ${code}
      </p>
      <p>This code expires in <strong>1 hour</strong>.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;
  return sendMail({ to, subject, html });
}

module.exports = {
  sendMail,
  sendInviteEmail,
  sendVerificationCodeEmail,
  crmWebUrl,
  mailConfig,
};
