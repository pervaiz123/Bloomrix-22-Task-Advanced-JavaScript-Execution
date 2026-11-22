import { sampleRecords, datasetOptions } from "./data.js";
import {
  benchmarkLookups,
  createAnalyticsStore,
  groupRecordsBy,
  removeDuplicateRecords,
  updateRecord,
} from "./analytics.js";
import { batchRecords } from "./structures.js";
import { demonstrateThisBinding, runExecutionOrderDemo } from "./execution.js";
import {
  populateFilter,
  renderBenchmark,
  renderDashboard,
  renderExecutionSteps,
} from "./ui.js";

const PAGE_SIZE = 10;
const store = createAnalyticsStore(sampleRecords);
const pageState = {
  page: 1,
  batchIterator: batchRecords(store.getAllRecords(), 10),
};

function readFilters() {
  return {
    query: document.getElementById("search-input").value,
    category: document.getElementById("category-filter").value,
    status: document.getElementById("status-filter").value,
    assignedUser: document.getElementById("user-filter").value,
  };
}

function getCurrentView() {
  const filters = readFilters();
  const sortField = document.getElementById("sort-field").value;
  const sortDirection = document.getElementById("sort-direction").value;
  const filtered = store.getFilteredRecords(filters, sortField, sortDirection);
  const summary = store.getSummary(filtered);
  const start = (pageState.page - 1) * PAGE_SIZE;

  return {
    filtered,
    visible: filtered.slice(start, start + PAGE_SIZE),
    summary,
    categoryStats: store
      .getCategorySummary(filtered)
      .sort((a, b) => b.count - a.count),
    statusStats: [...groupRecordsBy(filtered, "status")].map(
      ([status, records]) => [status, records.length],
    ),
    structures: store.getStructureInfo(),
  };
}

function refreshDashboard(message = "") {
  const view = getCurrentView();
  const maxPage = Math.max(1, Math.ceil(view.summary.total / PAGE_SIZE));
  pageState.page = Math.min(pageState.page, maxPage);
  const adjusted =
    pageState.page === 1 && view.visible.length <= PAGE_SIZE
      ? view
      : getCurrentView();
  const start = (pageState.page - 1) * PAGE_SIZE;

  renderDashboard({
    records: adjusted.filtered.slice(start, start + PAGE_SIZE),
    summary: adjusted.summary,
    categoryStats: adjusted.categoryStats,
    statusStats: adjusted.statusStats,
    structures: adjusted.structures,
    totalRecords: store.getAllRecords().length,
    page: pageState.page,
    pageSize: PAGE_SIZE,
    message,
  });
}

function resetBatchIterator() {
  pageState.batchIterator = batchRecords(store.getAllRecords(), 10);
  document.getElementById("batch-result").textContent =
    "Dataset changed. Batch sequence reset.";
}

function initialize() {
  populateFilter(
    "category-filter",
    datasetOptions.categories,
    "All categories",
  );
  populateFilter("status-filter", datasetOptions.statuses, "All statuses");
  populateFilter("user-filter", datasetOptions.users, "All users");

  for (const id of [
    "search-input",
    "category-filter",
    "status-filter",
    "user-filter",
    "sort-field",
    "sort-direction",
  ]) {
    document
      .getElementById(id)
      .addEventListener(id === "search-input" ? "input" : "change", () => {
        pageState.page = 1;
        refreshDashboard();
      });
  }

  document.getElementById("previous-page").addEventListener("click", () => {
    pageState.page = Math.max(1, pageState.page - 1);
    refreshDashboard();
  });
  document.getElementById("next-page").addEventListener("click", () => {
    pageState.page += 1;
    refreshDashboard();
  });

  document
    .getElementById("dedupe-button")
    .addEventListener("click", function handleDedupe() {
      const property = document.getElementById("dedupe-property").value;
      const original = store.getAllRecords();
      const unique = removeDuplicateRecords(original, property);
      const removed = original.length - unique.length;
      document.getElementById("dedupe-result").textContent =
        `${unique.length} unique records remain; ${removed} duplicates removed by ${property}. Dataset unchanged. Event-handler this: ${this.id}.`;
    });

  document.getElementById("batch-button").addEventListener("click", () => {
    const nextBatch = pageState.batchIterator.next();
    const result = document.getElementById("batch-result");
    if (nextBatch.done) {
      result.textContent =
        "All records have been processed. The batch sequence has been reset.";
      pageState.batchIterator = batchRecords(store.getAllRecords(), 10);
      return;
    }
    const first = nextBatch.value[0]?.id;
    const last = nextBatch.value.at(-1)?.id;
    result.textContent = `${nextBatch.value.length} records processed (${first} to ${last}).`;
  });

  document.getElementById("complete-button").addEventListener("click", () => {
    const visible = getCurrentView().visible;
    const target = visible.find((record) => record.status !== "Completed");
    const result = document.getElementById("update-result");
    if (!target) {
      result.textContent =
        "No unfinished record is visible in the current page.";
      return;
    }
    const originalStatus = target.status;
    const nextRecords = updateRecord(store.getAllRecords(), target.id, {
      status: "Completed",
    });
    store.setRecords(nextRecords);
    resetBatchIterator();
    result.textContent = `${target.id} changed from ${originalStatus} to Completed. Original record was not modified.`;
    refreshDashboard();
  });

  document.getElementById("run-order-button").addEventListener("click", () => {
    const steps = [];
    renderExecutionSteps(["Running…"]);
    runExecutionOrderDemo((step) => {
      steps.push(step);
      renderExecutionSteps(steps);
    });
  });

  document.getElementById("benchmark-button").addEventListener("click", () => {
    try {
      renderBenchmark(benchmarkLookups(store.getAllRecords(), 5000));
    } catch (error) {
      document.getElementById("benchmark-result").textContent =
        `Benchmark unavailable: ${error.message}`;
    }
  });

  const thisBinding = demonstrateThisBinding();
  document.getElementById("this-demo").textContent =
    `Method: ${thisBinding.methodCall} · Detached: ${String(thisBinding.detachedCall)} · Bound: ${thisBinding.boundCall} · Nested method: ${thisBinding.nestedMethodCall} · Arrow lexical this: ${thisBinding.arrowCall}`;

  refreshDashboard();
}

try {
  initialize();
} catch (error) {
  document.getElementById("records-body").innerHTML =
    `<tr><td colspan="7" class="empty-state">Application error: ${error.message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td></tr>`;
  console.error(error);
}
