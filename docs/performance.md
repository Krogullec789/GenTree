# Drag rendering experiment

Run `npm run test:performance` to reproduce the subscription benchmark.

The previous implementation placed `dragPositions` in `TreeContext`. Each pointer
move changed the context value, notifying every person card, the header and the
profile panel. `React.memo` cannot skip a context update consumed by a component.

The current implementation stores transient coordinates in a small external store.
Only `RelationshipLines` subscribes to that snapshot with `useSyncExternalStore`.
The dragged card uses local state; other cards only receive the stable store actions.
The final position is committed to tree history once on pointer release. Cancelling
a gesture clears its preview without committing an edit.

| Data consumers | Pointer updates | Previous shared-context renders | Current data-context renders | Current line-layer renders |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 20 | 2,000 | 0 | 20 |
| 500 | 20 | 10,000 | 0 | 20 |
| 1,000 | 20 | 20,000 | 0 | 20 |

These are deterministic React render counts from a Vitest/jsdom experiment. The
baseline recreates the old subscription topology with memoized consumers; the new
case uses the actual tree provider and drag store. Counts exclude initial mounting
and data loading. They do **not** measure full cards, browser painting, FPS or the
dragged card's local renders. No device-independent speedup is claimed.

Remaining costs include scanning visible nodes while panning, updating visible SVG
paths while dragging and copying bounded history snapshots on committed edits.
Browser profiling of larger realistic graphs is the next performance investigation.
