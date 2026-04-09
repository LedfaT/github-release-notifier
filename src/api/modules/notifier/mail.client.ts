import nodemailer from "nodemailer";
import { env } from "../../../config/env";
import { createLogger } from "../../../config/logger";

const logger = createLogger("mail-client");

class MailClient {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS ?? "",
        }
      : undefined,
  });

  async sendEmail(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const info = await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    logger.info(
      {
        to: input.to,
        messageId: info.messageId,
      },
      "Email sent",
    );
  }
}

export default new MailClient();
