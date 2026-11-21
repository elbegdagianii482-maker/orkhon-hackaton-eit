import { Readable } from 'node:stream'

export function localApi() {
  async function install(server) {
    const [{ createLocalDatabase }, { handleApi }] = await Promise.all([
      import('./local-db.js'),
      import('./api.js'),
    ])
    const DB = createLocalDatabase()
    server.httpServer?.on('close', () => DB.close())

    server.middlewares.use(async (incoming, outgoing, next) => {
      const url = new URL(incoming.url ?? '/', 'http://127.0.0.1')
      if (!url.pathname.startsWith('/api/')) return next()

      try {
        const method = incoming.method ?? 'GET'
        const hasBody = method !== 'GET' && method !== 'HEAD'
        const request = new Request(url, {
          method,
          headers: incoming.headers,
          ...(hasBody ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}),
        })
        const response = await handleApi(request, { DB })
        outgoing.writeHead(response.status, Object.fromEntries(response.headers))
        outgoing.end(Buffer.from(await response.arrayBuffer()))
      } catch (error) {
        next(error)
      }
    })
  }

  return { name: 'youth-hub-local-api', configureServer: install, configurePreviewServer: install }
}
