import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

export type ListPortaledPackagesOptions = {
  /** Match scoped package names from root package.json (default: any @scope/pkg). */
  scopePattern?: RegExp
}

/** `@scope/pkg` — sibling checkouts often sit under directories named like the scope (`my-org/`, `other-org/`). */
export function parseScopedPackageName(
  packageName: string,
): { scope: string; shortName: string } | null {
  const match = packageName.match(/^@([^/]+)\/([^/]+)$/)
  if (!match) return null
  return { scope: match[1], shortName: match[2] }
}

/** Parent folder of the consuming repo (e.g. `…/my-org/my-app` → `my-org`). */
export function consumerOrgFolderName(repoRoot: string): string {
  return basename(resolve(repoRoot, '..'))
}

/**
 * Sibling checkout without Yarn metadata:
 * - same org folder as consumer → `../shortName`
 * - other org → `../../{scope}/shortName`
 */
export function resolvePackageRootFromOrgLayout(repoRoot: string, packageName: string): string | null {
  const parsed = parseScopedPackageName(packageName)
  if (!parsed) return null

  const { scope, shortName } = parsed
  const sameOrg = resolve(repoRoot, '..', shortName)
  if (consumerOrgFolderName(repoRoot) === scope && existsSync(resolve(sameOrg, 'package.json'))) {
    return sameOrg
  }

  const crossOrg = resolve(repoRoot, '../..', scope, shortName)
  if (existsSync(resolve(crossOrg, 'package.json'))) {
    return crossOrg
  }

  const nested = resolve(crossOrg, 'packages', shortName)
  if (existsSync(resolve(nested, 'package.json'))) {
    return nested
  }

  return null
}

/** Top-level install + realpath (follows Yarn `portal:` / `link:`). */
export function resolvePackageRootFromNodeModules(repoRoot: string, packageName: string): string | null {
  const pkgJson = resolve(repoRoot, 'node_modules', packageName, 'package.json')
  if (!existsSync(pkgJson)) return null
  try {
    return dirname(realpathSync(pkgJson))
  } catch {
    return dirname(pkgJson)
  }
}

export function resolvePortaledPackageRoot(repoRoot: string, packageName: string): string | null {
  return (
    resolvePackageRootFromNodeModules(repoRoot, packageName) ??
    resolvePackageRootFromOrgLayout(repoRoot, packageName)
  )
}

const DEFAULT_SCOPE_PATTERN = /^@[^/]+\/[^/]+$/u

export function listPortaledScopedPackageNames(
  repoRoot: string,
  options: ListPortaledPackagesOptions = {},
): string[] {
  const pattern = options.scopePattern ?? DEFAULT_SCOPE_PATTERN
  const names = new Set<string>()
  const rootPkgPath = resolve(repoRoot, 'package.json')
  if (!existsSync(rootPkgPath)) return []

  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8')) as {
    resolutions?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  for (const key of Object.keys(rootPkg.resolutions ?? {})) {
    if (pattern.test(key)) names.add(key)
  }
  for (const block of [rootPkg.dependencies, rootPkg.devDependencies]) {
    for (const key of Object.keys(block ?? {})) {
      if (pattern.test(key)) names.add(key)
    }
  }

  return [...names].sort()
}