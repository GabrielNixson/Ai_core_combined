export const QUEUE_NAME = 'document-processing';

export const JOB_TYPES = {
  DOCUMENT_PROCESS_JOB: 'DOCUMENT_PROCESS_JOB',
  DOCUMENT_REPROCESS_JOB: 'DOCUMENT_REPROCESS_JOB',
  DOCUMENT_DELETE_JOB: 'DOCUMENT_DELETE_JOB',
  DOCUMENT_EXPORT_JOB: 'DOCUMENT_EXPORT_JOB',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

export const JOB_PRIORITIES = {
  URGENT: 1,
  HIGH: 10,
  NORMAL: 20,
  LOW: 30,
} as const;

export type JobPriorityName = keyof typeof JOB_PRIORITIES;
export default JOB_TYPES;
