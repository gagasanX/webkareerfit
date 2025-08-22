import { createServer } from 'node:http';
import { NextServer } from 'next/dist/server/next';

// Create the Next.js server
const nextServer = new NextServer({
  hostname: '0.0.0.0',
  port: 3000,
  dir: '.',
  dev: false,
  conf: {
    env: {},
    experimental: {
      appDir: true,
    },
  },
});

const requestHandler = nextServer.getRequestHandler();

// Create a basic HTTP server
const server = createServer(async (req, res) => {
  try {
    await requestHandler(req, res);
  } catch (err) {
    console.error('Error occurred handling', req.url, err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Start listening
server.listen(3000, (err) => {
  if (err) throw err;
  console.log('> Ready on http://localhost:3000');
});
