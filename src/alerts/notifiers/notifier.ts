import { Alert } from '../../common/types';

export interface Notifier {
  /** Unique channel name, used as the notification job's routing key. */
  readonly channel: string;
  isEnabled(): boolean;
  send(alert: Alert): Promise<void>;
}

export function alertText(alert: Alert): string {
  return `[${alert.type.replace(/_/g, ' ')}] ${alert.message}\n${alert.url}`;
}
