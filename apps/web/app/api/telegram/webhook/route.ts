import { connectTelegramChatToProfile } from "@jaguar/db";
import { NextResponse } from "next/server";

import { verifyTelegramConnectToken } from "@/lib/telegram-connect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id?: number | string;
      type?: string;
    };
    from?: {
      username?: string;
      first_name?: string;
      is_bot?: boolean;
    };
  };
};

const sendTelegramMessage = async (chatId: string, text: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN is missing; skipping Telegram webhook reply.");
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Telegram webhook reply failed with ${response.status}: ${body}`);
  }
};

const extractConnectToken = (text: string | undefined) => {
  if (!text) return null;

  const [, payload] = text.trim().split(/\s+/, 2);
  if (!payload?.startsWith("connect_")) {
    return null;
  }

  return payload.slice("connect_".length);
};

export async function GET() {
  return NextResponse.json({ ok: true, service: "jaguar-telegram-webhook" });
}

export async function POST(request: Request) {
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  const chatId = message?.chat?.id == null ? null : String(message.chat.id);
  const connectToken = extractConnectToken(message?.text);

  if (!chatId || !connectToken) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const verified = verifyTelegramConnectToken(connectToken);
  if (!verified) {
    await sendTelegramMessage(
      chatId,
      "That Jaguar connection link is invalid or expired. Open Jaguar Settings and generate a fresh Telegram link.",
    );
    return NextResponse.json({ ok: true, connected: false });
  }

  try {
    await connectTelegramChatToProfile({
      userProfileId: verified.userProfileId,
      chatId,
      username: message?.from?.username ?? null,
      firstName: message?.from?.first_name ?? null,
    });

    await sendTelegramMessage(
      chatId,
      "Telegram is connected to Jaguar. You will receive personal alerts when your profile matches an actionable launch.",
    );

    return NextResponse.json({ ok: true, connected: true });
  } catch (error) {
    console.error("Telegram connection failed", error instanceof Error ? error.message : error);
    await sendTelegramMessage(
      chatId,
      "Jaguar could not connect this Telegram chat. Open Settings and try a fresh link.",
    );
    return NextResponse.json({ ok: true, connected: false });
  }
}
