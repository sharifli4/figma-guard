import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const uiPath = resolve(process.cwd(), 'dist/index.html')
const original = await readFile(uiPath, 'utf8')
const updated = original.replace('<script type="module" crossorigin>', '<script>')

await writeFile(uiPath, updated)
