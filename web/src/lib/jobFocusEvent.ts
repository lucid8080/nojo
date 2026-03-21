export const JOB_FOCUS_EVENT = "hireflow:focus-job" as const;

/** Focus a work-board card by Agent Workspace conversation id (e.g. c1). */
export type JobFocusEventDetail = {
  conversationId: string;
};
