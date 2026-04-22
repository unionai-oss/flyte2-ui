/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

// eslint-ignore no-console
import { select } from '@inquirer/prompts'
import { exec, spawn } from 'child_process'
import fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const hosts = ['localhost']

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "${url}"`
        : `xdg-open "${url}"`
  exec(cmd, (err) => {
    if (err) console.error('Failed to open browser:', err.message)
  })
}

// Spawn a subprocess with stdout piped so we can watch for the Next.js ready
// signal and open the browser, while still forwarding all output to the
// terminal. Returns the subprocess.
function spawnAndOpenWhenReady(command, args, env, url) {
  const subprocess = spawn(command, args, {
    env,
    stdio: ['inherit', 'pipe', 'inherit'],
    shell: true,
  })

  let opened = false
  subprocess.stdout.on('data', (data) => {
    process.stdout.write(data)
    if (!opened && /ready/i.test(data.toString())) {
      opened = true
      openBrowser(url)
    }
  })

  subprocess.on('close', (code) => {
    console.log(`Process exited with code ${code}`)
    process.exit(code)
  })

  return subprocess
}

const argv = yargs(hideBin(process.argv))
  .option('host', {
    alias: 'h',
    description: 'Specify the host',
    type: 'string',
  })
  .parse()

async function selectHost() {
  if (argv.host) {
    return argv.host
  }

  return select({
    message: 'choose a host',
    choices: hosts,
  })
}

function validateHost(host) {
  const etcPath = '/etc/hosts'
  try {
    const hostsFileContent = fs.readFileSync(etcPath, 'utf8')
    return hostsFileContent.includes(host)
  } catch (err) {
    console.error(`Error reading ${etcPath}:`, err.message)
    return false
  }
}

const BASE_OPTIONS = {
  PORT: 8080,
  NODE_ENV: 'development',
}
const main = async () => {
  const host = await selectHost()
  if (host === 'localhost') {
    const port = BASE_OPTIONS.PORT
    spawnAndOpenWhenReady(
      'pnpm',
      ['run dev:local'],
      {
        ...process.env,
        ...BASE_OPTIONS,
        NEXT_PUBLIC_ADMIN_API_URL: 'http://localhost:8090',
      },
      `http://localhost:${port}/v2`,
    )
  } else {
    if (!validateHost(host)) {
      console.error(`You must add ${host} host to /etc/hosts`)
      process.exit(0)
    }
    const port = BASE_OPTIONS.PORT
    const localHost = `localhost.${host}`
    console.log(`Running: pnpm`)
    spawnAndOpenWhenReady(
      'pnpm',
      ['gen:ssl && NODE_ENV=development pnpm run dev:next'],
      {
        ...process.env,
        ...BASE_OPTIONS,
        NEXT_PUBLIC_ADMIN_DOMAIN: localHost,
        NEXT_PUBLIC_ADMIN_API_URL: `https://${host}`,
      },
      `https://${localHost}:${port}/v2`,
    )
  }
}
main()
