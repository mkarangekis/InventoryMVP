# Ranked Improvement Backlog

Formula version `v1`:

```text
priority = (impact × confidence × reach × urgency × alignment)
           / (effort × risk × time_to_evidence)
```

Inputs use a 1–5 scale. Scores prioritize work; they do not authorize it.

| Rank | Opportunity                                | Metric                       |   I |   C |   R |   U |   A |   E | Risk |   T | Score | Tier |
| ---: | ------------------------------------------ | ---------------------------- | --: | --: | --: | --: | --: | --: | ---: | --: | ----: | ---- |
|    1 | Owner-only ops permission guard            | unauthorized access attempts |   5 |   5 |   5 |   5 |   5 |   2 |    2 |   1 |   781 | B    |
|    2 | Fail-closed Operations flags/environment   | accidental enablement        |   5 |   5 |   5 |   5 |   5 |   2 |    1 |   1 |  1563 | B    |
|    3 | Deterministic policy + approval integrity  | unsafe action rate           |   5 |   5 |   4 |   5 |   5 |   3 |    2 |   2 |   208 | B    |
|    4 | Emergency pause                            | containment time             |   5 |   5 |   4 |   5 |   5 |   2 |    2 |   1 |   625 | B    |
|    5 | Repository-backed synthetic overview       | owner time-to-signal         |   4 |   5 |   4 |   4 |   5 |   3 |    1 |   1 |   356 | B    |
|    6 | Authorization/tenant characterization      | regression rate              |   5 |   5 |   5 |   5 |   5 |   3 |    1 |   1 |  1042 | B    |
|    7 | Fix fail-open cron authorization           | unauthorized job calls       |   5 |   5 |   5 |   5 |   5 |   2 |    2 |   1 |   781 | B    |
|    8 | Resolve high dependency advisories         | known vulnerable deps        |   5 |   5 |   5 |   5 |   4 |   3 |    3 |   2 |   139 | B    |
|    9 | Claims registry                            | unsupported claim rate       |   4 |   5 |   4 |   4 |   4 |   2 |    1 |   1 |   640 | B    |
|   10 | Connector framework in mock/read-only mode | connector contract pass      |   4 |   4 |   3 |   3 |   4 |   4 |    2 |   2 |    36 | B    |

Raw inputs and order will be persisted with opportunity records when the
control-plane store exists. Production or external execution remains Tier C.
