# TaskFlow Analytics — Assignment 22

A dependency-free JavaScript analytics dashboard built with browser ES modules. The application creates 240 deterministic task records and supports search, indexed filters, sorting, pagination, grouped reports, duplicate removal, batch processing, immutable updates, and an execution-order demonstration.

## Run the application

1. Open a terminal in this folder.
2. Start a local web server:

   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000` in a browser.

ES modules should be served over HTTP; opening `index.html` directly as a `file://` page may block module imports.

## Run the checks

Node.js 18 or later is recommended. Run:

```bash
npm test
```

The tests use Node's built-in test runner; no packages need to be installed.

## Module responsibilities

- `index.html` — analytics dashboard entry page.
- `execution-order.html` — dedicated execution-order demonstration page.
- `styles.css` — responsive dashboard and demonstration-page styles.
- `js/data.js` — deterministic sample dataset (240 records) and filter options.
- `js/structures.js` — custom iterable, batch generator, and Symbol-based internal property.
- `js/analytics.js` — validation, indexes, filtering, grouping, pure calculations, immutable updates, memoization, and the lookup benchmark.
- `js/execution.js` — reusable event-loop order demonstration and `this` binding example.
- `js/execution-page.js` — connects the dedicated execution-order page to the runtime demonstration.
- `js/ui.js` — DOM rendering only; it does not own data-processing logic.
- `js/app.js` — connects UI events to the data and analytics modules.
- `tests/analytics.test.js` — automated checks for core processing behavior.

## Required concepts demonstrated

- **Map:** ID lookup and indexes grouped by category, status, and assigned user. The structure module also demonstrates `set()`, `get()`, `has()`, `delete()`, `clear()`, iteration, and an object used as a key.
- **Set:** unique categories, users, and statuses, plus duplicate removal by a selected record property. The collection demonstration covers `add()`, `has()`, `delete()`, and `clear()`.
- **WeakMap / WeakSet:** temporary normalized-search metadata and object tracking. Their references do not keep otherwise unreachable record objects alive; they are intentionally not enumerable.
- **Symbol:** a private internal index key, a registered `Symbol.for()` key with `Symbol.keyFor()`, and the well-known `Symbol.iterator` protocol.
- **Iterator / generator:** records can be consumed with `for...of`; `batchRecords()` lazily yields groups of 10 records.
- **Functional programming:** pure summary functions, curried `sortBy(property)(direction)`, composition, and non-mutating `updateRecord()`.
- **Memoization:** report summaries are cached by dataset version and record signature. `setRecords()` rebuilds indexes, increments the version, and clears the cache.
- **Execution contexts and call stack:** a script begins in a global execution context; function calls create function execution contexts and stack frames. The nested call trace shows last-in, first-out stack behavior. Creation and execution phases establish bindings before statements run; lexical environments resolve identifiers through the scope chain.
- **Event loop:** synchronous work runs first, Promise and `queueMicrotask()` callbacks run as microtasks, and `setTimeout()` / `setInterval()` callbacks are scheduled as tasks. The browser can render between event-loop iterations. A timer delay is a minimum scheduling threshold, not an exact execution time.
- **`this`:** method invocation, detached invocation, `bind()`, nested methods, arrow-function lexical `this`, and a regular DOM event listener show how a function receives or loses its context.
- **Memory:** JavaScript garbage collection is automatic. Circular references alone are not necessarily leaks; objects become collectible when unreachable. Long-lived references, unremoved event listeners, timers, and unbounded caches can retain objects unnecessarily. A WeakMap/WeakSet cannot be used to enumerate or count its entries.

## Performance comparison

The benchmark executes the same set of repeated ID lookups using `Array.find()` and `Map.get()`, measuring each with `performance.now()`. The Map is built before timing, so index construction is not included. The result is a local microbenchmark, not a universal performance claim: JIT warm-up, browser and hardware, dataset size, key distribution, and other activity can affect the measurements. Map lookup is specified to provide average access times that are sublinear in collection size; the language specification does not promise an exact constant-time result.

## References

- [MDN: JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [MDN: Microtasks and the event loop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [MDN: Map and keyed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN: WeakMap and WeakSet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections)
- [MDN: Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
- [MDN: Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [MDN: JavaScript memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
