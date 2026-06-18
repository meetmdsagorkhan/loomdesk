/**
 * Email Notification System for Bookings
 * 
 * Sends confirmation, cancellation, and reschedule emails with .ics calendar invites
 */

import { Resend } from 'resend';
import { format } from 'date-fns';
import type { Booking, EventType, User } from '@prisma/client';

// Custom type for booking with relations
export type BookingWithDetails = Booking & {
  eventType: EventType & {
    user: User;
  };
};

// Lazy initialization of Resend client
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Generate .ics calendar file content
 */
export function generateICSFile(
  booking: BookingWithDetails,
  organizerName: string,
  organizerEmail: string
): string {
  const startTime = format(booking.startTime, "yyyyMMdd'T'HHmmss'Z'");
  const endTime = format(booking.endTime, "yyyyMMdd'T'HHmmss'Z'");
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const uid = `${booking.id}@loomdesk.com`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LoomDesk//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `SUMMARY:${booking.eventType?.title || 'Meeting'}`,
    `DESCRIPTION:Meeting with ${booking.name}\\n\\nEmail: ${booking.email}`,
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
    `ATTENDEE;CN=${booking.name};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${booking.email}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

const getEmailTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 10px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .logo span {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 8px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .details-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .details-row {
      margin-bottom: 16px;
    }
    .details-row:last-child {
      margin-bottom: 0;
    }
    .details-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 4px;
    }
    .details-value {
      font-size: 16px;
      font-weight: 500;
      color: #0f172a;
    }
    .details-value a {
      color: #6366f1;
      text-decoration: none;
    }
    .details-value a:hover {
      text-decoration: underline;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      font-weight: 600;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 10px;
      margin-top: 24px;
      text-align: center;
    }
    .footer {
      background: #f1f5f9;
      padding: 24px 30px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          LoomDesk
        </div>
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        Powered by LoomDesk &copy; ${new Date().getFullYear()}
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send booking confirmation email to both host and invitee
 */
export async function sendBookingConfirmationEmail(
  booking: BookingWithDetails,
  isReschedule = false
): Promise<void> {
  const hostName = booking.eventType?.user?.name || 'Host';
  const hostEmail = booking.eventType?.user?.email || '';
  const inviteeName = booking.name;
  const inviteeEmail = booking.email;
  const eventTitle = booking.eventType?.title || 'Meeting';
  // Escape "at" properly in format string so it doesn't parse 't' as a timestamp
  const startTime = format(booking.startTime, "EEEE, MMMM d, yyyy 'at' h:mm a");
  const endTime = format(booking.endTime, 'h:mm a');
  const meetLink = booking.meetLink || 'Will be provided by host';
  const hasLink = meetLink.startsWith('http');

  // Generate .ics file
  const icsContent = generateICSFile(booking, hostName, hostEmail);
  const csAttachment = {
    content: icsContent,
    filename: 'meeting.ics',
    type: 'text/calendar'
  };

  // Email to invitee
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: inviteeEmail,
      subject: isReschedule 
        ? `Meeting Rescheduled: ${eventTitle} with ${hostName}`
        : `Meeting Confirmed: ${eventTitle} with ${hostName}`,
      html: getEmailTemplate(
        isReschedule ? '📅 Meeting Rescheduled' : '✅ Meeting Confirmed',
        `
          <p style="font-size: 16px;">Hi <strong>${inviteeName}</strong>,</p>
          <p style="font-size: 16px; color: #475569;">
            ${isReschedule 
              ? `Your meeting with ${hostName} has been rescheduled.`
              : `Your meeting with ${hostName} is successfully confirmed.`}
          </p>
          
          <div class="details-box">
            <div class="details-row">
              <div class="details-label">What</div>
              <div class="details-value">${eventTitle}</div>
            </div>
            <div class="details-row">
              <div class="details-label">When</div>
              <div class="details-value">${startTime} - ${endTime}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Where</div>
              <div class="details-value">
                ${hasLink ? `<a href="${meetLink}" target="_blank">Google Meet Link</a>` : meetLink}
              </div>
            </div>
            <div class="details-row">
              <div class="details-label">Host</div>
              <div class="details-value">${hostName} (${hostEmail})</div>
            </div>
          </div>

          <p style="font-size: 14px; color: #64748b;">
            The calendar invite is attached to this email. You can add it directly to your calendar.
          </p>
          
          ${hasLink ? `<div style="text-align: center;"><a href="${meetLink}" class="button" target="_blank">Join Meeting</a></div>` : ''}
          
          <hr style="border:none; border-top:1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
            Need to reschedule or cancel? Please contact <a href="mailto:${hostEmail}" style="color:#6366f1;">${hostEmail}</a>.
          </p>
        `
      ),
      attachments: [csAttachment]
    });
  } catch (error) {
    console.error('Failed to send confirmation email to invitee:', error);
    throw error;
  }

  // Email to host
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: hostEmail,
      subject: isReschedule
        ? `Meeting Rescheduled: ${eventTitle} with ${inviteeName}`
        : `New Booking: ${eventTitle} with ${inviteeName}`,
      html: getEmailTemplate(
        isReschedule ? '📅 Meeting Rescheduled' : '🎉 New Booking',
        `
          <p style="font-size: 16px;">Hi <strong>${hostName}</strong>,</p>
          <p style="font-size: 16px; color: #475569;">
            ${isReschedule
              ? `Your meeting with ${inviteeName} has been rescheduled.`
              : `You have a new booking from ${inviteeName}!`}
          </p>
          
          <div class="details-box">
            <div class="details-row">
              <div class="details-label">What</div>
              <div class="details-value">${eventTitle}</div>
            </div>
            <div class="details-row">
              <div class="details-label">When</div>
              <div class="details-value">${startTime} - ${endTime}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Where</div>
              <div class="details-value">
                ${hasLink ? `<a href="${meetLink}" target="_blank">Google Meet Link</a>` : meetLink}
              </div>
            </div>
            <div class="details-row">
              <div class="details-label">Invitee</div>
              <div class="details-value">${inviteeName} (<a href="mailto:${inviteeEmail}">${inviteeEmail}</a>)</div>
            </div>
          </div>
        `
      ),
      attachments: [csAttachment]
    });
  } catch (error) {
    console.error('Failed to send confirmation email to host:', error);
    throw error;
  }
}

/**
 * Send booking cancellation email to both host and invitee
 */
export async function sendBookingCancellationEmail(
  booking: BookingWithDetails,
  reason?: string,
  cancelledByHost = false
): Promise<void> {
  const hostName = booking.eventType?.user?.name || 'Host';
  const hostEmail = booking.eventType?.user?.email || '';
  const inviteeName = booking.name;
  const inviteeEmail = booking.email;
  const eventTitle = booking.eventType?.title || 'Meeting';
  const startTime = format(booking.startTime, "EEEE, MMMM d, yyyy 'at' h:mm a");

  // Email to invitee
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: inviteeEmail,
      subject: `Meeting Cancelled: ${eventTitle} with ${hostName}`,
      html: getEmailTemplate(
        '❌ Meeting Cancelled',
        `
          <p style="font-size: 16px;">Hi <strong>${inviteeName}</strong>,</p>
          <p style="font-size: 16px; color: #475569;">
            Your meeting with <strong>${hostName}</strong> has been cancelled.
          </p>
          
          <div class="details-box">
            <div class="details-row">
              <div class="details-label">What</div>
              <div class="details-value">${eventTitle}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Was scheduled for</div>
              <div class="details-value">${startTime}</div>
            </div>
            ${reason ? `
            <div class="details-row">
              <div class="details-label">Reason</div>
              <div class="details-value">${reason}</div>
            </div>
            ` : ''}
          </div>

          <hr style="border:none; border-top:1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
            If you'd like to reschedule, please reach out to <a href="mailto:${hostEmail}" style="color:#6366f1;">${hostEmail}</a>.
          </p>
        `
      )
    });
  } catch (error) {
    console.error('Failed to send cancellation email to invitee:', error);
    throw error;
  }

  // Email to host
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: hostEmail,
      subject: `Meeting Cancelled: ${eventTitle} with ${inviteeName}`,
      html: getEmailTemplate(
        '❌ Meeting Cancelled',
        `
          <p style="font-size: 16px;">Hi <strong>${hostName}</strong>,</p>
          <p style="font-size: 16px; color: #475569;">
            Your meeting with <strong>${inviteeName}</strong> has been cancelled${cancelledByHost ? ' by you' : ''}.
          </p>
          
          <div class="details-box">
            <div class="details-row">
              <div class="details-label">What</div>
              <div class="details-value">${eventTitle}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Was scheduled for</div>
              <div class="details-value">${startTime}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Invitee</div>
              <div class="details-value">${inviteeName} (<a href="mailto:${inviteeEmail}">${inviteeEmail}</a>)</div>
            </div>
            ${reason ? `
            <div class="details-row">
              <div class="details-label">Reason</div>
              <div class="details-value">${reason}</div>
            </div>
            ` : ''}
          </div>
        `
      )
    });
  } catch (error) {
    console.error('Failed to send cancellation email to host:', error);
    throw error;
  }
}
