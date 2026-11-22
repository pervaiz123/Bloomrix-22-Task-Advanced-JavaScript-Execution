const categories = [
  "Frontend",
  "Backend",
  "Analytics",
  "Security",
  "DevOps",
  "Research",
];
const statuses = ["To Do", "In Progress", "Review", "Completed"];
const users = [
  "Ayesha Khan",
  "Bilal Ahmed",
  "Sara Ali",
  "Hamza Malik",
  "Noor Fatima",
  "Usman Raza",
  "Hira Shah",
  "Daniyal Iqbal",
];
const priorities = ["Low", "Medium", "High"];
const taskNames = [
  "Improve dashboard navigation",
  "Review API response handling",
  "Update access permissions",
  "Optimize report generation",
  "Document service workflow",
  "Validate data imports",
  "Refine search filters",
  "Resolve deployment warnings",
  "Audit application events",
  "Prepare release checklist",
  "Improve loading feedback",
  "Test account recovery",
];

function createRecord(index) {
  const number = index + 1;
  const month = index % 12;
  const day = ((index * 7) % 28) + 1;
  const date = new Date(Date.UTC(2026, month, day)).toISOString().slice(0, 10);

  return Object.freeze({
    id: `REC-${String(number).padStart(4, "0")}`,
    title: `${taskNames[index % taskNames.length]} ${String(number).padStart(3, "0")}`,
    category: categories[index % categories.length],
    status: statuses[(index * 3 + Math.floor(index / 5)) % statuses.length],
    assignedUser: users[(index * 5 + Math.floor(index / 3)) % users.length],
    priority:
      priorities[(index * 7 + Math.floor(index / 4)) % priorities.length],
    date,
    value: 500 + ((index * 7919) % 24500),
  });
}

export const sampleRecords = Object.freeze(
  Array.from({ length: 240 }, (_, index) => createRecord(index)),
);

export const datasetOptions = Object.freeze({
  categories: Object.freeze([...categories]),
  statuses: Object.freeze([...statuses]),
  users: Object.freeze([...users]),
  priorities: Object.freeze([...priorities]),
});
