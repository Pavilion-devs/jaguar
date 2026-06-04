"use server";

import { approveActionRequest, rejectActionRequest } from "@jaguar/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertOperatorSecret } from "@/lib/operator-secret";

const redirectWithNotice = (notice: string): never => redirect(`/ops?notice=${notice}`);

export async function approveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const secret = String(formData.get("operatorSecret") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!id) redirectWithNotice("missing");
  if (!assertOperatorSecret(secret)) redirectWithNotice("operator_invalid");

  const result = await approveActionRequest(id, note ? `web-operator (${note})` : "web-operator");
  revalidatePath("/ops");
  redirectWithNotice(result ? "approved" : "stale");
}

export async function rejectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const secret = String(formData.get("operatorSecret") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!id) redirectWithNotice("missing");
  if (!assertOperatorSecret(secret)) redirectWithNotice("operator_invalid");
  if (!reason) redirectWithNotice("reason_required");

  const result = await rejectActionRequest(id, "web-operator", reason);
  revalidatePath("/ops");
  redirectWithNotice(result ? "rejected" : "stale");
}
