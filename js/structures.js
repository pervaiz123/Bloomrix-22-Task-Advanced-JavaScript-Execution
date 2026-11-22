const INTERNAL_INDEX = Symbol("taskflow.internalIndex");
const SHARED_VERSION = Symbol.for("taskflow.analytics.version");

export function createRecordCollection(records) {
  if (!Array.isArray(records)) {
    throw new TypeError("Records must be an array.");
  }

  const snapshot = records.slice();
  return {
    [Symbol.iterator]() {
      let index = 0;
      return {
        next() {
          if (index < snapshot.length) {
            return { value: snapshot[index++], done: false };
          }
          return { value: undefined, done: true };
        }
      };
    }
  };
}

export function* batchRecords(records, batchSize = 10) {
  if (!Array.isArray(records)) {
    throw new TypeError("Records must be an array.");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("Batch size must be a positive integer.");
  }

  for (let index = 0; index < records.length; index += batchSize) {
    yield records.slice(index, index + batchSize);
  }
}

export function getSymbolDetails() {
  const first = Symbol("record-key");
  const second = Symbol("record-key");
  return {
    internalProperty: INTERNAL_INDEX.description,
    sharedKey: Symbol.keyFor(SHARED_VERSION),
    iteratorProtocol: Symbol.iterator.description,
    localSymbolsAreUnique: first !== second
  };
}

export function demonstrateCollectionMethods() {
  const objectKey = { id: "temporary-object-key" };
  const map = new Map();
  map.set(objectKey, "stored with an object key");
  map.set("temporary", true);
  const mapHas = map.has(objectKey);
  const mapGet = map.get(objectKey);
  const mapDelete = map.delete("temporary");
  const mapSizeBeforeClear = map.size;
  map.clear();

  const set = new Set(["Frontend", "Backend", "Frontend"]);
  set.add("Analytics");
  const setHas = set.has("Backend");
  const setDelete = set.delete("Backend");
  const setSizeBeforeClear = set.size;
  set.clear();

  return {
    mapHas,
    mapGet,
    mapDelete,
    mapSizeBeforeClear,
    mapSizeAfterClear: map.size,
    setHas,
    setDelete,
    setSizeBeforeClear,
    setSizeAfterClear: set.size
  };
}

export function attachInternalIndex(target, index) {
  if (target === null || typeof target !== "object") {
    throw new TypeError("The index target must be an object.");
  }
  Object.defineProperty(target, INTERNAL_INDEX, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: index
  });
  return target;
}

export function readInternalIndex(target) {
  return target?.[INTERNAL_INDEX];
}
