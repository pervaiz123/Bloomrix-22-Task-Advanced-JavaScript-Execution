import { demonstrateThisBinding, runExecutionOrderDemo } from "./execution.js";
import { renderExecutionSteps } from "./ui.js";

const runButton = document.getElementById("run-order-button");
const thisBinding = demonstrateThisBinding();

document.getElementById("this-demo").textContent = [
  `Method call: ${thisBinding.methodCall}`,
  `Detached call: ${thisBinding.detachedCall}`,
  `Bound call: ${thisBinding.boundCall}`,
  `Nested method: ${thisBinding.nestedMethodCall}`,
  `Arrow lexical this: ${thisBinding.arrowCall}`
].join(" · ");

runButton.addEventListener("click", () => {
  const steps = [];
  renderExecutionSteps(["Running…"]);
  runExecutionOrderDemo((step) => {
    steps.push(step);
    renderExecutionSteps(steps);
  });
});
