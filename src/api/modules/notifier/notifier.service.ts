import { env } from "../../../config/env";
import { createLogger } from "../../../config/logger";
import mailClient from "./mail.client";
import notifierCache from "./notifier.cache";
import {
  buildConfirmSubscriptionTemplate,
  buildNewReleaseTemplate,
  buildUnsubscribedTemplate,
} from "./templates/subscription-email.templates";

const logger = createLogger("notifier-service");

class NotifierService {
  private getErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }

    return "Unknown send error";
  }

  private async saveUndeliveredReleaseMessage(input: {
    email: string;
    repository: string;
    tagName: string;
    releaseUrl: string;
    subject: string;
    err: unknown;
  }): Promise<void> {
    await notifierCache.addUndeliveredReleaseMessage({
      email: input.email,
      repository: input.repository,
      subject: input.subject,
      tagName: input.tagName,
      releaseUrl: input.releaseUrl,
      errorMessage: this.getErrorMessage(input.err),
    });
  }

  private async sendReleaseEmail(
    input: {
      email: string;
      repository: string;
      tagName: string;
      releaseUrl: string;
    },
    options: { cacheOnFailure: boolean },
  ): Promise<void> {
    const template = buildNewReleaseTemplate({
      repository: input.repository,
      tagName: input.tagName,
      releaseUrl: input.releaseUrl,
    });

    logger.info(
      { email: input.email, repository: input.repository, tagName: input.tagName },
      "Sending new release email",
    );

    try {
      await mailClient.sendEmail({
        to: input.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    } catch (err) {
      if (options.cacheOnFailure) {
        await this.saveUndeliveredReleaseMessage({
          email: input.email,
          repository: input.repository,
          tagName: input.tagName,
          releaseUrl: input.releaseUrl,
          subject: template.subject,
          err,
        });
      }

      throw err;
    }

    logger.info(
      { email: input.email, repository: input.repository, tagName: input.tagName },
      "New release email sent",
    );
  }

  async flushUndeliveredReleaseEmails(): Promise<void> {
    const messages = await notifierCache.listUndeliveredReleaseMessages();

    if (messages.length === 0) {
      return;
    }

    logger.info(
      { undeliveredCount: messages.length },
      "Retrying undelivered release emails",
    );

    for (const message of messages) {
      try {
        await this.sendReleaseEmail(
          {
            email: message.email,
            repository: message.repository,
            tagName: message.tagName,
            releaseUrl: message.releaseUrl,
          },
          { cacheOnFailure: false },
        );

        await notifierCache.removeUndeliveredReleaseMessage(message.id);
      } catch (err) {
        logger.warn(
          {
            err,
            undeliveredMessageId: message.id,
            email: message.email,
            repository: message.repository,
            tagName: message.tagName,
          },
          "Failed to resend undelivered release email",
        );
      }
    }
  }

  async sendConfirmationEmail(input: {
    email: string;
    repository: string;
    confirmToken: string;
    unsubscribeToken: string;
  }): Promise<void> {
    const confirmUrl = `${env.APP_BASE_URL}/api/confirm/${input.confirmToken}`;
    const unsubscribeUrl = `${env.APP_BASE_URL}/api/unsubscribe/${input.unsubscribeToken}`;
    const template = buildConfirmSubscriptionTemplate({
      repository: input.repository,
      confirmUrl,
      unsubscribeUrl,
    });

    logger.info(
      { email: input.email, repository: input.repository },
      "Sending confirmation email",
    );

    await mailClient.sendEmail({
      to: input.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    logger.info(
      { email: input.email, repository: input.repository },
      "Confirmation email sent",
    );
  }

  async sendUnsubscribedEmail(input: {
    email: string;
    repository: string;
  }): Promise<void> {
    const template = buildUnsubscribedTemplate({
      repository: input.repository,
    });

    logger.info(
      { email: input.email, repository: input.repository },
      "Sending unsubscribed email",
    );

    await mailClient.sendEmail({
      to: input.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    logger.info(
      { email: input.email, repository: input.repository },
      "Unsubscribed email sent",
    );
  }

  async sendNewReleaseEmail(input: {
    email: string;
    repository: string;
    tagName: string;
    releaseUrl: string;
  }): Promise<void> {
    await this.sendReleaseEmail(input, { cacheOnFailure: true });
  }
}

export default new NotifierService();
