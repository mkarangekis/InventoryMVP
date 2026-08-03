# Accessibility Audit: Operations Center

**Standard:** WCAG 2.1 AA
**Date:** 2026-07-29
**Scope:** static code review and contrast calculation; browser/assistive
technology testing is blocked.

## Result

No critical issue remains in the reviewed source. Manual browser, 200% zoom,
keyboard-only, NVDA/VoiceOver, and mobile viewport verification remain blocked
because the isolated runtime exposed no browser.

| Area                      | Result             | Evidence                                                |
| ------------------------- | ------------------ | ------------------------------------------------------- |
| Semantics                 | pass by inspection | headings, landmarks, table headers, state regions       |
| Keyboard                  | pass by inspection | native buttons/links; visible focus styles              |
| Touch targets             | corrected          | view tabs and retry control have 44px minimum           |
| Reduced motion            | pass by inspection | loading motion disabled for reduced-motion preference   |
| Color-independent status  | corrected          | baseline state has visually hidden text                 |
| Normal text contrast      | calculated pass    | muted `#8f9ba8` on `#111820` = 6.31:1                   |
| Utility text contrast     | corrected/pass     | `#778594` on `#111820` = 4.74:1                         |
| Gold accent contrast      | calculated pass    | `#d4a853` on `#111820` = 8.10:1                         |
| Responsive source         | pass by inspection | two breakpoints, horizontal tab/table overflow          |
| Account activation form   | pass by inspection | labels, autocomplete, 12-char instructions, live status |
| Screen reader/manual zoom | blocked            | browser and assistive technology unavailable            |

The audit influenced the implementation by increasing target sizes, replacing
the low-contrast utility token, adding text equivalents to colored states, and
respecting reduced motion. The dedicated Operations account follow-up also
prevents a signup-control flash while auth intent loads, associates password
instructions with both fields, preserves native keyboard controls, and
announces dynamic authentication status.
