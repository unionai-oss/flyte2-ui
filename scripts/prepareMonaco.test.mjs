/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { JSDOM } from 'jsdom'
import { patchMonacoBundle, prepareMonaco } from './prepareMonaco.mjs'

const dompurifySource = await readFile(
  new URL(import.meta.resolve('dompurify')),
  'utf8',
)

function fixture({
  factory = 'createVendorSanitizer',
  binding = 'vendorSanitizer',
  version = '3.2.7',
} = {}) {
  return `define(function(exports) {
    const unrelatedBefore = 'before';
    /*! @license DOMPurify ${version} | fixture */
    function ${factory}() { const sanitizer = {}; sanitizer.version = '${version}'; return sanitizer; }
    var ${binding} = ${factory}();
    exports.sanitizer = ${binding};
    exports.unrelated = unrelatedBefore + ':after';
  });`
}

function executeFixture(code, window) {
  const exports = {}
  vm.runInNewContext(code, { window, define: (factory) => factory(exports) })
  return exports
}

test('emitted AMD sanitizer is the patched DOMPurify and still removes executable HTML', async () => {
  const { code, version } = await patchMonacoBundle(fixture(), dompurifySource)
  const { window } = new JSDOM('')
  try {
    const { sanitizer, unrelated } = executeFixture(code, window)
    assert.equal(version, '3.4.17')
    assert.equal(sanitizer.version, version)
    assert.equal(sanitizer.isSupported, true)
    assert.equal(unrelated, 'before:after')
    const clean = sanitizer.sanitize(
      '<img src=x onerror="alert(1)"><a href="javascript:alert(1)">link</a><svg onload="alert(1)"></svg><b>safe</b>',
    )
    assert.doesNotMatch(clean, /onerror|onload|javascript:/i)
    assert.match(clean, /<b>safe<\/b>/)

    // GHSA-mrv2-3pqr-j5jr: removing a parent in a hook must not leave an
    // executable subtree available to application code that retained it.
    const root = window.document.createElement('div')
    root.innerHTML =
      '<div><span id="remove-parent"></span><img src=x onerror="alert(1)"></div>'
    let detached
    sanitizer.addHook('uponSanitizeElement', (node) => {
      if (node.id === 'remove-parent') {
        detached = node.parentNode
        detached.remove()
      }
    })
    sanitizer.sanitize(root, { IN_PLACE: true })
    assert.ok(detached)
    assert.doesNotMatch(detached.outerHTML, /onerror/i)
  } finally {
    window.close()
  }
})

test('replacement follows AST bindings when the bundler changes minified names', async () => {
  const { code } = await patchMonacoBundle(
    fixture({ factory: 'a', binding: '$b' }),
    dompurifySource,
  )
  const { window } = new JSDOM('')
  try {
    const { sanitizer, unrelated } = executeFixture(code, window)
    assert.equal(sanitizer.version, '3.4.17')
    assert.equal(unrelated, 'before:after')
  } finally {
    window.close()
  }
})

test('the installed Monaco chunk is patched while preserving its AMD identity', async () => {
  const packageRoot = path.dirname(
    fileURLToPath(import.meta.resolve('monaco-editor/package.json')),
  )
  const files = await readdir(path.join(packageRoot, 'min/vs'))
  const editorChunk = files.find((filename) =>
    /^editor\.api-.+\.js$/.test(filename),
  )
  assert.ok(editorChunk)
  const source = await readFile(
    path.join(packageRoot, 'min/vs', editorChunk),
    'utf8',
  )
  const { code } = await patchMonacoBundle(source, dompurifySource)
  assert.equal(code.slice(0, 200), source.slice(0, 200))
  assert.equal(code.slice(-200), source.slice(-200))
  assert.equal([...code.matchAll(/DOMPurify (\d+\.\d+\.\d+)/g)].length, 1)
  assert.match(code, /DOMPurify 3\.4\.17/)
  assert.doesNotMatch(code, /DOMPurify 3\.2\.7/)
})

test('missing or duplicated vendor markers fail closed', async () => {
  await assert.rejects(
    patchMonacoBundle('define(function() {});', dompurifySource),
    /one DOMPurify license/,
  )
  await assert.rejects(
    patchMonacoBundle(fixture() + fixture(), dompurifySource),
    /one DOMPurify license/,
  )
})

test('unexpected vendor versions and changed factory boundaries fail closed', async () => {
  await assert.rejects(
    patchMonacoBundle(fixture({ version: '3.4.15' }), dompurifySource),
    /review the Monaco upgrade/,
  )
  const changed = fixture().replace(
    'var vendorSanitizer',
    'exports.unrelatedInterleaving = true; var vendorSanitizer',
  )
  await assert.rejects(
    patchMonacoBundle(changed, dompurifySource),
    /followed immediately/,
  )
})

test('a vulnerable replacement dependency fails closed', async () => {
  await assert.rejects(
    patchMonacoBundle(
      fixture(),
      dompurifySource.replaceAll('3.4.17', '3.4.16'),
    ),
    /older than the required 3\.4\.17/,
  )
})

test('asset generation copies other files and validates before replacing existing output', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'flyte-monaco-test-'))
  try {
    const sourceRoot = path.join(directory, 'source')
    const outputRoot = path.join(directory, 'output')
    await mkdir(sourceRoot)
    await writeFile(path.join(sourceRoot, 'editor.js'), fixture())
    await writeFile(
      path.join(sourceRoot, 'editor.css'),
      '.editor { color: red }',
    )
    const patches = await prepareMonaco({
      sourceRoot,
      outputRoot,
      dompurifySource,
    })
    assert.deepEqual(patches, [{ filename: 'editor.js', version: '3.4.17' }])
    assert.equal(
      await readFile(path.join(outputRoot, 'editor.css'), 'utf8'),
      '.editor { color: red }',
    )
    const generated = await readFile(path.join(outputRoot, 'editor.js'), 'utf8')
    assert.match(generated, /DOMPurify 3\.4\.17/)
    await writeFile(
      path.join(sourceRoot, 'editor.js'),
      'unexpected vendor format',
    )
    await assert.rejects(
      prepareMonaco({ sourceRoot, outputRoot, dompurifySource }),
      /Expected one Monaco chunk/,
    )
    assert.equal(
      await readFile(path.join(outputRoot, 'editor.js'), 'utf8'),
      generated,
    )
    assert.deepEqual((await readdir(directory)).sort(), ['output', 'source'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
