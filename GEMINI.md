# Tinapple Project Instructions & Guidelines

## Privilege Elevation & Root Access
- When an operation requires root or administrative privileges (such as managing system services, editing system-level files, or installing system packages):
  - Use Polkit via `pkexec` (e.g., `pkexec <command>`) rather than assuming passwordless `sudo` or unattended privilege escalation.
  - Inform the user beforehand about which command requires elevated permissions and why, so they can review the action and authorize it via the Polkit authentication prompt.

## Codebase Analysis & Graph Mapping (Graphify)
- Always use `graphify` in every prompt/workflow to properly map, navigate, and analyze the codebase architecture, dependencies, and subsystem relationships.
- Use `graphify .` or `graphify <path>` to build or inspect the knowledge graph before making major architectural changes or when analyzing unfamiliar modules.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
