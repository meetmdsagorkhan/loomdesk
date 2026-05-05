/**
 * Email Notification System for Bookings
 * 
 * Sends confirmation, cancellation, and reschedule emails with .ics calendar invites
 */

import { Resend } from 'resend';
import { format } from 'date-fns';
import type { Booking } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate .ics calendar file content
 */
export function generateICSFile(
  booking: Booking,
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

/**
 * Send booking confirmation email to both host and invitee
 */
export async function sendBookingConfirmationEmail(
  booking: any,
  isReschedule = false
): Promise<void> {
  const hostName = booking.eventType?.user?.name || 'Host';
  const hostEmail = booking.eventType?.user?.email;
  const inviteeName = booking.name;
  const inviteeEmail = booking.email;
  const eventTitle = booking.eventType?.title || 'Meeting';
  const startTime = format(booking.startTime, 'EEEE, MMMM d, yyyy at h:mm a');
  const endTime = format(booking.endTime, 'h:mm a');
  const meetLink = booking.meetLink || 'Will be provided by host';

  // Generate .ics file
  const icsContent = generateICSFile(booking, hostName, hostEmail);
  const csAttachment = {
    content: icsContent,
    filename: 'meeting.ics',
    type: 'text/calendar'
  };

  // Email to invitee
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: inviteeEmail,
      subject: isReschedule 
        ? `Meeting Rescheduled: ${eventTitle} with ${hostName}`
        : `Meeting Confirmed: ${eventTitle} with ${hostName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details-item { margin: 10px 0; }
            .details-label { font-weight: 600; color: #666; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isReschedule ? '📅 Meeting Rescheduled' : '✅ Meeting Confirmed'}</h1>
            </div>
            <div class="content">
              <p>Hello ${inviteeName},</p>
              <p>${isReschedule 
                ? `Your meeting with ${hostName} has been rescheduled. Here are the new details:`
                : `Your meeting with ${hostName} is confirmed! Here are the details:`}</p>
              
              <div class="details">
                <div class="details-item">
                  <div class="details-label">What:</div>
                  <div>${eventTitle}</div>
                </div>
                <div class="details-item">
                  <div class="details-label">When:</div>
                  <div>${startTime} - ${endTime}</div>
                </div>
                <div class="details-item">
                  <div class="details-label">Where:</div>
                  <div><a href="${meetLink}">${meetLink}</a></div>
                </div>
                <div class="details-item">
                  <div class="details-label">With:</div>
                  <div>${hostName}</div>
                </div>
              </div>

              <p>The calendar invite is attached to this email. You can add it to your calendar by opening the attachment.</p>
              
              <p>If you need to reschedule or cancel, please contact ${hostEmail}.</p>
              
              <div class="footer">
                <p>This email was sent by LoomDesk</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [csAttachment]
    });
  } catch (error) {
    console.error('Failed to send confirmation email to invitee:', error);
    throw error;
  }

  // Email to host
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: hostEmail,
      subject: isReschedule
        ? `Meeting Rescheduled: ${eventTitle} with ${inviteeName}`
        : `New Booking: ${eventTitle} with ${inviteeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details-item { margin: 10px 0; }
            .details-label { font-weight: 600; color: #666; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isReschedule ? '📅 Meeting Rescheduled' : '🎉 New Booking'}</h1>
            </div>
            <div class="content">
              <p>Hello ${hostName},</p>
              <p>${isReschedule
                ? `Your meeting with ${inviteeName} has been rescheduled.`
                : `You have a new booking from ${inviteeName}!`}</p>
              
              <div class="details">
                <div class="details-item">
                  <div class="details-label">What:</div>
                  <div>${eventTitle}</div>
                </div>
                <div class="details-item">
                  <div class="details-label">When:</div>
                  <div>${startTime} - ${endTime}</div>
                </div>
                <div class="details-item">
                  <div class="details-label">Invitee:</div>
                  <div>${inviteeName} (${inviteeEmail})</div>
                </div>
                <div class="details-item">
                  <div class="details-label">Meeting Link:</div>
                  <div><a href="${meetLink}">${meetLink}</a></div>
                </div>
              </div>

              <p>The calendar invite is attached to this email.</p>
              
              <div class="footer">
                <p>This email was sent by LoomDesk</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
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
  booking: any,
  reason?: string,
  cancelledByHost = false
): Promise<void> {
  const hostName = booking.eventType?.user?.name || 'Host';
  const hostEmail = booking.eventType?.user?.email;
  const inviteeName = booking.name;
  const inviteeEmail = booking.email;
  const eventTitle = booking.eventType?.title || 'Meeting';
  const startTime = format(booking.startTime, 'EEEE, MMMM d, yyyy at h:mm a');

  // Email to invitee
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: inviteeEmail,
      subject: `Meeting Cancelled: ${eventTitle} with ${hostName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details-item { margin: 10px 0; }
            .details-label { font-weight: 600; color: #666; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Meeting Cancelled</h1>
            </div>
            <div class="content">
              <p>Hello ${inviteeName},</p>
              <p>Your meeting with ${hostName} has been cancelled.</p>
              
              <div class="details">
                <div class="details-item">
                  <div class="details-label">What:</div>
                  <div>${eventTitle}</div>
                </div>
                <div class="details-item">
                  <div class="details-label">Was scheduled for:</div>
                  <div>${startTime}</div>
                </div>
                ${reason ? `
                <div class="details-item">
                  <div class="details-label">Reason:</div>
                  <div>${reason}</div>
                </div>
                ` : ''}
              </div>

              <p>If you'd like to reschedule, please reach out to ${hostEmail}.</p>
              
              <div class="footer">
                <p>This email was sent by LoomDesk</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Failed to send cancellation email to invitee:', error);
    throw error;
  }

  // Email to host
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@loomdesk.com',
      to: hostEmail,
      subject: `Meeting Cancelled: ${eventTitle} with ${inviteeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details-item { margin: 10px 0; }
            .details-label { font-weight: 600; color: #666; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Meeting Cancelled</h1>
            </div>
            <div class="content">
              <p>Hello ${hostName},</p>
              <p>Your meeting with ${inviteeName} has been cancelled${cancelledByHost ? ' by you' : ''}.</p>
              
              <div class="details">
                <div class="details-item">
                  <div class="details-label">What:</div>
                  <div>${eventTitle}</div>
                </div>
                <div class="details-item">
                  <div class="details-label">Was scheduled for:</div>
                  <div>${startTime}</div>
                </div>
                <div class="details-item">
                  <div class="details-label">Invitee:</div>
                  <div>${inviteeName} (${inviteeEmail})</div>
                </div>
                ${reason ? `
                <div class="details-item">
                  <div class="details-label">Reason:</div>
                  <div>${reason}</div>
                </div>
                ` : ''}
              </div>
              
              <div class="footer">
                <p>This email was sent by LoomDesk</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Failed to send cancellation email to host:', error);
    throw error;
  }
}
