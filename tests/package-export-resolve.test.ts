import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { resolvePackageExport } from '../src/package-export-resolve'

describe('resolvePackageExport', () => {
  it('reads subpath from package.json exports', () => {
    const root = mkdtempSync(join(tmpdir(), 'vite-resolver-export-'))
    mkdirSync(join(root, 'dist'), { recursive: true })
    writeFileSync(join(root, 'dist', 'entry.js'), 'export {}')
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: '@my-org/pkg',
        exports: {
          '.': './dist/entry.js',
          './widget': { import: './dist/entry.js' },
        },
      }),
    )

    expect(
      resolvePackageExport(
        { packageName: '@my-org/pkg', packageRoot: root },
        '@my-org/pkg/widget',
      ),
    ).toBe(resolve(root, 'dist/entry.js'))
  })

  it('honors skipSpecifiers', () => {
    const root = mkdtempSync(join(tmpdir(), 'vite-resolver-skip-'))
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: '@my-org/pkg', exports: { '.': './index.js' } }),
    )
    writeFileSync(join(root, 'index.js'), '')

    expect(
      resolvePackageExport(
        { packageName: '@my-org/pkg', packageRoot: root },
        '@my-org/pkg',
        new Set(['@my-org/pkg']),
      ),
    ).toBeNull()
  })
})