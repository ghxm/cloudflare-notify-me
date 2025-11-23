// Load contact directory from environment variables
function getContactDirectory(env) {
  // Debug logging
  console.log('CONTACTS_CONFIG exists:', !!env.CONTACTS_CONFIG);
  console.log('CONTACT_PERSONAL:', env.CONTACT_PERSONAL);
  console.log('FASTMAIL_USERNAME:', env.FASTMAIL_USERNAME);
  
  // Method 1: Full JSON config (for Cloudflare Workers production)
  if (env.CONTACTS_CONFIG) {
    try {
      const config = JSON.parse(env.CONTACTS_CONFIG);
      console.log('Successfully parsed CONTACTS_CONFIG:', config);
      return config;
    } catch (error) {
      console.error('Failed to parse CONTACTS_CONFIG:', error);
      console.error('CONTACTS_CONFIG value:', env.CONTACTS_CONFIG);
    }
  }
  
  // Method 2: Individual env vars (for local development)
  return {
    email: {
      'personal': {
        address: env.CONTACT_PERSONAL || env.FASTMAIL_USERNAME,
        name: 'Personal'
      },
      'work': {
        address: env.CONTACT_WORK,
        name: 'Work'
      },
      'urgent': {
        address: env.CONTACT_URGENT,
        name: 'Urgent'
      }
    },
    
    groups: {
      'all': ['personal', 'work'],
      'important': ['work', 'urgent'],
      'family': ['personal']
    }
  };
}

// Resolve contact labels to actual addresses/numbers
export function resolveContacts(recipients, env) {
  const contactDirectory = getContactDirectory(env);
  const resolvedContacts = {
    email: [],
    sms: []
  };

  for (const recipient of recipients) {
    // Check if it's a group
    if (contactDirectory.groups && contactDirectory.groups[recipient]) {
      const groupMembers = contactDirectory.groups[recipient];
      for (const member of groupMembers) {
        addContact(member, resolvedContacts, contactDirectory);
      }
    } else {
      addContact(recipient, resolvedContacts, contactDirectory);
    }
  }

  return resolvedContacts;
}

function addContact(label, resolvedContacts, contactDirectory) {
  // Check email contacts
  if (contactDirectory.email && contactDirectory.email[label]) {
    const contact = contactDirectory.email[label];
    const address = contact.address;
    // Only add if address exists and doesn't contain example.com
    if (address && !address.includes('example.com') && !resolvedContacts.email.includes(address)) {
      resolvedContacts.email.push(address);
    }
  }
}