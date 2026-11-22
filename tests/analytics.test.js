import test from "node:test";
import assert from "node:assert/strict";
import { sampleRecords } from "../js/data.js";
import {
  calculateAverageValue,
  calculateCompletionPercentage,
  calculateTotalValue,
  createAnalyticsStore,
  removeDuplicateRecords,
  updateRecord,
  benchmarkLookups
} from "../js/analytics.js";
import { batchRecords, createRecordCollection, demonstrateCollectionMethods } from "../js/structures.js";
import { demonstrateThisBinding } from "../js/execution.js";

const store = createAnalyticsStore(sampleRecords);

test("sample data contains at least 100 complete records", () => {
  assert.ok(sampleRecords.length >= 100);
  for (const record of sampleRecords) {
    assert.deepEqual(Object.keys(record).sort(), ["assignedUser", "category", "date", "id", "priority", "status", "title", "value"]);
    assert.equal(typeof record.value, "number");
  }
});

test("pure summary functions handle normal and empty data", () => {
  assert.equal(calculateTotalValue([]), 0);
  assert.equal(calculateAverageValue([]), 0);
  assert.equal(calculateCompletionPercentage([]), 0);
  assert.equal(calculateTotalValue([{ value: 10 }, { value: 20 }]), 30);
  assert.equal(calculateAverageValue([{ value: 10 }, { value: 20 }]), 15);
});

test("indexed filtering and grouping return expected records", () => {
  const filtered = store.getFilteredRecords({ category: "Backend", status: "Completed" });
  assert.ok(filtered.every((record) => record.category === "Backend" && record.status === "Completed"));
  assert.ok(store.getGroupedByUser().size > 0);
  assert.equal(store.getById("REC-0001").id, "REC-0001");
});

test("Set-based duplicate removal keeps the first record", () => {
  const result = removeDuplicateRecords(sampleRecords, "category");
  assert.equal(result.length, new Set(sampleRecords.map((record) => record.category)).size);
  assert.equal(result[0], sampleRecords[0]);
});

test("custom iterable works with for...of", () => {
  const firstThree = [];
  for (const record of createRecordCollection(sampleRecords.slice(0, 3))) firstThree.push(record.id);
  assert.deepEqual(firstThree, ["REC-0001", "REC-0002", "REC-0003"]);
});

test("generator yields batches of ten and a final partial batch", () => {
  const batches = [...batchRecords(sampleRecords.slice(0, 23), 10)];
  assert.deepEqual(batches.map((batch) => batch.length), [10, 10, 3]);
});

test("immutable update leaves the original record unchanged", () => {
  const original = sampleRecords[0];
  const updated = updateRecord(sampleRecords, original.id, { status: "Completed" });
  assert.notEqual(updated, sampleRecords);
  assert.equal(original.status, sampleRecords[0].status);
  assert.equal(updated[0].status, "Completed");
  assert.ok(Object.isFrozen(updated[0]));
});

test("memoized summaries are cached and invalidated on data update", () => {
  const first = store.getSummary(sampleRecords);
  store.getSummary(sampleRecords);
  assert.ok(store.getMemoStats().hits >= 1);
  const next = updateRecord(sampleRecords, sampleRecords[0].id, { value: sampleRecords[0].value + 1 });
  store.setRecords(next);
  assert.equal(store.getMemoStats().cacheSize, 0);
  const updated = store.getSummary(store.getAllRecords());
  assert.equal(updated.totalValue, first.totalValue + 1);
});

test("invalid input is rejected safely", () => {
  assert.throws(() => createAnalyticsStore(null), TypeError);
  assert.throws(() => batchRecords([], 0).next(), RangeError);
  assert.throws(() => removeDuplicateRecords(sampleRecords, "unknown"), RangeError);
});

test("array and Map benchmark checks the same lookups", () => {
  const result = benchmarkLookups(sampleRecords.slice(0, 30), 100);
  assert.equal(result.matches, 100);
  assert.ok(result.arrayMs >= 0);
  assert.ok(result.mapMs >= 0);
});


test("Map and Set collection methods and object keys are demonstrated", () => {
  const result = demonstrateCollectionMethods();
  assert.equal(result.mapHas, true);
  assert.equal(result.mapGet, "stored with an object key");
  assert.equal(result.mapDelete, true);
  assert.equal(result.mapSizeAfterClear, 0);
  assert.equal(result.setHas, true);
  assert.equal(result.setDelete, true);
  assert.equal(result.setSizeAfterClear, 0);
});

test("this examples safely show method, detached, bound, nested, and arrow behavior", () => {
  const result = demonstrateThisBinding();
  assert.equal(result.methodCall, "TaskFlow Analytics");
  assert.equal(result.detachedCall, "undefined");
  assert.equal(result.boundCall, "TaskFlow Analytics");
  assert.equal(result.nestedMethodCall, "Nested service");
  assert.equal(result.arrowCall, "undefined (lexical this)");
});


test("execution order runs synchronous code, microtasks, then the timer task", async () => {
  const { runExecutionOrderDemo } = await import("../js/execution.js");
  const steps = [];
  runExecutionOrderDemo((step) => steps.push(step));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(steps, [
    "Synchronous: script starts",
    "Call stack: outerFunction() entered",
    "Call stack: nestedFunction() entered",
    "Call stack: outerFunction() continues",
    "Synchronous: script ends",
    "Microtask: Promise.then() callback",
    "Microtask: queueMicrotask() callback",
    "Task: setTimeout() callback"
  ]);
});
