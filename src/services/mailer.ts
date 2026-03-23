import * as nodemailer from 'nodemailer';
import { Service, Inject } from 'typedi';
import path from 'path';
import ejs from 'ejs';
import { AppLogger } from './logger';
import { config } from '../config';

@Service()
export default class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly logger: AppLogger) {
    this.transporter = nodemailer.createTransport({
      host: config.mailer.host,
      port: Number(config.mailer.port),
      secure: String(config.mailer.secure) === 'true',
      auth: {
        user: config.mailer.username,
        pass: config.mailer.password,
      },
      pool: true,
    });
  }

  public async sendMail({
    to,
    subject,
    template,
    variables,
    attachments = [],
  }: {
    to: string;
    subject: string;
    template: string;
    variables: any;
    attachments?: any[];
  }): Promise<void> {
    try {
      const templatePath = path.join(__dirname, '../templates', `${template}.ejs`);
      const html = await ejs.renderFile(templatePath, variables);

      const options: nodemailer.SendMailOptions = {
        from: `ShortUrl <${config.mailer.fromAddress}>`,
        to,
        subject,
        html,
        attachments,
      };

      // this.logger.info('Options', { context: MailerService.name, data: options });

      const info = await this.transporter.sendMail(options);
      this.logger.info('✉️ Email sent: %s', info.messageId);
    } catch (error) {
      this.logger.error('🔥 Error sending email: %o', { error });
      throw error;
    }
  }

  /**
   * Compiles an MJML template with EJS data
   */
  // private async compileTemplate(templateName: string, data: any): Promise<string> {
  //   const templatePath = path.join(__dirname, '../templates', `${templateName}.mjml`);

  //   // 1. Render EJS tags within the MJML file
  //   const mjmlWithData = await ejs.renderFile(templatePath, data);

  //   // 2. Convert MJML to bulletproof HTML
  //   const { html, errors } = mjml2html(mjmlWithData);

  //   if (errors.length > 0) {
  //     this.logger.error('MJML Compilation Errors: %o', errors);
  //   }

  //   return html;
  // }
}
