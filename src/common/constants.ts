export const RETAILER_QUEUE = 'retailer-queue';
export const HTML_PARSER_QUEUE = 'html-parser-queue';
export const ALERT_QUEUE = 'alert-queue';
export const NOTIFICATION_QUEUE = 'notification-queue';

export const JOB_POLL_ALL = 'poll_all';
export const JOB_POLL_RETAILER = 'poll_retailer';
export const JOB_PARSE_HTML = 'parse_html';
export const JOB_EVALUATE_SNAPSHOT = 'evaluate_snapshot';
export const JOB_SEND_NOTIFICATION = 'send_notification';

export const POLL_SCHEDULER_ID = 'poll-all-trackers';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const STATE_STORE = Symbol('STATE_STORE');
export const NOTIFIERS = Symbol('NOTIFIERS');

export const RETRY_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
} as const;

export const CLEANUP_JOB_OPTIONS = {
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 1000 },
} as const;
