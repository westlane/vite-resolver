# Adoption and repo cleanup

Use **`@westlane/vite-resolver`** anywhere Yarn **`portal:`** / **`link:`** pulls scoped packages into a consumer that is **not** a single workspace root (sibling checkouts under org-named folders).

## Replace these patterns

| Remove | Use instead |
|--------|-------------|
| `vitestExactAlias('@scope/pkg', path.join(sibling, 'src/...'))` | `discoverPortaledPackageExportTargets` + `resolveByPackage` |
| Long `resolve.alias` lists for portal scopes | Same plugin in Vite **and** Vitest |
| Custom `resolveId` reading `package.json` `exports` | `resolvePackageExport` / upstream PR |
| `build*ResolveAliases()` scanning every subpath | Discovery + owning package `exports` |
| Vitest-only alias fork (different from Vite) | Identical `targets` in both configs |

## Keep in the app (not vite-resolver)

- `@/` and other in-repo path aliases
- Framework dedupe (`vue`, etc.)
- One-off specifiers (`skipSpecifiers`) owned by the product
- Transitive SDK paths the app does not declare (small dedicated module)
- Trustbase / other SDK bases that are not portal export maps

## Rollout order (per repo)

1. Add dependency (`portal` or registry) and `yarn build` in `vite-resolver`.
2. Wire Vite + `optimizeDeps.esbuildOptions.plugins` + `preserveSymlinks: true`.
3. Wire Vitest with the **same** target list.
4. Delete scoped aliases that only duplicated `exports`.
5. Shrink grandfathered alias files; grep `resolveId`, `vitestExactAlias`, `paths`.
6. Fix missing `exports` upstream — do not add new consumer aliases.

## Thin consumer module

Each app keeps one small file with **policy only**:

- `scopePattern`
- `resolveByPackage` (e.g. `preferBrowser`, `preferDevelopment`)
- `skipSpecifiers`
- optional `extraTargets`

No fork of `resolvePackageExport` logic.