# Implementations

## Reference Implementation

| Name | Language | Repo |
|------|----------|------|
| Cred | TypeScript / Node.js | [cred-ninja/cred](https://github.com/cred-ninja/cred) |

## Interop Evidence

| Vector set | Source | Cred result |
|------------|--------|-------------|
| draft-asor-wimse-agent-delegation-chain Appendix B (v0.9.0, 20 vectors) | [attenu-io/attenu-guard](https://github.com/attenu-io/attenu-guard) `tests/vectors/` at tag v0.9.0 | 20 of 20, 0 FAIL, 0 GAP at sdk `b1bfec0` (2026-10-07; 18 of 20 at `e92af19`, 17 of 20 at `4a24376` and `ff00421`); see [conformance/asor-delegation-chain](conformance/asor-delegation-chain/README.md) |

## SDKs

| Package | Language | Install |
|---------|----------|---------|
| `@credninja/sdk` | TypeScript | `npm install @credninja/sdk` |
| `cred-auth` | Python | `pip install cred-auth` |
| `@credninja/mcp` | TypeScript (MCP) | `npm install @credninja/mcp` |

---

*To list your implementation, open a pull request updating this file.*
