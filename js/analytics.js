import {
  attachInternalIndex,
  createRecordCollection,
  demonstrateCollectionMethods,
  getSymbolDetails,
  readInternalIndex,
} from "./structures.js";

const SEARCH_METADATA = new WeakMap();
const TRACKED_RECORDS = new WeakSet();
const VALID_SORT_FIELDS = new Set([
  "id",
  "title",
  "category",
  "status",
  "assignedUser",
  "priority",
  "date",
  "value",
]);
const PRIORITY_ORDER = Object.freeze({ Low: 1, Medium: 2, High: 3 });

export const countRecords = (records) => records.length;
export const calculateTotalValue = (records) =>
  records.reduce((total, record) => total + record.value, 0);
export const calculateAverageValue = (records) =>
  records.length ? calculateTotalValue(records) / records.length : 0;
export const calculateCompletionPercentage = (records) => {
  if (!records.length) return 0;
  const completed = records.reduce(
    (total, record) => total + Number(record.status === "Completed"),
    0,
  );
  return (completed / records.length) * 100;
};

export const categorySummary = (records) => {
  const grouped = new Map();
  for (const record of records) {
    grouped.set(record.category, (grouped.get(record.category) ?? 0) + 1);
  }
  return [...grouped].map(([category, count]) => ({ category, count }));
};

export const groupRecordsBy = (records, property) => {
  if (!VALID_SORT_FIELDS.has(property)) {
    throw new RangeError(`Unsupported grouping property: ${property}`);
  }
  const grouped = new Map();
  for (const record of records) {
    const key = record[property];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }
  return grouped;
};

