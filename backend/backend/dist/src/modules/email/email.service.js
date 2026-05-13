"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.transporter = null;
        const smtpHost = this.configService.get('SMTP_HOST');
        const smtpUser = this.configService.get('SMTP_USER');
        const smtpPass = this.configService.get('SMTP_PASS');
        if (smtpHost && smtpUser && smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: this.configService.get('SMTP_PORT', 587),
                secure: this.configService.get('SMTP_PORT', 587) === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
            this.isConfigured = true;
            this.logger.log('Email service configured');
        }
        else {
            this.isConfigured = false;
            this.logger.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to enable email sending.');
        }
    }
    async sendEmail(options) {
        if (!this.isConfigured || !this.transporter) {
            this.logger.warn(`Email not sent (not configured): ${options.subject} to ${options.to}`);
            if (process.env.NODE_ENV !== 'production') {
                this.logger.debug(`Email content:\n${options.text || options.html}`);
            }
            return false;
        }
        try {
            const from = this.configService.get('SMTP_FROM', 'noreply@timelock.app');
            await this.transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
            this.logger.log(`Email sent successfully to ${options.to}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
            return false;
        }
    }
    async sendVerificationEmail(email, verificationToken, frontendUrl) {
        const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #5a67d8; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TimeLock</h1>
              <p>Verification de votre email</p>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Merci de vous etre inscrit sur TimeLock ! Pour activer votre compte, veuillez verifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
              <p style="text-align: center;">
                <a href="${verificationLink}" class="button">Verifier mon email</a>
              </p>
              <p>Ou copiez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #667eea;">${verificationLink}</p>
              <p>Ce lien est valable pendant 24 heures.</p>
              <p>Si vous n'avez pas cree de compte sur TimeLock, vous pouvez ignorer cet email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TimeLock. Tous droits reserves.</p>
            </div>
          </div>
        </body>
      </html>
    `;
        const text = `
      Verification de votre email TimeLock

      Bonjour,

      Merci de vous etre inscrit sur TimeLock ! Pour activer votre compte, veuillez verifier votre adresse email en cliquant sur le lien ci-dessous :

      ${verificationLink}

      Ce lien est valable pendant 24 heures.

      Si vous n'avez pas cree de compte sur TimeLock, vous pouvez ignorer cet email.

      ---
      TimeLock
    `;
        return this.sendEmail({
            to: email,
            subject: 'Verifiez votre email - TimeLock',
            html,
            text,
        });
    }
    isEmailConfigured() {
        return this.isConfigured;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map