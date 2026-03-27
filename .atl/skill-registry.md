# Skill Registry — gymbro

Generated: 2026-03-27
Persistence: engram

## User Skills

| Skill | Trigger |
|-------|---------|
| branch-pr | When creating a pull request, opening a PR, or preparing changes for review |
| go-testing | When writing Go tests, using teatest, or adding test coverage |
| issue-creation | When creating a GitHub issue, reporting a bug, or requesting a feature |
| judgment-day | When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" |
| skill-creator | When user asks to create a new skill, add agent instructions, or document patterns for AI |

## Project Conventions

No project-level CLAUDE.md, AGENTS.md, or .cursorrules found.

## Compact Rules

### branch-pr
- Follow issue-first enforcement: every PR must reference an existing GitHub issue
- Use `gh pr create` with structured body: Summary bullets + Test plan checklist
- PR title: under 70 chars, imperative mood

### issue-creation
- Use `gh issue create` with structured body
- Bug reports: include reproduction steps, expected vs actual behavior
- Feature requests: include motivation and acceptance criteria

### judgment-day
- Launch TWO independent blind judge sub-agents simultaneously
- Synthesize findings, apply fixes, re-judge until both pass or escalate after 2 iterations

### skill-creator
- Follow Agent Skills spec in ~/.claude/skills/skill-creator/SKILL.md
- New skills go in ~/.claude/skills/{skill-name}/SKILL.md
