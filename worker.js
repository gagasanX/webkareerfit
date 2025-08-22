import { createServer } from 'node:http';
import { NextServer } from 'next/dist/server/next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create the Next.js server
const nextServer = new NextServer({
  hostname: '0.0.0.0',
  port: 3000,
  dir: path.join(__dirname, '.next/standalone'),
  dev: false,
  conf: {
    env: {},
    experimental: {
      appDir: true,
    },
    distDir: '.next',
    publicRuntimeConfig: {
      // Will be available on both server and client
      staticFolder: '/public',
    },
  },
});

const requestHandler = nextServer.getRequestHandler();

export default {
  async fetch(request, env, ctx) {
    try {
      // Convert request to node-style request
      const { method, url, headers } = request;
      const nodeRequest = {
        method,
        url,
        headers: Object.fromEntries(headers.entries()),
        connection: {
          remoteAddress: request.headers.get('cf-connecting-ip'),
        },
      };

      // Create a response stream
      let body = [];
      const nodeResponse = {
        statusCode: 200,
        headers: {},
        write: (chunk) => {
          body.push(chunk);
        },
        setHeader: (name, value) => {
          nodeResponse.headers[name.toLowerCase()] = value;
        },
        getHeader: (name) => nodeResponse.headers[name.toLowerCase()],
        removeHeader: (name) => {
          delete nodeResponse.headers[name.toLowerCase()];
        },
        end: (chunk) => {
          if (chunk) body.push(chunk);
        },
      };

      // Handle the request
      await requestHandler(nodeRequest, nodeResponse);

      // Convert node response to web response
      const responseInit = {
        status: nodeResponse.statusCode,
        headers: nodeResponse.headers,
      };

      return new Response(Buffer.concat(body), responseInit);
    } catch (err) {
      console.error('Error occurred handling', request.url, err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
