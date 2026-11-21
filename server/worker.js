import assets from 'virtual:youth-hub-assets'
import { handleApi } from './api.js'

const contentTypes = {
  css: 'text/css; charset=utf-8',
  html: 'text/html; charset=utf-8',
  jpg: 'image/jpeg',
  js: 'text/javascript; charset=utf-8',
  svg: 'image/svg+xml',
  woff2: 'font/woff2',
}

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/api/')) return handleApi(request, env)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }

    const assetPath = pathname === '/' ? '/index.html' : pathname
    if (!Object.hasOwn(assets, assetPath)) return new Response('Not found', { status: 404 })

    const type = contentTypes[assetPath.split('.').at(-1)] ?? 'application/octet-stream'
    const cacheControl = assetPath === '/index.html'
      ? 'no-cache'
      : assetPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
    const body = request.method === 'HEAD' ? null : Uint8Array.from(atob(assets[assetPath]), char => char.charCodeAt(0))
    return new Response(body, { headers: { 'Content-Type': type, 'Cache-Control': cacheControl } })
  },
}
