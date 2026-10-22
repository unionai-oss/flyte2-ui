/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { parse } from 'acorn'
import { transform } from 'esbuild'
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const licensePattern = /\/\*! @license DOMPurify (\d+\.\d+\.\d+)\b[^]*?\*\//g
const parseOptions = { ecmaVersion: 'latest', sourceType: 'module' }

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  visit(node)
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit))
    else if (value && typeof value === 'object') walk(value, visit)
  }
}

function singleLicense(source) {
  const licenses = [...source.matchAll(licensePattern)]
  if (licenses.length !== 1) {
    throw new Error(`Expected one DOMPurify license; found ${licenses.length}`)
  }
  return licenses[0]
}

function purifierBody(source) {
  const ast = parse(source, parseOptions)
  const exports = ast.body.filter((node) => node.type.startsWith('Export'))
  const declaration = exports[0]
  const specifier = declaration?.specifiers?.[0]
  if (
    ast.body.some((node) => node.type === 'ImportDeclaration') ||
    exports.length !== 1 ||
    declaration.type !== 'ExportNamedDeclaration' ||
    declaration.source ||
    declaration.declaration ||
    declaration.specifiers.length !== 1 ||
    specifier.exported.name !== 'default' ||
    specifier.local.type !== 'Identifier'
  ) {
    throw new Error(
      'Unexpected DOMPurify module: expected only a named default export and no imports',
    )
  }
  return {
    code: (
      source.slice(0, declaration.start) + source.slice(declaration.end)
    ).replace(/^\/\/# sourceMappingURL=.*$/gm, ''),
    binding: specifier.local.name,
  }
}

/**
 * Monaco bundles DOMPurify into its AMD editor chunk; an npm override cannot
 * update that copy. Replace only that vendor's statements, retaining Monaco's
 * existing binding and all surrounding code. Parse the scope and factory call
 * so changes to minified variable names cannot silently break the replacement.
 */
export async function patchMonacoBundle(source, dompurifySource) {
  const embeddedLicense = singleLicense(source)
  const replacementLicense = singleLicense(dompurifySource)
  // Monaco upgrades need an explicit review of its vendor boundary and API use.
  if (embeddedLicense[1] !== '3.2.7') {
    throw new Error(
      `Unexpected embedded DOMPurify ${embeddedLicense[1]}; review the Monaco upgrade`,
    )
  }
  const [major, minor, patch] = replacementLicense[1].split('.').map(Number)
  if (major !== 3 || minor < 4 || (minor === 4 && patch < 17)) {
    throw new Error(
      `DOMPurify ${replacementLicense[1]} is older than the required 3.4.17`,
    )
  }

  const ast = parse(source, parseOptions)
  const start = embeddedLicense.index
  let scope
  walk(ast, (node) => {
    if (
      node.type === 'BlockStatement' &&
      node.start < start &&
      node.end > start
    )
      scope = node
  })
  if (!scope)
    throw new Error('Expected DOMPurify inside Monaco AMD module scope')
  const vendorStatements = scope.body.filter((node) => node.start > start)
  const factories = vendorStatements.filter((node) => {
    if (node.type !== 'FunctionDeclaration') return false
    let assignsVersion = false
    walk(node.body, (child) => {
      if (
        child.type === 'AssignmentExpression' &&
        child.operator === '=' &&
        child.left.type === 'MemberExpression' &&
        !child.left.computed &&
        child.left.property.name === 'version' &&
        child.right.type === 'Literal' &&
        child.right.value === embeddedLicense[1]
      ) {
        assignsVersion = true
      }
    })
    return assignsVersion
  })
  if (factories.length !== 1) {
    throw new Error(`Expected one DOMPurify factory; found ${factories.length}`)
  }
  const factory = factories[0]
  const factoryIndex = scope.body.indexOf(factory)
  const declaration = scope.body[factoryIndex + 1]
  const binding = declaration?.declarations?.[0]
  if (
    declaration?.type !== 'VariableDeclaration' ||
    declaration.declarations.length !== 1 ||
    binding.id.type !== 'Identifier' ||
    binding.init?.type !== 'CallExpression' ||
    binding.init.callee.type !== 'Identifier' ||
    binding.init.callee.name !== factory.id.name ||
    binding.init.arguments.length !== 0 ||
    source.slice(factory.end, declaration.start).trim() !== ''
  ) {
    throw new Error(
      'Expected DOMPurify factory to be followed immediately by its single instance declaration',
    )
  }

  const replacement = purifierBody(dompurifySource)
  const compiled = await transform(
    `(() => {\n${replacement.code}\nreturn ${replacement.binding};\n})()`,
    {
      minify: true,
      legalComments: 'inline',
      target: 'es2020',
      charset: 'utf8',
    },
  )
  const code =
    source.slice(0, start) +
    `var ${binding.id.name}=${compiled.code.trim().replace(/;$/, '')};` +
    source.slice(declaration.end)
  if (singleLicense(code)[1] !== replacementLicense[1]) {
    throw new Error(
      'Generated Monaco bundle does not contain the patched DOMPurify license',
    )
  }
  parse(code, parseOptions)
  return { code, version: replacementLicense[1] }
}

async function javascriptFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await javascriptFiles(filename)))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(filename)
  }
  return files
}

export async function prepareMonaco({
  sourceRoot,
  outputRoot,
  dompurifySource,
}) {
  const patches = []
  for (const filename of await javascriptFiles(sourceRoot)) {
    const source = await readFile(filename, 'utf8')
    if (!source.includes('/*! @license DOMPurify')) continue
    patches.push({
      filename: path.relative(sourceRoot, filename),
      ...(await patchMonacoBundle(source, dompurifySource)),
    })
  }
  if (patches.length !== 1) {
    throw new Error(
      `Expected one Monaco chunk with embedded DOMPurify; found ${patches.length}`,
    )
  }

  // Validate before touching output and finish the copy before replacing it.
  await mkdir(path.dirname(outputRoot), { recursive: true })
  const temporary = await mkdtemp(
    path.join(path.dirname(outputRoot), '.monaco-'),
  )
  try {
    await cp(sourceRoot, temporary, { recursive: true })
    for (const patch of patches) {
      await writeFile(path.join(temporary, patch.filename), patch.code)
    }
    await rm(outputRoot, { recursive: true, force: true })
    await rename(temporary, outputRoot)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
  return patches.map(({ filename, version }) => ({ filename, version }))
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const monacoPackage = fileURLToPath(
    import.meta.resolve('monaco-editor/package.json'),
  )
  const dompurifySource = await readFile(
    new URL(import.meta.resolve('dompurify')),
    'utf8',
  )
  const patches = await prepareMonaco({
    sourceRoot: path.join(path.dirname(monacoPackage), 'min/vs'),
    outputRoot: path.join(root, 'public/monaco/vs'),
    dompurifySource,
  })
  for (const { filename, version } of patches) {
    console.log(`Prepared Monaco ${filename} with DOMPurify ${version}`)
  }
}
