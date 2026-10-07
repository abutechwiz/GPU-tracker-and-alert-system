import { Logger } from '@nestjs/common';
import { Alert } from '../../common/types';
import { Notifier, alertText } from './notifier';

export class LogNotifier implements Notifier {
  readonly channel = 'log';
  private readonly logger = new Logger('Alert');

  isEnabled() {
    return true;
  }

  send(alert: Alert) {
    this.logger.warn(alertText(alert));
    return Promise.resolve();
  }
}
