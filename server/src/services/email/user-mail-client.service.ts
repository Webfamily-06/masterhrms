import net from "net";
import tls from "tls";
import nodemailer from "nodemailer";
import { validateHostForSsrf } from "./user-email-crypto.service";

export interface MailConnectionConfig {
  protocol?: "IMAP" | "POP3";
  host: string;
  port: number;
  security: "SSL/TLS" | "STARTTLS" | "NONE";
  user: string;
  pass: string;
  fromName?: string;
  fromEmail?: string;
}

export interface MailboxMessageSummary {
  uid: string;
  seqNumber?: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  unread: boolean;
  starred?: boolean;
  snippet?: string;
  size?: number;
}

export interface MailboxMessageDetail extends MailboxMessageSummary {
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

export class UserMailClientService {
  /**
   * Test SMTP Connectivity & Authentication
   */
  static async testSmtp(config: MailConnectionConfig): Promise<{ success: boolean; message: string; error?: string }> {
    const ssrfCheck = await validateHostForSsrf(config.host);
    if (!ssrfCheck.valid) {
      return { success: false, message: "Security validation failed", error: ssrfCheck.reason };
    }

    try {
      const isSsl = config.security === "SSL/TLS" || config.port === 465;
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: isSsl,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: true,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });

      await transporter.verify();
      return { success: true, message: `Successfully connected and authenticated with SMTP server (${config.host}:${config.port}).` };
    } catch (err: any) {
      const sanitized = (err?.message || "SMTP connection failed").replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
      return { success: false, message: "SMTP authentication or connection failed", error: sanitized };
    }
  }

  /**
   * Send an outbound email through user's personal SMTP configuration
   */
  static async sendSmtp(
    config: MailConnectionConfig,
    emailData: {
      to: string | string[];
      subject: string;
      body: string;
      html?: string;
      replyTo?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; accepted?: any; error?: string }> {
    const ssrfCheck = await validateHostForSsrf(config.host);
    if (!ssrfCheck.valid) {
      return { success: false, error: ssrfCheck.reason };
    }

    try {
      const isSsl = config.security === "SSL/TLS" || config.port === 465;
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: isSsl,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: true,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      const senderHeader = `"${config.fromName || config.user}" <${config.fromEmail || config.user}>`;
      const toList = Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to;

      const info = await transporter.sendMail({
        from: senderHeader,
        to: toList,
        subject: emailData.subject || "No Subject",
        text: emailData.body || "",
        html: emailData.html || `<div style="font-family: sans-serif; line-height: 1.5;">${(emailData.body || "").replace(/\n/g, "<br/>")}</div>`,
        replyTo: emailData.replyTo || config.fromEmail || config.user,
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
      };
    } catch (err: any) {
      const sanitized = (err?.message || "Outbound SMTP dispatch failed").replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
      return { success: false, error: sanitized };
    }
  }

  /**
   * Test Incoming (IMAP or POP3) Connectivity & Authentication
   */
  static async testIncoming(config: MailConnectionConfig): Promise<{ success: boolean; message: string; error?: string }> {
    const ssrfCheck = await validateHostForSsrf(config.host);
    if (!ssrfCheck.valid) {
      return { success: false, message: "Security validation failed", error: ssrfCheck.reason };
    }

    if (config.protocol === "POP3") {
      return this.testPop3(config);
    }
    return this.testImap(config);
  }

  // ─── Native Socket IMAP Client ───────────────────────────────────
  private static testImap(config: MailConnectionConfig): Promise<{ success: boolean; message: string; error?: string }> {
    return new Promise((resolve) => {
      const isTls = config.security === "SSL/TLS" || config.port === 993;
      let buffer = "";
      let resolved = false;

      const finish = (result: { success: boolean; message: string; error?: string }) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.destroy();
        } catch {}
        resolve(result);
      };

      const socketOptions = {
        host: config.host,
        port: config.port,
        timeout: 8000,
        rejectUnauthorized: true,
      };

      const socket = isTls ? tls.connect(socketOptions) : net.connect(socketOptions);

      socket.on("timeout", () => {
        finish({ success: false, message: "IMAP connection timed out after 8s", error: "ETIMEDOUT" });
      });

      socket.on("error", (err: any) => {
        const sanitized = (err?.message || "Connection error").replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
        finish({ success: false, message: "IMAP connection error", error: sanitized });
      });

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        // Wait for server greeting (* OK)
        if (buffer.includes("* OK") && !buffer.includes("a001")) {
          // Send LOGIN command
          const safeUser = config.user.replace(/["\\]/g, "");
          const safePass = config.pass.replace(/["\\]/g, "");
          socket.write(`a001 LOGIN "${safeUser}" "${safePass}"\r\n`);
        }

        if (buffer.includes("a001 OK")) {
          finish({ success: true, message: `Successfully connected and authenticated with IMAP server (${config.host}:${config.port}).` });
        } else if (buffer.includes("a001 NO") || buffer.includes("a001 BAD")) {
          const sanitized = buffer.replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***").trim();
          finish({ success: false, message: "IMAP authentication failed (invalid username or password)", error: sanitized });
        }
      });
    });
  }

  // ─── Native Socket POP3 Client ───────────────────────────────────
  private static testPop3(config: MailConnectionConfig): Promise<{ success: boolean; message: string; error?: string }> {
    return new Promise((resolve) => {
      const isTls = config.security === "SSL/TLS" || config.port === 995;
      let buffer = "";
      let step = 0; // 0 = wait greeting, 1 = sent USER, 2 = sent PASS
      let resolved = false;

      const finish = (result: { success: boolean; message: string; error?: string }) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.destroy();
        } catch {}
        resolve(result);
      };

      const socketOptions = {
        host: config.host,
        port: config.port,
        timeout: 8000,
        rejectUnauthorized: true,
      };

      const socket = isTls ? tls.connect(socketOptions) : net.connect(socketOptions);

      socket.on("timeout", () => {
        finish({ success: false, message: "POP3 connection timed out after 8s", error: "ETIMEDOUT" });
      });

      socket.on("error", (err: any) => {
        const sanitized = (err?.message || "Connection error").replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
        finish({ success: false, message: "POP3 connection error", error: sanitized });
      });

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        if (step === 0 && buffer.includes("+OK")) {
          step = 1;
          buffer = "";
          socket.write(`USER ${config.user}\r\n`);
        } else if (step === 1) {
          if (buffer.includes("+OK")) {
            step = 2;
            buffer = "";
            socket.write(`PASS ${config.pass}\r\n`);
          } else if (buffer.includes("-ERR")) {
            finish({ success: false, message: "POP3 rejected user", error: buffer.trim() });
          }
        } else if (step === 2) {
          if (buffer.includes("+OK")) {
            finish({ success: true, message: `Successfully connected and authenticated with POP3 server (${config.host}:${config.port}).` });
          } else if (buffer.includes("-ERR")) {
            finish({ success: false, message: "POP3 authentication failed", error: "Authentication failed" });
          }
        }
      });
    });
  }

  /**
   * Fetch mailbox messages list
   */
  static async fetchMessages(
    config: MailConnectionConfig,
    options: { folder?: string; page?: number; limit?: number; search?: string } = {}
  ): Promise<{ success: boolean; total: number; messages: MailboxMessageSummary[]; error?: string; protocolNote?: string }> {
    const ssrfCheck = await validateHostForSsrf(config.host);
    if (!ssrfCheck.valid) {
      return { success: false, total: 0, messages: [], error: ssrfCheck.reason };
    }

    if (config.protocol === "POP3") {
      return this.fetchPop3Messages(config, options);
    }
    return this.fetchImapMessages(config, options);
  }

  private static fetchImapMessages(
    config: MailConnectionConfig,
    options: { folder?: string; page?: number; limit?: number; search?: string }
  ): Promise<{ success: boolean; total: number; messages: MailboxMessageSummary[]; error?: string }> {
    return new Promise((resolve) => {
      const isTls = config.security === "SSL/TLS" || config.port === 993;
      let buffer = "";
      const messages: MailboxMessageSummary[] = [];
      let total = 0;
      let resolved = false;
      const folder = options.folder || "INBOX";

      const finish = (result: { success: boolean; total: number; messages: MailboxMessageSummary[]; error?: string }) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.destroy();
        } catch {}
        resolve(result);
      };

      const socketOptions = {
        host: config.host,
        port: config.port,
        timeout: 10000,
        rejectUnauthorized: true,
      };

      const socket = isTls ? tls.connect(socketOptions) : net.connect(socketOptions);

      socket.on("timeout", () => {
        finish({ success: false, total: 0, messages: [], error: "IMAP socket timeout" });
      });

      socket.on("error", (err: any) => {
        finish({ success: false, total: 0, messages: [], error: err.message });
      });

      let state = "GREETING";

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        if (state === "GREETING" && buffer.includes("* OK")) {
          state = "LOGIN";
          buffer = "";
          const safeUser = config.user.replace(/["\\]/g, "");
          const safePass = config.pass.replace(/["\\]/g, "");
          socket.write(`a001 LOGIN "${safeUser}" "${safePass}"\r\n`);
        } else if (state === "LOGIN" && buffer.includes("a001 OK")) {
          state = "SELECT";
          buffer = "";
          socket.write(`a002 SELECT "${folder}"\r\n`);
        } else if (state === "SELECT" && buffer.includes("a002 OK")) {
          const matchExists = buffer.match(/\*\s+(\d+)\s+EXISTS/i);
          total = matchExists ? parseInt(matchExists[1], 10) : 0;

          if (total === 0) {
            return finish({ success: true, total: 0, messages: [] });
          }

          state = "FETCH";
          buffer = "";
          const fetchStart = Math.max(1, total - (options.limit || 15) + 1);
          socket.write(`a003 FETCH ${fetchStart}:${total} (UID FLAGS BODY.PEEK[HEADER.FIELDS (SUBJECT FROM TO DATE)])\r\n`);
        } else if (state === "FETCH" && buffer.includes("a003 OK")) {
          // Parse fetched message lines
          const chunks = buffer.split(/\*\s+\d+\s+FETCH/gi).slice(1);
          for (let i = 0; i < chunks.length; i++) {
            const raw = chunks[i];
            const uidMatch = raw.match(/UID\s+(\d+)/i);
            const uid = uidMatch ? uidMatch[1] : String(i + 1);
            const subjectMatch = raw.match(/Subject:\s*(.*?)(\r?\n[^\s]|$)/is);
            const fromMatch = raw.match(/From:\s*(.*?)(\r?\n[^\s]|$)/is);
            const toMatch = raw.match(/To:\s*(.*?)(\r?\n[^\s]|$)/is);
            const dateMatch = raw.match(/Date:\s*(.*?)(\r?\n[^\s]|$)/is);
            const unread = !raw.includes("\\Seen");

            messages.unshift({
              uid,
              subject: subjectMatch ? subjectMatch[1].trim() : "(No Subject)",
              from: fromMatch ? fromMatch[1].trim() : "Unknown Sender",
              to: toMatch ? toMatch[1].trim() : config.user,
              date: dateMatch ? new Date(dateMatch[1].trim()).toLocaleDateString() : "Today",
              unread,
            });
          }

          finish({ success: true, total, messages });
        } else if (buffer.includes("a001 NO") || buffer.includes("a001 BAD")) {
          finish({ success: false, total: 0, messages: [], error: "IMAP Authentication Failed" });
        } else if (buffer.includes("a002 NO") || buffer.includes("a002 BAD")) {
          finish({ success: false, total: 0, messages: [], error: `Cannot select folder ${folder}` });
        }
      });
    });
  }

  private static fetchPop3Messages(
    config: MailConnectionConfig,
    options: { folder?: string; page?: number; limit?: number }
  ): Promise<{ success: boolean; total: number; messages: MailboxMessageSummary[]; protocolNote: string; error?: string }> {
    return new Promise((resolve) => {
      const isTls = config.security === "SSL/TLS" || config.port === 995;
      let buffer = "";
      let step = 0;
      let total = 0;
      const messages: MailboxMessageSummary[] = [];
      let resolved = false;

      const finish = (result: any) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.destroy();
        } catch {}
        resolve(result);
      };

      const socketOptions = {
        host: config.host,
        port: config.port,
        timeout: 10000,
        rejectUnauthorized: true,
      };

      const socket = isTls ? tls.connect(socketOptions) : net.connect(socketOptions);

      socket.on("timeout", () => {
        finish({ success: false, total: 0, messages: [], error: "POP3 timeout" });
      });

      socket.on("error", (err: any) => {
        finish({ success: false, total: 0, messages: [], error: err.message });
      });

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        if (step === 0 && buffer.includes("+OK")) {
          step = 1;
          buffer = "";
          socket.write(`USER ${config.user}\r\n`);
        } else if (step === 1 && buffer.includes("+OK")) {
          step = 2;
          buffer = "";
          socket.write(`PASS ${config.pass}\r\n`);
        } else if (step === 2 && buffer.includes("+OK")) {
          step = 3;
          buffer = "";
          socket.write(`STAT\r\n`);
        } else if (step === 3 && buffer.includes("+OK")) {
          const statMatch = buffer.match(/\+OK\s+(\d+)\s+(\d+)/);
          total = statMatch ? parseInt(statMatch[1], 10) : 0;
          if (total === 0) {
            return finish({
              success: true,
              total: 0,
              messages: [],
              protocolNote: "POP3 mailbox connected. 0 messages on server.",
            });
          }

          // Fetch top headers for recent message
          step = 4;
          buffer = "";
          socket.write(`TOP ${total} 0\r\n`);
        } else if (step === 4 && (buffer.includes("\r\n.\r\n") || buffer.includes("\n.\n"))) {
          const subjectMatch = buffer.match(/Subject:\s*(.*?)(\r?\n[^\s]|$)/is);
          const fromMatch = buffer.match(/From:\s*(.*?)(\r?\n[^\s]|$)/is);
          const dateMatch = buffer.match(/Date:\s*(.*?)(\r?\n[^\s]|$)/is);

          messages.push({
            uid: String(total),
            subject: subjectMatch ? subjectMatch[1].trim() : "POP3 Message",
            from: fromMatch ? fromMatch[1].trim() : "Sender",
            to: config.user,
            date: dateMatch ? new Date(dateMatch[1].trim()).toLocaleDateString() : "Recent",
            unread: false,
          });

          finish({
            success: true,
            total,
            messages,
            protocolNote: "POP3 mailbox connected. Note: POP3 downloads single inbox spool without server folder sync.",
          });
        }
      });
    });
  }

  /**
   * Fetch a single message detail by UID
   */
  static async fetchMessageDetail(
    config: MailConnectionConfig,
    uid: string,
    folder: string = "INBOX"
  ): Promise<{ success: boolean; message?: MailboxMessageDetail; error?: string }> {
    const ssrfCheck = await validateHostForSsrf(config.host);
    if (!ssrfCheck.valid) {
      return { success: false, error: ssrfCheck.reason };
    }

    return new Promise((resolve) => {
      const isTls = config.security === "SSL/TLS" || config.port === 993;
      let buffer = "";
      let resolved = false;

      const finish = (result: any) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.destroy();
        } catch {}
        resolve(result);
      };

      const socketOptions = {
        host: config.host,
        port: config.port,
        timeout: 10000,
        rejectUnauthorized: true,
      };

      const socket = isTls ? tls.connect(socketOptions) : net.connect(socketOptions);

      socket.on("timeout", () => finish({ success: false, error: "Socket timeout" }));
      socket.on("error", (err: any) => finish({ success: false, error: err.message }));

      let state = "GREETING";

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        if (state === "GREETING" && buffer.includes("* OK")) {
          state = "LOGIN";
          buffer = "";
          const safeUser = config.user.replace(/["\\]/g, "");
          const safePass = config.pass.replace(/["\\]/g, "");
          socket.write(`a001 LOGIN "${safeUser}" "${safePass}"\r\n`);
        } else if (state === "LOGIN" && buffer.includes("a001 OK")) {
          state = "SELECT";
          buffer = "";
          socket.write(`a002 SELECT "${folder}"\r\n`);
        } else if (state === "SELECT" && buffer.includes("a002 OK")) {
          state = "FETCH";
          buffer = "";
          socket.write(`a003 UID FETCH ${uid} (BODY.PEEK[])\r\n`);
        } else if (state === "FETCH" && buffer.includes("a003 OK")) {
          const subjectMatch = buffer.match(/Subject:\s*(.*?)(\r?\n[^\s]|$)/is);
          const fromMatch = buffer.match(/From:\s*(.*?)(\r?\n[^\s]|$)/is);
          const toMatch = buffer.match(/To:\s*(.*?)(\r?\n[^\s]|$)/is);
          const dateMatch = buffer.match(/Date:\s*(.*?)(\r?\n[^\s]|$)/is);

          // Extract body text after double newline
          const bodySplit = buffer.split(/\r?\n\r?\n/);
          const text = bodySplit.length > 1 ? bodySplit.slice(1).join("\n\n").replace(/\r?\na003 OK.*$/i, "").trim() : "No text content.";

          finish({
            success: true,
            message: {
              uid,
              subject: subjectMatch ? subjectMatch[1].trim() : "(No Subject)",
              from: fromMatch ? fromMatch[1].trim() : "Unknown",
              to: toMatch ? toMatch[1].trim() : config.user,
              date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
              unread: false,
              text,
              html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${text}</div>`,
            },
          });
        }
      });
    });
  }
}
