import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wrapper = process.platform === 'win32'
  ? path.join(root, 'backend', 'mvnw.cmd')
  : path.join(root, 'backend', 'mvnw')

const result = spawnSync(wrapper, [...process.argv.slice(2), '-f', path.join(root, 'backend', 'pom.xml')], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
