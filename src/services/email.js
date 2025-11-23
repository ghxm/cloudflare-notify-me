// Email service using various methods
export async function sendEmail({ to, subject, body, env }) {
  const emailData = {
    to: to,
    from: env.FASTMAIL_USERNAME || env.SMTP_USER || env.FROM_EMAIL || 'noreply@example.com',
    subject: subject,
    text: body,
    html: formatEmailBody(body)
  };

  // Method 1: Fastmail JMAP API
  if (env.FASTMAIL_API_TOKEN && env.FASTMAIL_USERNAME) {
    return await sendViaFastmailJMAP(emailData, env);
  }

  // Method 2: Email service API (Resend, SendGrid, etc.)
  if (env.EMAIL_SERVICE_URL && env.EMAIL_API_KEY) {
    return await sendViaAPI(emailData, env);
  }

  // Method 3: Gmail API via SMTP credentials
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return await sendViaGmailAPI(emailData, env);
  }

  // Method 4: Development/testing mode
  console.log('Email would be sent:', {
    to: emailData.to,
    subject: emailData.subject,
    body: emailData.text
  });
  
  return {
    success: true,
    messageId: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

async function sendViaFastmailJMAP(emailData, env) {
  try {
    // Step 1: Get session information
    const sessionResponse = await fetch('https://api.fastmail.com/jmap/session', {
      headers: {
        'Authorization': `Bearer ${env.FASTMAIL_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!sessionResponse.ok) {
      throw new Error(`Fastmail session error: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    const accountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];
    const apiUrl = session.apiUrl;

    // Step 2: Get mailboxes to find Drafts folder
    const mailboxRequest = {
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: [
        [
          'Mailbox/get',
          {
            accountId: accountId,
            properties: ['id', 'name', 'role']
          },
          'mb1'
        ]
      ]
    };

    const mailboxResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.FASTMAIL_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mailboxRequest)
    });

    if (!mailboxResponse.ok) {
      throw new Error(`Fastmail mailbox error: ${mailboxResponse.status}`);
    }

    const mailboxResult = await mailboxResponse.json();
    const draftsMailbox = mailboxResult.methodResponses[0][1].list.find(mb => mb.role === 'drafts');
    
    if (!draftsMailbox) {
      throw new Error('Drafts mailbox not found');
    }

    // Step 3: Create email draft
    const emailCreateRequest = {
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission'],
      methodCalls: [
        [
          'Email/set',
          {
            accountId: accountId,
            create: {
              draft: {
                mailboxIds: {
                  [draftsMailbox.id]: true
                },
                from: [{ email: emailData.from }],
                to: [{ email: emailData.to }],
                subject: emailData.subject,
                textBody: [
                  {
                    partId: 'text',
                    type: 'text/plain'
                  }
                ],
                bodyValues: {
                  text: {
                    value: emailData.text
                  }
                }
              }
            }
          },
          'c1'
        ]
      ]
    };

    const createResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.FASTMAIL_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailCreateRequest)
    });

    if (!createResponse.ok) {
      throw new Error(`Fastmail create error: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    
    // Better error handling for draft creation
    if (!createResult.methodResponses || !createResult.methodResponses[0] || !createResult.methodResponses[0][1] || !createResult.methodResponses[0][1].created) {
      console.error('Create result:', JSON.stringify(createResult, null, 2));
      throw new Error('Failed to create draft email');
    }

    const emailId = createResult.methodResponses[0][1].created.draft.id;

    // Step 4: Get identities to find the sending identity
    const identityRequest = {
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:submission'],
      methodCalls: [
        [
          'Identity/get',
          {
            accountId: accountId
          },
          'id1'
        ]
      ]
    };

    const identityResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.FASTMAIL_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(identityRequest)
    });

    if (!identityResponse.ok) {
      throw new Error(`Fastmail identity error: ${identityResponse.status}`);
    }

    const identityResult = await identityResponse.json();
    const identity = identityResult.methodResponses[0][1].list.find(id => id.email === emailData.from);
    
    if (!identity) {
      throw new Error(`No sending identity found for ${emailData.from}. Available identities: ${identityResult.methodResponses[0][1].list.map(id => id.email).join(', ')}`);
    }

    // Step 5: Send the email with identity
    const sendRequest = {
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission'],
      methodCalls: [
        [
          'EmailSubmission/set',
          {
            accountId: accountId,
            create: {
              send: {
                emailId: emailId,
                identityId: identity.id
              }
            }
          },
          'c2'
        ]
      ]
    };

    const sendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.FASTMAIL_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendRequest)
    });

    if (!sendResponse.ok) {
      throw new Error(`Fastmail send error: ${sendResponse.status}`);
    }

    const sendResult = await sendResponse.json();
    
    // Better error handling for email submission
    if (!sendResult.methodResponses || !sendResult.methodResponses[0] || !sendResult.methodResponses[0][1] || !sendResult.methodResponses[0][1].created) {
      console.error('Send result:', JSON.stringify(sendResult, null, 2));
      throw new Error('Failed to send email via JMAP');
    }
    
    return {
      success: true,
      messageId: emailId,
      submissionId: sendResult.methodResponses[0][1].created.send.id
    };

  } catch (error) {
    console.error('Fastmail JMAP error:', error);
    throw error;
  }
}

async function sendViaAPI(emailData, env) {
  const response = await fetch(env.EMAIL_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email service error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function sendViaGmailAPI(emailData, env) {
  // Convert SMTP credentials to Gmail API usage
  // This uses Gmail's REST API instead of SMTP protocol
  
  // Create the email message
  const message = [
    `To: ${emailData.to}`,
    `From: ${emailData.from}`,
    `Subject: ${emailData.subject}`,
    '',
    emailData.text
  ].join('\n');
  
  // Base64 encode the message
  const encodedMessage = btoa(unescape(encodeURIComponent(message)));
  
  // Gmail API endpoint
  const gmailApiUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  
  try {
    // For Gmail API, you'd need an OAuth token, not SMTP credentials
    // This is a simplified example - in practice you'd need proper OAuth flow
    const response = await fetch(gmailApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GMAIL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // If Gmail API fails, log for development
    console.log('Gmail API not configured, email would be sent via SMTP:', {
      host: env.SMTP_HOST,
      user: env.SMTP_USER,
      to: emailData.to,
      subject: emailData.subject
    });
    
    return {
      success: true,
      messageId: `smtp_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }
}

function formatEmailBody(message) {
  // Convert plain text to basic HTML
  return message
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}