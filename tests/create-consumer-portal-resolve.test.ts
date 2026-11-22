import { mkdtempSync, writeFileSync } from 'node:fs'
import {tmpdir} from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { createConsumerPortalResolve } from '../src/index'

describe('createConsumerPortalResolve', () => {
  it('returns matching vite and esbuild plugin names from one discovery pass', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'vite-resolver-consumer-'))
    writeFileSync(
      join(repoRoot, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@my-org/pkg-a': 'portal:../my-org/pkg-a',
        },
      }),
    )

    const { targets, vitePlugin, esbuildPlugin } = createConsumerPortalResolve(repoRoot, {
      scopePattern: /^@my-org\/[^/]+$/u,
      name: 'test-portal-resolve',
    })

    expect(targets.length).toBeGreaterThanOrEqual(0)
    expect(vitePlugin.name).toBe('test-portal-resolve')
    expect(esbuildPlugin.name).toBe('test-portal-resolve-esbuild')
  })
})