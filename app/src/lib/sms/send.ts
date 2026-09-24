/**
 * SMS delivery via MSG91.
 *
 * India's TRAI rules require DLT registration of the sender ID and of every
 * message template before a transactional SMS will be delivered — a process
 * that takes weeks. Until that clears, this falls back to logging the message
 * to the server console so the whole booking flow remains testable end to end.
 *
 * The fallback is deliberately loud, and refuses to run in production: silently
 * "sending" nothing in a live clinic would mean patients paying and never
 * receiving their token.
 */

type SmsResult = { ok: true; via: "MSG91" | "CONSOLE" } | { ok: false; error: string };

function isConfigured(): boolean {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID);
}

async function deliver(
  phone: string,
  templateId: string | undefined,
  variables: Record<string, string>,
  humanReadable: string,
): Promise<SmsResult> {
  if (!isConfigured() || !templateId) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error:
          "SMS is not configured. Set MSG91_AUTH_KEY, MSG91_SENDER_ID and the " +
          "template IDs, and complete DLT registration, before going live.",
      };
    }
    console.log(
      `\n──────── SMS (not sent — MSG91 unconfigured) ────────\n` +
        `  to: +91${phone}\n  ${humanReadable}\n` +
        `────────────────────────────────────────────────────\n`,
    );
    return { ok: true, via: "CONSOLE" };
  }

  try {
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY!,
      },
      body: JSON.stringify({
        template_id: templateId,
        sender: process.env.MSG91_SENDER_ID,
        short_url: "0",
        recipients: [{ mobiles: `91${phone}`, ...variables }],
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `MSG91 responded ${response.status}` };
    }
    return { ok: true, via: "MSG91" };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export function sendOtpSms(phone: string, code: string, ttlMinutes: number) {
  return deliver(
    phone,
    process.env.MSG91_OTP_TEMPLATE_ID,
    { otp: code, ttl: String(ttlMinutes) },
    `OTP: ${code}  (valid ${ttlMinutes} minutes)`,
  );
}

export function sendTokenSms(
  phone: string,
  tokenNumber: number,
  sessionAndTime: string,
  date: string,
) {
  return deliver(
    phone,
    process.env.MSG91_TOKEN_TEMPLATE_ID,
    { token: String(tokenNumber), slot: sessionAndTime, date },
    `Appointment confirmed. Token #${tokenNumber} — ${sessionAndTime}, ${date}`,
  );
}
