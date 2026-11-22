import type { ResolvePackageExportOptions } from './package-export-resolve'
import type { PackageExportResolveTarget } from './package-export-resolve'
import {
  listPortaledScopedPackageNames,
  resolvePortaledPackageRoot,
  type ListPortaledPackagesOptions,
} from './portaled-package-root'

export type DiscoverPortaledPackageTargetsOptions = ListPortaledPackagesOptions & {
  /** Per-package export condition preferences. */
  resolveByPackage?: Record<string, ResolvePackageExportOptions>
  /** Extra explicit targets (e.g. manual roots when not in package.json). */
  extraTargets?: PackageExportResolveTarget[]
}

/** Build Vite plugin targets from consumer root package.json + org-folder layout. */
export function discoverPortaledPackageExportTargets(
  repoRoot: string,
  options: DiscoverPortaledPackageTargetsOptions = {},
): PackageExportResolveTarget[] {
  const targets: PackageExportResolveTarget[] = [...(options.extraTargets ?? [])]

  for (const packageName of listPortaledScopedPackageNames(repoRoot, options)) {
    const packageRoot = resolvePortaledPackageRoot(repoRoot, packageName)
    if (!packageRoot) continue
    targets.push({
      packageName,
      packageRoot,
      resolve: options.resolveByPackage?.[packageName],
    })
  }

  return targets.sort((a, b) => b.packageName.length - a.packageName.length)
}