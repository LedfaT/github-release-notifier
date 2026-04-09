import { env } from "../../../config/env";
import { createLogger } from "../../../config/logger";
import mailClient from "./mail.client";
import {
  buildConfirmSubscriptionTemplate,
  buildNewReleaseTemplate,
  buildUnsubscribedTemplate,
} from "./templates/subscription-email.templates";

const logger = createLogger("notifier-service");

class NotifierService {
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
    const template = buildNewReleaseTemplate({
      repository: input.repository,
      tagName: input.tagName,
      releaseUrl: input.releaseUrl,
    });

    logger.info(
      { email: input.email, repository: input.repository, tagName: input.tagName },
      "Sending new release email",
    );

    await mailClient.sendEmail({
      to: input.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    logger.info(
      { email: input.email, repository: input.repository, tagName: input.tagName },
      "New release email sent",
    );
  }
}

export default new NotifierService();
