import type { SupabaseClient } from "@supabase/supabase-js";
import type { GiftCatalogItem, GiftContext, SentGift } from "./types";
import type { Profile } from "./types";

export function formatGiftPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export async function loadGiftCatalog(
  supabase: SupabaseClient,
): Promise<GiftCatalogItem[]> {
  const { data, error } = await supabase
    .from("gift_catalog")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as GiftCatalogItem[];
}

export async function loadLiveGifts(
  supabase: SupabaseClient,
  roomName: string,
  limit = 30,
): Promise<SentGift[]> {
  const { data, error } = await supabase
    .from("sent_gifts")
    .select("*")
    .eq("context", "live")
    .eq("room_name", roomName)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const ids = [...new Set(data.flatMap((g) => [g.sender_id, g.recipient_id]))];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
  const map = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  const catalog = await loadGiftCatalog(supabase);
  const catalogMap = new Map(catalog.map((c) => [c.id, c]));

  return (data as SentGift[]).map((g) => ({
    ...g,
    sender: map.get(g.sender_id),
    recipient: map.get(g.recipient_id),
    catalog: catalogMap.get(g.catalog_id),
  }));
}

export type SendGiftInput = {
  catalogId: string;
  recipientId: string;
  context: GiftContext;
  conversationId?: string;
  roomName?: string;
  note?: string;
};

async function getCatalogItem(
  supabase: SupabaseClient,
  catalogId: string,
): Promise<GiftCatalogItem | null> {
  const { data } = await supabase
    .from("gift_catalog")
    .select("*")
    .eq("id", catalogId)
    .maybeSingle();
  return (data as GiftCatalogItem | null) ?? null;
}

/**
 * Inserts a gift row. `paymentStatus` is "mock" for demo mode, or "pending"
 * when a real payment provider must confirm it before fulfilment.
 */
export async function createGift(
  supabase: SupabaseClient,
  senderId: string,
  input: SendGiftInput,
  payment: {
    status: "mock" | "pending";
    provider?: string | null;
    reference?: string | null;
  },
): Promise<{ gift: SentGift | null; catalog: GiftCatalogItem | null; error?: string }> {
  if (senderId === input.recipientId) {
    return { gift: null, catalog: null, error: "You cannot send a gift to yourself." };
  }

  const catalog = await getCatalogItem(supabase, input.catalogId);
  if (!catalog) return { gift: null, catalog: null, error: "Gift not found." };

  const { data: gift, error } = await supabase
    .from("sent_gifts")
    .insert({
      catalog_id: catalog.id,
      sender_id: senderId,
      recipient_id: input.recipientId,
      context: input.context,
      conversation_id: input.conversationId ?? null,
      room_name: input.roomName ?? null,
      note: (input.note ?? "").trim().slice(0, 200),
      amount_cents: catalog.price_cents,
      payment_status: payment.status,
      payment_provider: payment.provider ?? null,
      payment_reference: payment.reference ?? null,
    })
    .select("*")
    .single();

  if (error || !gift) {
    if (error?.code === "PGRST205") {
      return {
        gift: null,
        catalog,
        error: "Run supabase/gifts-schema.sql in Supabase SQL Editor first.",
      };
    }
    return { gift: null, catalog, error: error?.message ?? "Could not send gift." };
  }

  const sent = gift as SentGift;
  sent.catalog = catalog;
  return { gift: sent, catalog };
}

/**
 * Delivers a gift's side effects: a notification to the recipient and, for chat
 * gifts, a message in the conversation. Safe to call once a gift is confirmed.
 */
export async function fulfillGift(
  supabase: SupabaseClient,
  gift: SentGift,
): Promise<void> {
  const catalog = gift.catalog ?? (await getCatalogItem(supabase, gift.catalog_id));
  if (!catalog) return;

  const note = (gift.note ?? "").trim();
  const notifMessage = `${catalog.emoji} ${catalog.name}${note ? ` — "${note}"` : ""}`;

  await supabase.from("notifications").insert({
    recipient_id: gift.recipient_id,
    actor_id: gift.sender_id,
    type: "gift",
    entity_type: gift.context,
    entity_id: gift.id,
    message: notifMessage,
  });

  if (gift.context === "chat" && gift.conversation_id) {
    await supabase.from("messages").insert({
      conversation_id: gift.conversation_id,
      sender_id: gift.sender_id,
      content: `${catalog.emoji} sent ${catalog.name}${note ? `: ${note}` : ""}`,
      message_type: "gift",
      sent_gift_id: gift.id,
    });
  }
}

/**
 * Confirms a pending gift after a successful payment and fulfils it exactly
 * once. The `.eq("payment_status", "pending")` guard makes this idempotent, so
 * the webhook and the redirect callback can both call it safely.
 */
export async function markGiftPaidAndFulfill(
  supabase: SupabaseClient,
  giftId: string,
  providerReference: string,
): Promise<void> {
  const { data: gift } = await supabase
    .from("sent_gifts")
    .update({ payment_status: "paid", payment_reference: providerReference })
    .eq("id", giftId)
    .eq("payment_status", "pending")
    .select("*")
    .maybeSingle();

  if (!gift) return; // already processed, failed, or not found
  await fulfillGift(supabase, gift as SentGift);
}

/** Demo flow: insert as "mock" and fulfil immediately (no real charge). */
export async function sendGiftDemo(
  supabase: SupabaseClient,
  senderId: string,
  input: SendGiftInput,
): Promise<{ gift: SentGift | null; error?: string }> {
  const { gift, error } = await createGift(supabase, senderId, input, {
    status: "mock",
  });
  if (error || !gift) return { gift: null, error };
  await fulfillGift(supabase, gift);
  return { gift };
}
