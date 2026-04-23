#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const COPYRIGHT_HEADER = `/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

`

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']

function hasExistingHeader(content) {
  const trimmedContent = content.trim()
  return trimmedContent.startsWith('/**') && 
         trimmedContent.includes('© Copyright Union Systems Inc 2026. All rights reserved.')
}

function addHeaderIfMissing(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  
  if (hasExistingHeader(content)) {
    return false // No changes needed
  }
  
  const newContent = COPYRIGHT_HEADER + content
  fs.writeFileSync(filePath, newContent, 'utf8')
  return true // File was modified
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    return output.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

function main() {
  const stagedFiles = getStagedFiles()
  let modifiedFiles = 0
  
  for (const file of stagedFiles) {
    const ext = path.extname(file)
    const fullPath = path.resolve(file)
    
    // Only process TypeScript/JavaScript files in src directory
    if (EXTENSIONS.includes(ext) && file.startsWith('src/') && fs.existsSync(fullPath)) {
      if (addHeaderIfMissing(fullPath)) {
        console.log(`Added copyright header to: ${file}`)
        // Re-stage the modified file
        execSync(`git add "${file}"`)
        modifiedFiles++
      }
    }
  }
  
  if (modifiedFiles > 0) {
    console.log(`\nAdded copyright headers to ${modifiedFiles} file(s)`)
  }
}

main()