import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const project = fileURLToPath(new URL('..', import.meta.url))
const client = join(project, 'dist', 'client')
const virtualAssets = 'virtual:youth-hub-assets'
const resolvedAssets = '\0' + virtualAssets

await build({ root: project })

const files = (await readdir(client, { recursive: true, withFileTypes: true })).filter(file => file.isFile())
const assets = Object.fromEntries(await Promise.all(files.map(async file => {
  const path = join(file.parentPath, file.name)
  const route = '/' + relative(client, path).split(sep).join('/')
  return [route, await readFile(path, 'base64')]
})))

await build({
  root: project,
  configFile: false,
  publicDir: false,
  plugins: [{
    name: 'embed-youth-hub-assets',
    resolveId(id) {
      if (id === virtualAssets) return resolvedAssets
    },
    load(id) {
      if (id === resolvedAssets) return `export default ${JSON.stringify(assets)}`
    },
  }],
  build: {
    outDir: 'dist/server',
    lib: { entry: join(project, 'server', 'worker.js'), formats: ['es'], fileName: () => 'index.js' },
    reportCompressedSize: false,
  },
})

const manifest = join(project, 'dist', '.openai')
await mkdir(manifest, { recursive: true })
await copyFile(join(project, '.openai', 'hosting.json'), join(manifest, 'hosting.json'))
