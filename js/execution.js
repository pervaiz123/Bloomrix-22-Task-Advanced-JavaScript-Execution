export function runExecutionOrderDemo(onStep) {
  if (typeof onStep !== "function")
    throw new TypeError("A step callback is required.");

  const log = (label) => onStep(label);
  log("Synchronous: script starts");

  function outerFunction() {
    log("Call stack: outerFunction() entered");
    function nestedFunction() {
      log("Call stack: nestedFunction() entered");
    }
    nestedFunction();
    log("Call stack: outerFunction() continues");
  }

  outerFunction();
  Promise.resolve().then(() => log("Microtask: Promise.then() callback"));
  queueMicrotask(() => log("Microtask: queueMicrotask() callback"));
  setTimeout(() => log("Task: setTimeout() callback"), 0);
  log("Synchronous: script ends");
}

export function demonstrateThisBinding() {
  const service = {
    name: "TaskFlow Analytics",
    getName() {
      return this?.name ?? "undefined";
    },
  };
  const nestedService = {
    name: "Nested service",
    getName() {
      return this.name;
    },
  };
  const arrowService = {
    name: "Arrow object name",
    getName: () => this?.name ?? "undefined (lexical this)",
  };
  const detachedMethod = service.getName;
  const boundMethod = service.getName.bind(service);

  return {
    methodCall: service.getName(),
    detachedCall: detachedMethod(),
    boundCall: boundMethod(),
    nestedMethodCall: nestedService.getName(),
    arrowCall: arrowService.getName(),
  };
}
