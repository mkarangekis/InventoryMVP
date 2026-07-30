# Decision 0002: Preserve Product AI; Isolate Operations AI

Status: accepted for local implementation

## Context

Existing product features use Anthropic directly or through `src/ai`. The
master specification requires new generative Operations Center reasoning to
use a server-side OpenAI abstraction and explicitly says not to break an
existing provider.

## Decision

- Preserve all existing Anthropic product behavior.
- Add a separate Operations provider interface with mock/disabled default.
- OpenAI model ids are configuration.
- No API key reaches browser, source, prompt artifacts, or logs.
- Machine outputs are schema validated, grounded, budgeted, and audited.

## Consequences

No provider migration is implied. Live OpenAI use remains blocked without a
secure key, configured models, evaluation gates, and owner-approved
environment enablement.
