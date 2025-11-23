import { resolveContacts } from '../config/contacts.js';
import { sendEmail } from '../services/email.js';
import { validateNotificationRequest } from '../utils/validation.js';

export async function handleNotification(request, env) {
  // Parse request body
  const body = await request.json();
  
  // Validate the request
  const validation = validateNotificationRequest(body);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.status = 400; // Bad Request instead of 500
    throw error;
  }

  const { subject, message, recipients = ['personal'] } = body;
  
  // Resolve recipient labels to actual contact information
  const contacts = resolveContacts(recipients, env);
  
  const results = {
    success: true,
    sent: {
      email: [],
      sms: []
    },
    errors: []
  };

  // Send emails
  if (contacts.email.length > 0) {
    for (const emailAddress of contacts.email) {
      try {
        await sendEmail({
          to: emailAddress,
          subject: subject,
          body: message,
          env: env
        });
        results.sent.email.push(emailAddress);
      } catch (error) {
        console.error(`Failed to send email to ${emailAddress}:`, error);
        results.errors.push({
          type: 'email',
          recipient: emailAddress,
          error: error.message
        });
      }
    }
  }

  // TODO: Send SMS messages when implemented
  // if (contacts.sms.length > 0) {
  //   for (const phoneNumber of contacts.sms) {
  //     try {
  //       await sendSMS({
  //         to: phoneNumber,
  //         message: `${subject}\n\n${message}`,
  //         env: env
  //       });
  //       results.sent.sms.push(phoneNumber);
  //     } catch (error) {
  //       console.error(`Failed to send SMS to ${phoneNumber}:`, error);
  //       results.errors.push({
  //         type: 'sms',
  //         recipient: phoneNumber,
  //         error: error.message
  //       });
  //     }
  //   }
  // }

  // If we have errors but some messages were sent, it's a partial success
  if (results.errors.length > 0 && (results.sent.email.length > 0 || results.sent.sms.length > 0)) {
    results.success = false;
    results.message = 'Some notifications failed to send';
  } else if (results.errors.length > 0) {
    results.success = false;
    results.message = 'All notifications failed to send';
  } else {
    results.message = 'All notifications sent successfully';
  }

  return results;
}