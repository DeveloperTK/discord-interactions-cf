const { InteractionType, InteractionResponseType, InteractionResponseFlags, verifyKey } = require('discord-interactions');

// Util to send a JSON response
const jsonResponse = obj => new Response(JSON.stringify(obj), {
  headers: {
      'Content-Type': 'application/json',
  },
});

// Util to send a perm redirect response
const redirectResponse = url => new Response(null, {
  status: 301,
  headers: {
      Location: url,
  },
});

const webhookLog = async (message) => {
  fetch(process.env.DEBUG_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `\`\`\`json\n${message}\`\`\`` })
  });
};

// Util to verify a Discord interaction is legitimate
const handleInteractionVerification = (request, bodyBuffer) => {
  const timestamp = request.headers.get('X-Signature-Timestamp') || '';
  const signature = request.headers.get('X-Signature-Ed25519') || '';
  return verifyKey(bodyBuffer, signature, timestamp, process.env.CLIENT_PUBLIC_KEY);
};

// Process a Discord command interaction
const handleCommandInteraction = async ({ body, wait }) => {
  try {
      return jsonResponse({
        type: 4,
        data: {
          content: "Test Response from Cloudflare Worker"
        }
      });
  } catch (err) {
      // Catch & log any errors
      console.log(body);
      console.error(err);

      // Send an ephemeral message to the user
      return jsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
              content: 'An unexpected error occurred when executing the command.',
              flags: InteractionResponseFlags.EPHEMERAL,
          },
      });
  }
};

// Process a Discord component interaction
const handleComponentInteraction = async ({ body, wait }) => {
  try {
      
      return new Response(null, { status: 501 });
  } catch (err) {
      // Handle a non-existent component
      if (err.code === 'MODULE_NOT_FOUND')
          return new Response(null, { status: 404 });

      // Catch & log any errors
      console.log(body);
      console.error(err);

      // Send a 500
      return new Response(null, { status: 500 });
  }
};

// Process a Discord interaction POST request
const handleInteraction = async ({ request, wait }) => {
  // Get the body as a buffer and as text
  const bodyBuffer = await request.arrayBuffer();
  const bodyText = (new TextDecoder('utf-8')).decode(bodyBuffer);

  // Verify a legitimate request
  if (!handleInteractionVerification(request, bodyBuffer))
      return new Response(null, { status: 401 });

  // Work with JSON body going forward
  const body = JSON.parse(bodyText);

  webhookLog("Request Body: " + JSON.stringify(body, null, 2));

  // Handle different interaction types
  switch (body.type) {
      // Handle a PING
      case InteractionType.PING:
          return jsonResponse({
              type: InteractionResponseType.PONG,
          });

      // Handle a command
      case InteractionType.APPLICATION_COMMAND:
          return handleCommandInteraction({ body, wait });

      // Handle a component
      case InteractionType.MESSAGE_COMPONENT:
          return handleComponentInteraction({ body, wait });

      // Unknown
      default:
          return new Response(null, { status: 501 });
  }
};

/**
 * Respond with hello worker text
 * @param {Request} request
 */
// Process all requests to the worker
const handleRequest = async ({ request, wait }) => {
  const url = new URL(request.url);

  // Send interactions off to their own handler
  if (request.method === 'POST' && url.pathname === '/interactions')
      return await handleInteraction({ request, wait });

  // Otherwise, we only care for GET requests
  if (request.method !== 'GET')
      return new Response(null, { status: 404 });

  // Health check route
  if (url.pathname === '/health')
      return new Response('OK', {
          headers: {
              'Content-Type': 'text/plain',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              Expires: '0',
              'Surrogate-Control': 'no-store',
          },
      });

  // Invite redirect
  if (url.pathname === '/invite')
      return redirectResponse(`https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=applications.commands`);

  // Discord redirect
//   if (url.pathname === '/server')
//       return redirectResponse('https://discord.gg/invite');

  // GitHub redirect
//   if (url.pathname === '/github')
//       return redirectResponse('https://github.com/user/repo');

  // Not found
  return new Response(null, { status: 404 });
};

/**
 * Entry event for worker calls
 * @param event cloudflare event
 */
addEventListener('fetch', event => {
  // Process the event
  return event.respondWith(
    handleRequest({
      request: event.request,
      wait: event.waitUntil.bind(event),
    }).catch(err => {
      // Log & re-throw any errors
      console.error(err);
      throw err;
    })
  );
})