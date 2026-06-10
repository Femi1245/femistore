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

export async function sendGiftDemo(
  supabase: SupabaseClient,
  senderId: string,
  input: SendGiftInput,
): Promise<{ gift: SentGift | null; error?: string }> {
  if (senderId === input.recipientId) {
    return { gift: null, error: "You cannot send a gift to yourself." };
  }

  const { data: item } = await supabase
    .from("gift_catalog")
    .select("*")
    .eq("id", input.catalogId)
    .maybeSingle();

  if (!item) return { gift: null, error: "Gift not found." };

  const catalog = item as GiftCatalogItem;

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
      payment_status: "mock",
      payment_provider: null,
      payment_reference: null,
    })
    .select("*")
    .single();

  if (error || !gift) {
    if (error?.code === "PGRST205") {
      return {
        gift: null,
        error: "Run supabase/gifts-schema.sql in Supabase SQL Editor first.",
      };
    }
    return { gift: null, error: error?.message ?? "Could not send gift." };
  }

  const sent = gift as SentGift;
  sent.catalog = catalog;

  const senderName = (
    await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", senderId)
      .maybeSingle()
  ).data?.display_name;

  const notifMessage = `${catalog.emoji} ${catalog.name}${input.note ? ` — "${input.note.trim()}"` : ""}`;

  await supabase.from("notifications").insert({
    recipient_id: input.recipientId,
    actor_id: senderId,
    type: "gift",
    entity_type: input.context,
    entity_id: sent.id,
    message: notifMessage,
  });

  if (input.context === "chat" && input.conversationId) {
    await supabase.from("messages").insert({
      conversation_id: input.conversationId,
      sender_id: senderId,
      content: `${catalog.emoji} sent ${catalog.name}${input.note ? `: ${input.note.trim()}` : ""}`,
      message_type: "gift",
      sent_gift_id: sent.id,
    });
  }

  return { gift: sent };
}
