const fs = require('fs')
const http = require('http')
const path = require('path')

const port = Number(process.env.PORT || 5173)
const distDir = path.join(__dirname, 'dist')
const apiTarget = new URL(process.env.API_TARGET || 'http://localhost:8080')

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api')) {
    proxyApi(request, response)
    return
  }

  serveStatic(request, response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`stock-viewer frontend listening on http://0.0.0.0:${port}`)
})

function proxyApi(clientRequest, clientResponse) {
  if (clientRequest.method === 'OPTIONS') {
    clientResponse.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': clientRequest.headers['access-control-request-headers'] || '*',
      'access-control-max-age': '86400',
    })
    clientResponse.end()
    return
  }

  const targetUrl = new URL(clientRequest.url, apiTarget)
  const headers = { ...clientRequest.headers, host: apiTarget.host }
  delete headers.origin
  delete headers.referer
  delete headers['access-control-request-method']
  delete headers['access-control-request-headers']

  const proxyRequest = http.request(
    targetUrl,
    {
      method: clientRequest.method,
      headers,
    },
    (proxyResponse) => {
      clientResponse.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers)
      proxyResponse.pipe(clientResponse)
    },
  )

  proxyRequest.on('error', (error) => {
    clientResponse.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
    clientResponse.end(JSON.stringify({ message: `API proxy failed: ${error.message}` }))
  })

  clientRequest.pipe(proxyRequest)
}

function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(distDir, safePath === '/' ? 'index.html' : safePath)

  fs.readFile(filePath, (fileError, data) => {
    if (!fileError) {
      response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream' })
      response.end(data)
      return
    }

    fs.readFile(path.join(distDir, 'index.html'), (indexError, indexData) => {
      if (indexError) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        response.end('Not found')
        return
      }

      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(indexData)
    })
  })
}
