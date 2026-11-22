# @westlane/vite-resolver

Vite and `optimizeDeps` esbuild hooks that resolve **portaled** dependencies through each package’s `package.json` `exports`, using the **canonical** install root instead of nested copies under another package’s `node_modules`.

## Sibling checkout layout

Repos are grouped under directories named after the npm **scope** (without `@`):

| Relationship | Resolved path |
|--------------|----------------|
| Same scope as consumer | `../{package-short-name}` |
| Different scope | `../../{scope}/{package-short-name}` |
| Monorepo publish root | `../../{scope}/{repo}/packages/{shortName}` |

Also: top-level `node_modules/@scope/pkg` via `realpath` (Yarn `portal:` / `link:`).

## Usage

```ts
import {
  discoverPortaledPackageExportTargets,
  packageExportEsbuildResolvePlugin,
  packageExportResolvePlugin,
} from '@westlane/vite-resolver'

const repoRoot = process.cwd()
const skipSpecifiers = new Set(['@my-org/design-system/theme-override'])

const targets = discoverPortaledPackageExportTargets(repoRoot, {
  scopePattern: /^@my-org\//,
  resolveByPackage: {
    '@my-org/runtime': { preferBrowser: true },
    '@my-org/design-system': { preferDevelopment: true },
  },
})

export default {
  plugins: [packageExportResolvePlugin(targets, { skipSpecifiers })],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [packageExportEsbuildResolvePlugin(targets, { skipSpecifiers })],
    },
  },
}
```

## API

- Default pick order (after `preferBrowser` / `preferDevelopment`): **`source` → `import` → `default`** when the export map lists them (portal sibling dev).
- `preferBuilt: true` on a target restores **dist-first** resolution for tests or production checks.
- `resolvePackageExport(target, specifier, skipSpecifiers?)`
- `packageExportResolvePlugin(targets, options?)`
- `packageExportEsbuildResolvePlugin(targets, options?)`
- `discoverPortaledPackageExportTargets(repoRoot, options?)`
- `resolvePortaledPackageRoot(repoRoot, packageName)` — root path only