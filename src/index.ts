export {
  consumerOrgFolderName,
  listPortaledScopedPackageNames,
  parseScopedPackageName,
  resolvePackageRootFromNodeModules,
  resolvePackageRootFromOrgLayout,
  resolvePortaledPackageRoot,
  type ListPortaledPackagesOptions,
} from './portaled-package-root'

export {
  packageExportEsbuildResolvePlugin,
  packageExportResolvePlugin,
  pickPackageExportTarget,
  resolvePackageExport,
  type PackageExportEntry,
  type PackageExportResolvePluginOptions,
  type PackageExportResolveTarget,
  type ResolvePackageExportOptions,
} from './package-export-resolve'

export {
  discoverPortaledPackageExportTargets,
  type DiscoverPortaledPackageTargetsOptions,
} from './discover'

import type { PackageExportResolvePluginOptions } from './package-export-resolve'
import type { DiscoverPortaledPackageTargetsOptions } from './discover'
import {
  discoverPortaledPackageExportTargets,
} from './discover'
import {
  packageExportEsbuildResolvePlugin,
  packageExportResolvePlugin,
  type PackageExportResolveTarget,
} from './package-export-resolve'

export type CreateConsumerPortalResolveOptions = DiscoverPortaledPackageTargetsOptions &
  PackageExportResolvePluginOptions

/** Vite + esbuild plugins and targets from one consumer repo root. */
export function createConsumerPortalResolve(
  repoRoot: string,
  options: CreateConsumerPortalResolveOptions = {},
): {
  targets: PackageExportResolveTarget[]
  vitePlugin: ReturnType<typeof packageExportResolvePlugin>
  esbuildPlugin: ReturnType<typeof packageExportEsbuildResolvePlugin>
} {
  const { skipSpecifiers, name, ...discover } = options
  const targets = discoverPortaledPackageExportTargets(repoRoot, discover)
  return {
    targets,
    vitePlugin: packageExportResolvePlugin(targets, { skipSpecifiers, name }),
    esbuildPlugin: packageExportEsbuildResolvePlugin(targets, {
      skipSpecifiers,
      name: name ? `${name}-esbuild` : undefined,
    }),
  }
}