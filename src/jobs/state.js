export const JOB_STATUS = Object.freeze({ QUEUED: "queued", RUNNING: "running", COMPLETED: "completed", FAILED: "failed", CANCELLED: "cancelled" });
const allowed = { queued: new Set(["running", "failed", "cancelled"]), running: new Set(["queued", "completed", "failed", "cancelled"]), completed: new Set(), failed: new Set(), cancelled: new Set() };
export const canTransition = (from, to) => allowed[from]?.has(to) ?? false;
