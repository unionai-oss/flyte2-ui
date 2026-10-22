/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import MonacoEditor, { loader } from '@monaco-editor/react'

// Use the locally generated assets, which replace Monaco's embedded DOMPurify
// with our patched dependency. The loader's default CDN bypasses that fix.
loader.config({ paths: { vs: '/v2/monaco/vs' } })

export default MonacoEditor
