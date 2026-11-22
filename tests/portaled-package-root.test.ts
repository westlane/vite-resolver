import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  consumerOrgFolderName,
  parseScopedPackageName,
  resolvePackageRootFromOrgLayout,
} from '../src/portaled-package-root'

const tempRoots: string[] = []

afterEach(() => {
  tempRoots.length = 0
})

function fixtureTree() {
  const root = mkdtempSync(join(tmpdir(), 'vite-resolver-'))
  tempRoots.push(root)
  const workspace = join(root, 'workspace')
  const appRoot = join(workspace, 'my-org', 'my-app')
  const samePkg = join(workspace, 'my-org', 'shared-lib')
  const otherPkg = join(workspace, 'other-org', 'maps')
  const nestedPkg = join(workspace, 'other-org', 'mono', 'packages', 'maps')

  for (const dir of [appRoot, samePkg, otherPkg, nestedPkg]) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'stub' }))
  }

  return { appRoot, samePkg, otherPkg, nestedPkg }
}

describe('parseScopedPackageName', () => {
  it('splits scope and short name', () => {
    expect(parseScopedPackageName('@my-org/shared-lib')).toEqual({
      scope: 'my-org',
      shortName: 'shared-lib',
    })
  })
})

describe('resolvePackageRootFromOrgLayout', () => {
  it('resolves same-scope sibling one level up', () => {
    const { appRoot, samePkg } = fixtureTree()
    expect(consumerOrgFolderName(appRoot)).toBe('my-org')
    expect(resolvePackageRootFromOrgLayout(appRoot, '@my-org/shared-lib')).toBe(resolve(samePkg))
  })

  it('resolves cross-scope via ../../{scope}/{shortName}', () => {
    const { appRoot, otherPkg } = fixtureTree()
    expect(resolvePackageRootFromOrgLayout(appRoot, '@other-org/maps')).toBe(resolve(otherPkg))
  })

  it('resolves packages/{shortName} under a cross-scope repo directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'vite-resolver-nested-'))
    const appRoot = join(root, 'workspace', 'my-org', 'my-app')
    const nested = join(root, 'workspace', 'other-org', 'maps', 'packages', 'maps')
    mkdirSync(appRoot, { recursive: true })
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(appRoot, 'package.json'), '{}')
    writeFileSync(join(nested, 'package.json'), '{}')
    expect(resolvePackageRootFromOrgLayout(appRoot, '@other-org/maps')).toBe(resolve(nested))
  })
})