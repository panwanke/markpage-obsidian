import { execFileSync } from 'node:child_process'
import { cp, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const plugin = fileURLToPath(new URL('../', import.meta.url))
const lockPath = join(plugin, 'engine.json')
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

export function validateEngine(lock) {
  if (lock.repository !== 'https://github.com/panwanke/markpage.git' || !/^[a-f0-9]{40}$/.test(lock.commit)) {
    throw new Error('Engine must use the MarkPage repository and a full commit SHA')
  }
  return lock
}

export function inside(root, path) {
  const offset = relative(resolve(root), resolve(path))
  return offset === '' || (!isAbsolute(offset) && offset !== '..' && !offset.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`))
}

async function exists(path) {
  return lstat(path).then(() => true, (error) => { if (error.code === 'ENOENT') return false; throw error })
}

function npm(root, args, env = {}) {
  if (!process.env.npm_execpath) throw new Error('Use the documented npm run commands')
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd: root, stdio: 'inherit', env: { ...process.env, ...env },
  })
}

async function attachedRoot() {
  const root = resolve(plugin, '../..')
  if (!await exists(join(root, 'packages/core/package.json'))) return null
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  return pkg.name === 'markpage' && resolve(root, 'apps/obsidian') === resolve(plugin) ? root : null
}

async function sourceInfo() {
  return { sha: git(plugin, ['rev-parse', 'HEAD']), dirty: !!git(plugin, ['status', '--porcelain']) }
}

async function engineCache(lock) {
  const cache = join(plugin, '.markpage')
  const root = join(cache, 'engine')
  await mkdir(cache, { recursive: true })
  if (!inside(await realpath(plugin), await realpath(cache)) || (await lstat(cache)).isSymbolicLink()) throw new Error('Unsafe engine cache path')
  const marker = join(cache, 'context.json')
  if (!await exists(join(root, '.git'))) {
    execFileSync('git', ['clone', '--no-checkout', '--filter=blob:none', lock.repository, root], { stdio: 'inherit' })
    await writeFile(marker, JSON.stringify({ kind: 'markpage-generated-engine-v1', root: await realpath(root) }) + '\n')
  }
  const ownership = JSON.parse(await readFile(marker, 'utf8'))
  if (ownership.kind !== 'markpage-generated-engine-v1' || ownership.root !== await realpath(root)
    || (await lstat(root)).isSymbolicLink() || await realpath(git(root, ['rev-parse', '--show-toplevel'])) !== await realpath(root)) {
    throw new Error('Engine checkout is not an owned disposable build context')
  }
  if (git(root, ['remote', 'get-url', 'origin']) !== lock.repository) throw new Error('Unexpected engine cache remote')
  return root
}

async function scratchRoot(lock) {
  const root = await engineCache(lock)
  try { git(root, ['cat-file', '-e', `${lock.commit}^{commit}`]) }
  catch { git(root, ['fetch', 'origin', lock.commit]) }
  git(root, ['checkout', '--detach', '--force', lock.commit])
  // Replace only our disposable overlay, after checking its physical location.
  const target = join(root, 'apps/obsidian')
  if (await exists(target)) {
    const physicalRoot = await realpath(root)
    const physicalTarget = await realpath(target)
    if (!inside(physicalRoot, physicalTarget) || physicalRoot === physicalTarget || (await lstat(target)).isSymbolicLink()) {
      throw new Error('Unsafe engine overlay cleanup path')
    }
    await rm(target, { recursive: true })
  }
  await mkdir(target, { recursive: true })
  for (const name of ['src', 'test', 'scripts', 'preview', 'fixtures', 'package.json', 'engine.json', 'manifest.json',
    'versions.json', 'tsconfig.json', 'build.mjs', 'validate-artifact.mjs', 'install.mjs', 'prepare.mjs', 'LICENSE']) {
    await cp(join(plugin, name), join(target, name), { recursive: true })
  }
  await writeFile(join(target, '.build-source.json'), JSON.stringify(await sourceInfo()) + '\n')
  npm(root, ['ci'])
  return root
}

async function resolveRef(root, ref) {
  if (root) {
    const commit = git(root, ['rev-parse', '--verify', '--end-of-options', `${ref ?? 'HEAD'}^{commit}`])
    if (git(root, ['status', '--porcelain', '--', 'packages', 'package.json', 'package-lock.json'])) {
      throw new Error('Commit shared engine and lockfile changes before syncing the engine pin')
    }
    return commit
  }
  const lock = validateEngine(JSON.parse(await readFile(lockPath, 'utf8')))
  // Ask Git to resolve branches/tags, then require the resolved object to be a commit.
  const cache = await engineCache(lock)
  git(cache, ['fetch', '--', 'origin', ref ?? 'main'])
  return git(cache, ['rev-parse', '--verify', 'FETCH_HEAD^{commit}'])
}

async function main() {
  const [action = 'check', ...args] = process.argv.slice(2)
  if (!['setup', 'build', 'check', 'prepare', 'install', 'sync'].includes(action)) throw new Error(`Unknown action: ${action}`)
  const original = validateEngine(JSON.parse(await readFile(lockPath, 'utf8')))
  const attached = await attachedRoot()
  const lock = action === 'sync' ? validateEngine({ ...original, commit: await resolveRef(attached, args[0]) }) : original
  // Explicit refs are checked in the pinned scratch context; attached development uses current shared sources.
  const root = attached && !(action === 'sync' && args[0] && lock.commit !== git(attached, ['rev-parse', 'HEAD']))
    ? attached : await scratchRoot(lock)
  if (attached && !await exists(join(root, 'node_modules/typescript'))) npm(root, ['ci'])
  const target = join(root, 'apps/obsidian')
  if (action === 'setup') {
    console.log(`Engine context ready: ${root}\nEngine: ${git(root, ['rev-parse', 'HEAD'])}`)
    return
  }
  const contextLock = join(target, 'engine.json')
  const contextPrevious = await readFile(contextLock, 'utf8')
  if (action === 'sync') await writeFile(contextLock, JSON.stringify(lock, null, 2) + '\n')
  if (action === 'sync' && root !== attached && lock.commit !== original.commit) {
    await writeFile(join(target, '.build-source.json'), JSON.stringify({ ...await sourceInfo(), dirty: true }) + '\n')
  }
  try {
    if (action === 'check' || action === 'sync') {
      npm(root, ['run', 'lint'])
      npm(root, ['run', 'validate:architecture'])
      npm(root, ['run', 'typecheck'])
      npm(root, ['test'])
    }
    npm(root, ['run', 'build:obsidian'])
    if (root !== attached) await cp(join(target, 'dist'), join(plugin, 'dist'), { recursive: true })
    if (action === 'prepare' || action === 'install') {
      execFileSync(process.execPath, [join(target, `${action}.mjs`), ...args], {
        cwd: root, stdio: 'inherit', env: { ...process.env, MARKPAGE_TEST_VAULT_ROOT: join(plugin, 'validation-results') },
      })
    }
    if (action === 'sync') {
      await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n')
      console.log(`Engine sync PASS: ${lock.commit}\nReview engine.json, commit/push the plugin, then update the parent submodule pointer.`)
    }
  } catch (error) {
    if (action === 'sync') await writeFile(contextLock, contextPrevious)
    throw error
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
