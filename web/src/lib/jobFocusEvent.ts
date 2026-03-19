export const JOB_FOCUS_EVENT = "hireflow:focus-job" as const;

export type JobFocusEventDetail = {
  jobId: string;
};

