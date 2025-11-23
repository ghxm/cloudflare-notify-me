// Request validation utilities
export function validateNotificationRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body must be a JSON object' };
  }

  // Subject is required
  if (!body.subject || typeof body.subject !== 'string' || body.subject.trim() === '') {
    return { valid: false, message: 'Subject is required and must be a non-empty string' };
  }

  // Message is required
  if (!body.message || typeof body.message !== 'string' || body.message.trim() === '') {
    return { valid: false, message: 'Message is required and must be a non-empty string' };
  }

  // Recipients is optional but if provided must be an array
  if (body.recipients !== undefined) {
    if (!Array.isArray(body.recipients)) {
      return { valid: false, message: 'Recipients must be an array' };
    }
    
    if (body.recipients.length === 0) {
      return { valid: false, message: 'Recipients array cannot be empty' };
    }
    
    // All recipients must be strings
    for (const recipient of body.recipients) {
      if (typeof recipient !== 'string' || recipient.trim() === '') {
        return { valid: false, message: 'All recipients must be non-empty strings' };
      }
    }
  }

  // Check for reasonable length limits
  if (body.subject.length > 200) {
    return { valid: false, message: 'Subject must be 200 characters or less' };
  }

  if (body.message.length > 10000) {
    return { valid: false, message: 'Message must be 10,000 characters or less' };
  }

  return { valid: true };
}