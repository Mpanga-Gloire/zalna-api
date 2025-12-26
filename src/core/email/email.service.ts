import { env } from "../../config/env";
import { HostApplicationStatus } from "../../features/hostApplications/model/host-application-status.enum";

type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

type HostApplicationEmailParams = {
  to: string;
  contactName: string;
  hallName: string;
  status: HostApplicationStatus;
  hostAppUrl?: string;
};

/**
 * Minimal email helper using SendGrid's v3 REST API (no SDK needed).
 */
export class EmailService {
  constructor(
    private readonly providerApiKey: string = env.email.providerApiKey,
    private readonly fromAddress: string = env.email.fromAddress,
  ) {}

  async sendEmail(params: SendEmailParams): Promise<void> {
    if (!this.providerApiKey || !this.fromAddress) {
      console.warn(
        "[EmailService] Missing EMAIL_PROVIDER_API_KEY or EMAIL_FROM; skipping email send.",
      );
      return;
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.providerApiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
            subject: params.subject,
          },
        ],
        from: { email: this.fromAddress },
        content: [
          params.html
            ? { type: "text/html", value: params.html }
            : { type: "text/plain", value: params.text || "" },
          params.text && params.html
            ? { type: "text/plain", value: params.text }
            : undefined,
        ].filter(Boolean),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[EmailService] Failed to send email to ${params.to}: ${response.status} ${body}`,
      );
      throw new Error(`Email send failed: ${response.statusText}`);
    }
  }

  async sendHostApplicationStatusEmail(
    params: HostApplicationEmailParams,
  ): Promise<void> {
    const { to, contactName, hallName, status } = params;

    if (!to) {
      console.warn("[EmailService] Missing recipient email; skipping send.");
      return;
    }

    if (status === HostApplicationStatus.UNDER_REVIEW) {
      await this.sendEmail({
        to,
        subject: `Your host application for ${hallName} is under review`,
        html: `<p>Hello ${contactName || "there"},</p>
<p>Thanks for submitting your host application for <strong>${hallName}</strong>. Our team has started reviewing it.</p>
<p>We will update you as soon as a decision is made.</p>
<p>— The Zalna Team</p>`,
        text:
          `Hello ${contactName || "there"},\n\n` +
          `Thanks for submitting your host application for ${hallName}. Our team has started reviewing it.\n\n` +
          "We will update you as soon as a decision is made.\n\n— The Zalna Team",
      });
      return;
    }

    if (status === HostApplicationStatus.APPROVED) {
      const hostAppUrl = params.hostAppUrl || env.email.hostAppUrl;
      await this.sendEmail({
        to,
        subject: `Your host application for ${hallName} is approved 🎉`,
        html: `<p>Hello ${contactName || "there"},</p>
<p>Great news! Your host application for <strong>${hallName}</strong> has been approved.</p>
<p>You can now access the host dashboard to set up your venue and start accepting bookings.</p>
<p><a href="${hostAppUrl}">Open the host app</a></p>
<p>— The Zalna Team</p>`,
        text:
          `Hello ${contactName || "there"},\n\n` +
          `Great news! Your host application for ${hallName} has been approved.\n` +
          `You can now access the host dashboard to set up your venue and start accepting bookings: ${hostAppUrl}\n\n` +
          "— The Zalna Team",
      });
    }
  }
}
