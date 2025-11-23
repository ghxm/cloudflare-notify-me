import { handleNotification } from './handlers/notification.js';
import { validateAuth } from './middleware/auth.js';

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      // Validate authentication if enabled
      if (env.AUTH_ENABLED === 'true') {
        const authResult = await validateAuth(request, env);
        if (!authResult.valid) {
          return new Response(authResult.message, { 
            status: 401, 
            headers: corsHeaders 
          });
        }
      }

      // Handle the notification request
      const result = await handleNotification(request, env);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error('Error handling request:', error);
      
      // Use custom status if available, otherwise default to 500
      const status = error.status || 500;
      const errorType = status === 400 ? 'Bad request' : 'Internal server error';
      
      return new Response(JSON.stringify({ 
        error: errorType,
        message: error.message 
      }), {
        status: status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};