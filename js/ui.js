const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function createBarRow(label, count, total) {
  const row = document.createElement("div");
  row.className = "bar-row";

  const name = document.createElement("span");
  name.className = "bar-name";
  name.textContent = label;

  const track = document.createElement("span");
  track.className = "bar-track";
  const fill = document.createElement("span");
  fill.className = "bar-fill";
  fill.style.width = `${total ? (count / total) * 100 : 0}%`;
  track.append(fill);

  const value = document.createElement("span");
  value.className = "bar-value";
  value.textContent = String(count);
  row.append(name, track, value);
  return row;
}

export function populateFilter(selectId, values, label) {
  const select = document.getElementById(selectId);
  const placeholder = select.options[0];
  select.replaceChildren(placeholder);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  select.options[0].textContent = label;
}

export function renderDashboard({ records, summary, categoryStats, statusStats, structures, totalRecords, page, pageSize, message = "" }) {
  setText("dataset-count", `${totalRecords.toLocaleString()} records loaded`);
  setText("metric-records", summary.total.toLocaleString());
  setText("metric-average", currency.format(summary.averageValue));
  setText("metric-completion", `${number.format(summary.completionPercentage)}%`);
  setText("metric-total-value", currency.format(summary.totalValue));
  setText("result-count", `${summary.total.toLocaleString()} results`);

  const tbody = document.getElementById("records-body");
  tbody.replaceChildren();
  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "empty-state";
    cell.textContent = message || "No records match the current filters.";
    row.append(cell);
    tbody.append(row);
  } else {
    for (const record of records) {
      const row = document.createElement("tr");
      const titleCell = document.createElement("td");
      const title = document.createElement("span");
      title.className = "record-title";
      title.textContent = record.title;
      const id = document.createElement("span");
      id.className = "record-id";
      id.textContent = record.id;
      titleCell.append(title, id);

      const category = document.createElement("td");
      category.textContent = record.category;
      const status = document.createElement("td");
      const statusPill = document.createElement("span");
      statusPill.className = `pill pill-${record.status.toLowerCase().replaceAll(" ", "-")}`;
      statusPill.textContent = record.status;
      status.append(statusPill);
      const user = document.createElement("td");
      user.textContent = record.assignedUser;
      const priority = document.createElement("td");
      priority.textContent = record.priority;
      const date = document.createElement("td");
      date.textContent = record.date;
      const value = document.createElement("td");
      value.className = "numeric value-cell";
      value.textContent = currency.format(record.value);
      row.append(titleCell, category, status, user, priority, date, value);
      tbody.append(row);
    }
  }

  const pages = Math.max(1, Math.ceil(summary.total / pageSize));
  setText("page-summary", `Page ${Math.min(page, pages)} of ${pages}`);
  document.getElementById("previous-page").disabled = page <= 1;
  document.getElementById("next-page").disabled = page >= pages;

  const categoryContainer = document.getElementById("category-stats");
  categoryContainer.replaceChildren();
  if (!categoryStats.length) {
    categoryContainer.textContent = "No category data for this selection.";
  } else {
    for (const entry of categoryStats) categoryContainer.append(createBarRow(entry.category, entry.count, summary.total));
  }

  const statusContainer = document.getElementById("status-stats");
  statusContainer.replaceChildren();
  if (!statusStats.length) {
    statusContainer.textContent = "No status data for this selection.";
  } else {
    for (const [status, count] of statusStats) statusContainer.append(createBarRow(status, count, summary.total));
  }

  setText(
    "structure-summary",
    `${structures.groupedUsers} user groups · ${structures.uniqueCategories} categories · ${structures.uniqueUsers} users · ${structures.uniqueStatuses} statuses`
  );
}

export function renderExecutionSteps(steps) {
  const list = document.getElementById("execution-list");
  list.replaceChildren();
  for (const step of steps) {
    const item = document.createElement("li");
    item.textContent = step;
    list.append(item);
  }
}

export function renderBenchmark(result) {
  const container = document.getElementById("benchmark-result");
  container.replaceChildren();
  if (result.matches !== result.iterations) {
    container.textContent = "The lookup results did not match; benchmark output was not accepted.";
    return;
  }

  const lines = [
    ["Array.find()", `${result.arrayMs.toFixed(3)} ms`],
    ["Map.get()", `${result.mapMs.toFixed(3)} ms`],
    ["Queries checked", result.iterations.toLocaleString()]
  ];
  for (const [label, value] of lines) {
    const line = document.createElement("div");
    line.className = "benchmark-line";
    const name = document.createElement("span");
    name.textContent = label;
    const output = document.createElement("strong");
    output.textContent = value;
    line.append(name, output);
    container.append(line);
  }
}
