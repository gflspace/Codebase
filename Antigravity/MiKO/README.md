# MiKO - PCE Environment

This workspace follows the **Planning-Coordination-Execution (PCE)** operating model.

## Structure

```
workspace/
├─ planning/        # Workflow definitions (markdown)
├─ execution/       # Deterministic execution scripts
├─ tests/           # Validation (add when deploying)
├─ scratch/         # Temporary files (never commit)
├─ history.md       # Error learnings & patterns
├─ MiKO_PCE.md      # Master PCE SOP document
├─ requirements.txt # Python dependencies
├─ .env.example     # Environment variables template
└─ .gitignore       # Git ignore rules
```

## Quick Start

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Read the PCE SOP:**
   - See `MiKO_PCE.md` for the complete operating model

## Principles

- **Planning**: Define intent in `planning/` (markdown)
- **Coordination**: AI reads plans and orchestrates execution
- **Execution**: Deterministic scripts in `execution/` (Python)

## Documentation

- `MiKO_PCE.md` - Master SOP document
- `history.md` - Error learnings and patterns
