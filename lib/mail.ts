import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

function getTransporter() {
  const env = getEnv();

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
}

export async function sendInviteEmail(params: { email: string; inviteLink: string; expiresAt: string }) {
  const env = getEnv();
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: params.email,
    subject: "You have been invited to SupportOps Cloud",
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;line-height:1.6;">
        <h2>SupportOps Cloud Invitation</h2>
        <p>You have been invited to join your support operations workspace.</p>
        <p><a href="${params.inviteLink}">Accept invitation</a></p>
        <p>This link expires on ${new Date(params.expiresAt).toLocaleString()}.</p>
      </div>
    `
  });
}

export async function sendAdminMessageEmail(params: {
  email: string;
  type: string;
  message: string;
}) {
  const env = getEnv();
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: params.email,
    subject: `New ${params.type} from SupportOps Cloud`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;line-height:1.6;">
        <h2>New ${params.type}</h2>
        <p>${params.message}</p>
        <p>Please sign in to SupportOps Cloud for more details.</p>
      </div>
    `
  });
}
