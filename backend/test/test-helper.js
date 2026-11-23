/**
 * In-memory Express Request Test Helper
 * Constructs proper http.IncomingMessage and http.ServerResponse instances
 * to test Express middleware without binding TCP sockets.
 */

const http = require('node:http');
const net = require('node:net');

function request(app, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const url = options.url || '/';
  const headers = Object.create(null);

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers[key.toLowerCase()] = value;
    }
  }

  let bodyBuffer = null;
  if (options.body !== undefined && options.body !== null) {
    const raw = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    bodyBuffer = Buffer.from(raw, 'utf-8');
    if (!headers['content-type']) {
      headers['content-type'] = 'application/json';
    }
    headers['content-length'] = String(bodyBuffer.length);
  }

  return new Promise((resolve, reject) => {
    const mockSocket = new net.Socket();
    mockSocket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(mockSocket);
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = headers;

    const res = new http.ServerResponse(req);
    res.assignSocket(mockSocket);

    let responseData = '';
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = function (chunk, encoding, callback) {
      if (chunk) {
        responseData += chunk.toString();
      }
      return true;
    };

    res.end = function (chunk, encoding, callback) {
      if (chunk && typeof chunk !== 'function') {
        responseData += chunk.toString();
      }

      let parsedBody = null;
      try {
        parsedBody = JSON.parse(responseData);
      } catch (err) {
        parsedBody = responseData;
      }

      resolve({
        status: res.statusCode,
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody
      });

      if (typeof callback === 'function') callback();
    };

    app(req, res);

    if (bodyBuffer) {
      req.push(bodyBuffer);
      req.push(null);
    } else {
      req.push(null);
    }
  });
}

module.exports = {
  request
};
