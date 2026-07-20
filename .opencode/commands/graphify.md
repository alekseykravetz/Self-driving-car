---
description: Rebuild the graphify knowledge graph from the current codebase
agent: build
---

Run `graphify update .` from the project root to rebuild the `graphify-out/` knowledge graph. This re-indexes all `ts/` source (per `.graphifyignore`). Use after code changes outside the task lifecycle, or when graphify query results look stale.
