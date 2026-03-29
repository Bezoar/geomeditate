# General

When adding, modifying or removing any source code, ALWAYS follow the instructions in docs/instructions/coding.md.
When interacting with Github at all, ALWAYS follow the instructions in docs/instructions/github.md.
When attributing failures to sandbox restrictions, you MUST document the specific technical failure that occurred that justifies your comment. Otherwise, do not assume that the sandbox is the reason for a failure.
When generating new documents, unless specified otherwise, put them into the docs/generated directory.

Ignore all files in the `archive` subfolder, they are no longer relevant.

# Test Apps

Each directory under `test-apps/` is a self-contained prototype with its own tooling, dependencies, and build system. They are throwaway experiments to prove technology choices and MUST NOT be integrated into or depended on by the eventual game product. Technology stacks may differ between test apps and may change at any time.

## Active Technologies
- TypeScript 5.x (strict mode) + Vite 6.x (build/dev server), no UI framework (002-hex-grid-test-mechanics)
- N/A (all state in memory; test grids hardcoded in source) (002-hex-grid-test-mechanics)

## Recent Changes
- 002-hex-grid-test-mechanics: Added TypeScript 5.x (strict mode) + Vite 6.x (build/dev server), no UI framework