export const removeDuplicateRecords = (records, property) => {
  if (!Array.isArray(records)) throw new TypeError("Records must be an array.");
  if (!VALID_SORT_FIELDS.has(property))
    throw new RangeError(`Unsupported property: ${property}`);
  const seen = new Set();
  return records.filter((record) => {
    const value = record?.[property];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export const updateRecord = (records, id, changes) => {
  if (!Array.isArray(records)) throw new TypeError("Records must be an array.");
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new TypeError("Changes must be an object.");
  }
  let found = false;
  const updated = records.map((record) => {
    if (record.id !== id) return record;
    found = true;
    return Object.freeze({ ...record, ...changes, id: record.id });
  });
  if (!found) return records.slice();
  return updated;
};

export const sortBy =
  (property) =>
  (direction = "asc") =>
  (records) => {
    if (!VALID_SORT_FIELDS.has(property))
      throw new RangeError(`Unsupported sort property: ${property}`);
    if (!["asc", "desc"].includes(direction))
      throw new RangeError("Sort direction must be asc or desc.");

    const multiplier = direction === "asc" ? 1 : -1;
    return records.slice().sort((left, right) => {
      let a = left[property];
      let b = right[property];
      if (property === "priority") {
        a = PRIORITY_ORDER[a] ?? 0;
        b = PRIORITY_ORDER[b] ?? 0;
      }
      if (typeof a === "number" && typeof b === "number")
        return (a - b) * multiplier;
      return (
        String(a).localeCompare(String(b), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * multiplier
      );
    });
  };

export const compose =
  (...functions) =>
  (input) =>
    functions.reduceRight((value, fn) => fn(value), input);

function validateRecords(records) {
  if (!Array.isArray(records)) throw new TypeError("Records must be an array.");
  return Object.freeze(
    records.map((record, index) => {
      if (!record || typeof record !== "object")
        throw new TypeError(`Record ${index} must be an object.`);
      const required = [
        "id",
        "title",
        "category",
        "status",
        "assignedUser",
        "priority",
        "date",
        "value",
      ];
      for (const property of required) {
        if (!(property in record))
          throw new TypeError(`Record ${index} is missing ${property}.`);
      }
      if (typeof record.id !== "string" || !record.id.trim())
        throw new TypeError(`Record ${index} has an invalid ID.`);
      if (typeof record.value !== "number" || !Number.isFinite(record.value))
        throw new TypeError(`Record ${index} has an invalid numeric value.`);
      return Object.isFrozen(record) ? record : Object.freeze({ ...record });
    }),
  );
}

function buildIndexes(records) {
  const byId = new Map();
  const byCategory = new Map();
  const byStatus = new Map();
  const byUser = new Map();
  const categories = new Set();
  const statuses = new Set();
  const users = new Set();
  let weakMetadataCount = 0;

  for (const record of createRecordCollection(records)) {
    byId.set(record.id, record);
    categories.add(record.category);
    statuses.add(record.status);
    users.add(record.assignedUser);

    for (const [index, key] of [
      [byCategory, record.category],
      [byStatus, record.status],
      [byUser, record.assignedUser],
    ]) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(record);
    }

    SEARCH_METADATA.set(record, {
      searchText: [
        record.id,
        record.title,
        record.category,
        record.status,
        record.assignedUser,
        record.priority,
      ]
        .join(" ")
        .toLowerCase(),
    });
    TRACKED_RECORDS.add(record);
    weakMetadataCount += 1;
  }

  return {
    byId,
    byCategory,
    byStatus,
    byUser,
    categories,
    statuses,
    users,
    weakMetadataCount,
  };
}

function normalizeFilters(filters = {}) {
  const safe = filters && typeof filters === "object" ? filters : {};
  return {
    query:
      typeof safe.query === "string"
        ? safe.query.trim().slice(0, 100).toLowerCase()
        : "",
    category: typeof safe.category === "string" ? safe.category : "",
    status: typeof safe.status === "string" ? safe.status : "",
    assignedUser:
      typeof safe.assignedUser === "string" ? safe.assignedUser : "",
  };
}

export function createAnalyticsStore(initialRecords) {
  let records = validateRecords(initialRecords);
  let version = 1;
  let cacheHits = 0;
  let cacheMisses = 0;
  const summaryCache = new Map();
  const state = { version };
  let indexes = buildIndexes(records);
  const collectionMethods = demonstrateCollectionMethods();
  const symbolDetails = getSymbolDetails();
  attachInternalIndex(state, indexes);

  function setRecords(nextRecords) {
    records = validateRecords(nextRecords);
    version += 1;
    state.version = version;
    indexes = buildIndexes(records);
    attachInternalIndex(state, indexes);
    summaryCache.clear();
  }

  function getFilteredRecords(
    filters = {},
    sortField = "date",
    sortDirection = "desc",
  ) {
    const safeFilters = normalizeFilters(filters);
    const candidates = [];
    if (safeFilters.category)
      candidates.push(indexes.byCategory.get(safeFilters.category) ?? []);
    if (safeFilters.status)
      candidates.push(indexes.byStatus.get(safeFilters.status) ?? []);
    if (safeFilters.assignedUser)
      candidates.push(indexes.byUser.get(safeFilters.assignedUser) ?? []);
    const smallestIndex = candidates.length
      ? candidates.reduce((smallest, current) =>
          current.length < smallest.length ? current : smallest,
        )
      : records;

    const filtered = smallestIndex.filter((record) => {
      if (safeFilters.category && record.category !== safeFilters.category)
        return false;
      if (safeFilters.status && record.status !== safeFilters.status)
        return false;
      if (
        safeFilters.assignedUser &&
        record.assignedUser !== safeFilters.assignedUser
      )
        return false;
      return (
        !safeFilters.query ||
        SEARCH_METADATA.get(record)?.searchText.includes(safeFilters.query)
      );
    });

    const property = VALID_SORT_FIELDS.has(sortField) ? sortField : "date";
    const direction = sortDirection === "asc" ? "asc" : "desc";
    return compose(sortBy(property)(direction))(filtered);
  }

  function getSummary(recordsInView = records) {
    if (!Array.isArray(recordsInView))
      throw new TypeError("Summary input must be an array.");
    const signature = `${version}:${recordsInView.map((record) => `${record.id}:${record.value}:${record.status}`).join("|")}`;
    if (summaryCache.has(signature)) {
      cacheHits += 1;
      return summaryCache.get(signature);
    }

    cacheMisses += 1;
    const result = Object.freeze({
      total: countRecords(recordsInView),
      totalValue: calculateTotalValue(recordsInView),
      averageValue: calculateAverageValue(recordsInView),
      completionPercentage: calculateCompletionPercentage(recordsInView),
    });
    if (summaryCache.size >= 100) summaryCache.clear();
    summaryCache.set(signature, result);
    return result;
  }

  function getStructureInfo() {
    return {
      groupedUsers: indexes.byUser.size,
      groupedStatuses: indexes.byStatus.size,
      uniqueCategories: indexes.categories.size,
      uniqueUsers: indexes.users.size,
      uniqueStatuses: indexes.statuses.size,
      weakMetadataCount: indexes.weakMetadataCount,
      trackedRecordSample: records.length
        ? TRACKED_RECORDS.has(records[0])
        : false,
      internalIndexAttached: Boolean(readInternalIndex(state)),
      symbolDetails,
      collectionMethods,
    };
  }

  return Object.freeze({
    getAllRecords: () => records.slice(),
    getById: (id) => indexes.byId.get(id),
    getGroupedByUser: () =>
      new Map([...indexes.byUser].map(([key, value]) => [key, value.slice()])),
    getGroupedByStatus: () =>
      new Map(
        [...indexes.byStatus].map(([key, value]) => [key, value.slice()]),
      ),
    getUniqueValues: () => ({
      categories: new Set(indexes.categories),
      users: new Set(indexes.users),
      statuses: new Set(indexes.statuses),
    }),
    getFilteredRecords,
    getSummary,
    getCategorySummary: categorySummary,
    getStructureInfo,
    getMemoStats: () => ({
      cacheSize: summaryCache.size,
      hits: cacheHits,
      misses: cacheMisses,
      version,
    }),
    setRecords,
  });
}

export function benchmarkLookups(records, iterations = 5000) {
  if (!Array.isArray(records)) throw new TypeError("Records must be an array.");
  if (!Number.isInteger(iterations) || iterations < 1)
    throw new RangeError("Iterations must be a positive integer.");
  if (!records.length) return { arrayMs: 0, mapMs: 0, iterations, matches: 0 };

  const byId = new Map(records.map((record) => [record.id, record]));
  const queries = Array.from(
    { length: iterations },
    (_, index) => records[(index * 37) % records.length].id,
  );
  let arrayChecksum = 0;
  let mapChecksum = 0;

  for (let index = 0; index < Math.min(iterations, 200); index += 1) {
    const id = queries[index];
    arrayChecksum += records.find((record) => record.id === id)?.value ?? 0;
    mapChecksum += byId.get(id)?.value ?? 0;
  }

  const arrayStart = performance.now();
  for (const id of queries)
    arrayChecksum += records.find((record) => record.id === id)?.value ?? 0;
  const arrayMs = performance.now() - arrayStart;

  const mapStart = performance.now();
  for (const id of queries) mapChecksum += byId.get(id)?.value ?? 0;
  const mapMs = performance.now() - mapStart;

  return {
    arrayMs,
    mapMs,
    iterations,
    matches: arrayChecksum === mapChecksum ? iterations : 0,
  };
}

export function getWeakReferenceCapabilities() {
  return {
    weakMap: typeof SEARCH_METADATA.get === "function",
    weakSet: typeof TRACKED_RECORDS.has === "function",
  };
}
