import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin as EsbuildPlugin } from 'esbuild'
import type { Plugin } from 'vite'

export type PackageExportEntry =
  | string
  | {
      browser?: string
      development?: string
      source?: string
      import?: string
      default?: string
      types?: string
      require?: string
    }

export type ResolvePackageExportOptions = {
  preferBrowser?: boolean
  preferDevelopment?: boolean
  /** @deprecated Default resolution already prefers `source` when present. */
  preferSource?: boolean
  /** Prefer `import` / `default` over `source` (e.g. when validating published dist). */
  preferBuilt?: boolean
}

export type PackageExportResolveTarget = {
  packageName: string
  packageRoot: string
  resolve?: ResolvePackageExportOptions
}

export type PackageExportResolvePluginOptions = {
  skipSpecifiers?: ReadonlySet<string>
  name?: string
}

function readExports(packageRoot: string): Record<string, PackageExportEntry> {
  const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
    exports?: Record<string, PackageExportEntry>
  }
  return pkg.exports ?? {}
}

export function pickPackageExportTarget(
  entry: PackageExportEntry,
  options: ResolvePackageExportOptions = {},
): string | null {
  if (typeof entry === 'string') return entry
  if (options.preferBrowser && entry.browser) return entry.browser
  if (options.preferDevelopment && entry.development) return entry.development
  if (options.preferSource && entry.source) return entry.source
  if (options.preferBuilt) {
    return entry.import ?? entry.default ?? entry.types ?? entry.source ?? entry.require ?? null
  }
  if (entry.source) return entry.source
  if (entry.development) return entry.development
  return entry.import ?? entry.default ?? entry.types ?? entry.require ?? null
}

function exportMapKey(packageName: string, specifier: string): string | null {
  if (specifier === packageName) return '.'
  if (!specifier.startsWith(`${packageName}/`)) return null
  return `.${specifier.slice(packageName.length)}`
}

function lookupExportEntry(
  exports: Record<string, PackageExportEntry>,
  subpathKey: string,
): PackageExportEntry | undefined {
  const direct = exports[subpathKey]
  if (direct !== undefined) return direct

  for (const [pattern, entry] of Object.entries(exports)) {
    if (!pattern.endsWith('/*')) continue
    const prefix = pattern.slice(0, -1)
    if (!subpathKey.startsWith(prefix)) continue
    const suffix = subpathKey.slice(prefix.length)
    if (!suffix || suffix.includes('/')) continue
    if (typeof entry === 'string') {
      return entry.includes('*') ? entry.replace(/\*/g, suffix) : entry
    }
    return entry
  }

  return undefined
}

export function resolvePackageExport(
  target: PackageExportResolveTarget,
  specifier: string,
  skipSpecifiers?: ReadonlySet<string>,
): string | null {
  if (skipSpecifiers?.has(specifier)) return null
  const subpathKey = exportMapKey(target.packageName, specifier)
  if (!subpathKey) return null

  const entry = lookupExportEntry(readExports(target.packageRoot), subpathKey)
  if (!entry) return null

  const rel = pickPackageExportTarget(entry, target.resolve ?? {})
  if (!rel || typeof rel !== 'string') return null
  return join(target.packageRoot, rel.replace(/^\.\//, ''))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function packageExportResolvePlugin(
  targets: PackageExportResolveTarget[],
  options: PackageExportResolvePluginOptions = {},
): Plugin {
  const skip = options.skipSpecifiers
  const byPrefix = [...targets].sort((a, b) => b.packageName.length - a.packageName.length)
  return {
    name: options.name ?? 'vite-resolver-package-exports',
    enforce: 'pre',
    resolveId(source) {
      for (const target of byPrefix) {
        const resolved = resolvePackageExport(target, source, skip)
        if (resolved) return resolved
      }
      return null
    },
  }
}

export function packageExportEsbuildResolvePlugin(
  targets: PackageExportResolveTarget[],
  options: PackageExportResolvePluginOptions = {},
): EsbuildPlugin {
  const skip = options.skipSpecifiers
  const patterns = targets.map((t) => `^${escapeRegExp(t.packageName)}(\\/|$)`)
  const combined = new RegExp(patterns.join('|'))
  return {
    name: options.name ?? 'vite-resolver-package-exports-esbuild',
    setup(build) {
      build.onResolve({ filter: combined }, (args) => {
        for (const target of targets) {
          const path = resolvePackageExport(target, args.path, skip)
          if (path) return { path }
        }
        return null
      })
    },
  }
}