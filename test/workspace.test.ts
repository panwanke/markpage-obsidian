import { execFileSync, spawnSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inside, validateEngine } from '../scripts/workspace.mjs'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) {
    if (dirname(root) !== await realpath(tmpdir()) || !basename(root).startsWith('markpage-sync-')) throw new Error('Unsafe sync fixture path')
    await rm(root, { recursive: true })
  }
})

describe('shared engine synchronization', () => {
  it('requires immutable commits and the intended upstream', () => {
    expect(() => validateEngine({ repository: 'https://github.com/panwanke/markpage.git', commit: 'main' })).toThrow('full commit SHA')
    expect(() => validateEngine({ repository: 'https://example.org/untrusted.git', commit: 'a'.repeat(40) })).toThrow('MarkPage repository')
    expect(inside(resolve('cache'), resolve('cache-extra'))).toBe(false)
    expect(inside(resolve('cache'), resolve('cache', '..', 'outside'))).toBe(false)
  })

  it('restores the previous engine pin when compatibility validation fails', async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'markpage-sync-')))
    roots.push(root)
    const plugin = join(root, 'apps/obsidian')
    await mkdir(join(plugin, 'scripts'), { recursive: true })
    await mkdir(join(root, 'packages/core'), { recursive: true })
    await mkdir(join(root, 'node_modules/typescript'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{"name":"markpage","type":"module"}')
    await writeFile(join(root, '.gitignore'), 'node_modules/\n')
    await writeFile(join(root, 'packages/core/package.json'), '{}')
    const original = JSON.stringify({ repository: 'https://github.com/panwanke/markpage.git', commit: 'a'.repeat(40) }) + '\n'
    await writeFile(join(plugin, 'engine.json'), original)
    await copyFile(new URL('../scripts/workspace.mjs', import.meta.url), join(plugin, 'scripts/workspace.mjs'))
    execFileSync('git', ['init', '-b', 'main', root], { stdio: 'pipe' })
    execFileSync('git', ['add', '.'], { cwd: root })
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.org', 'commit', '-m', 'fixture'], { cwd: root, stdio: 'pipe' })
    const runner = join(root, 'fail-check.cjs')
    await writeFile(runner, 'console.error("Compatibility check failed intentionally"); process.exit(19)\n')
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_execpath'))
    const result = spawnSync(process.execPath, [join(plugin, 'scripts/workspace.mjs'), 'sync'], {
      cwd: plugin, encoding: 'utf8', env: { ...env, npm_execpath: runner },
    })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Compatibility check failed intentionally')
    expect(await readFile(join(plugin, 'engine.json'), 'utf8')).toBe(original)
  })
})
