export type TaskPhase =
  | "idle"
  | "analyzing"
  | "intent"
  | "search"
  | "plan"
  | "validate"
  | "revise"
  | "decomposing"
  | "scheduling"
  | "saving"
  | "done"
  | "error";
