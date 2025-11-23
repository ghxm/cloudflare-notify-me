// Simple token-based authentication middleware
export async function validateAuth(request, env) {
  if (!env.AUTH_TOKEN) {
    return { valid: false, message: 'Authentication not configured' };
  }

  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { valid: false, message: 'Missing Authorization header' };
  }

  // Support both "Bearer token" and "token" formats
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  if (token !== env.AUTH_TOKEN) {
    return { valid: false, message: 'Invalid authentication token' };
  }

  return { valid: true };
}