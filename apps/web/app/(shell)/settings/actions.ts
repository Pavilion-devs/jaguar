"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrCreatePersonalAlertProfile, updatePersonalAlertPreference } from "@jaguar/db";
import { PERSONAS, type Persona, SOLANA_PROTOCOLS, type Verdict } from "@jaguar/domain";

const DEMO_WALLET_ADDRESS = "jaguar-demo-wallet";

const isPersona = (value: string): value is Persona => PERSONAS.includes(value as Persona);
const isVerdict = (value: string): value is Verdict => value === "watch" || value === "enter";

const formValues = (formData: FormData, key: string) =>
  formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);

const parseNumber = (value: FormDataEntryValue | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const redirectWithNotice = (notice: string): never => redirect(`/settings?notice=${notice}`);

export async function updateAlertSettings(formData: FormData) {
  const profile = await getOrCreatePersonalAlertProfile(DEMO_WALLET_ADDRESS);
  const personas = formValues(formData, "personas").filter(isPersona);
  const verdicts = formValues(formData, "verdicts").filter(isVerdict);
  const protocols = formValues(formData, "protocols").filter((protocol) =>
    SOLANA_PROTOCOLS.includes(protocol as (typeof SOLANA_PROTOCOLS)[number]),
  );
  const minimumLiquidityRaw = String(formData.get("minimumLiquidity") ?? "").trim();
  const minimumLiquidity = minimumLiquidityRaw ? Math.max(0, Number(minimumLiquidityRaw)) : null;

  if (minimumLiquidityRaw && !Number.isFinite(minimumLiquidity)) {
    redirectWithNotice("invalid");
  }

  await updatePersonalAlertPreference({
    userProfileId: profile.userProfileId,
    enabled: formData.get("enabled") === "on",
    personas,
    verdicts,
    minimumScore: parseNumber(formData.get("minimumScore"), profile.preference.minimumScore),
    minimumLiquidity,
    protocols,
    maxAlertsPerHour: parseNumber(
      formData.get("maxAlertsPerHour"),
      profile.preference.maxAlertsPerHour,
    ),
  });

  revalidatePath("/settings");
  redirectWithNotice("saved");
}

export async function sendTelegramTestAlert() {
  const profile = await getOrCreatePersonalAlertProfile(DEMO_WALLET_ADDRESS);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegram = profile.telegram;

  if (!telegram) {
    return redirectWithNotice("connect_first");
  }

  if (!botToken) {
    return redirectWithNotice("bot_missing");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: telegram.chatId,
      text: [
        "Jaguar test alert",
        "",
        "Your Telegram connection is active. Real alerts will only fire when a launch matches your profile.",
      ].join("\n"),
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    return redirectWithNotice("test_failed");
  }

  revalidatePath("/settings");
  redirectWithNotice("test_sent");
}
