import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupPoll, PollOption } from "./types";

export async function createGroupPoll(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  question: string,
  options: string[],
  opts?: { anonymous?: boolean; allowMultiple?: boolean; expiresInHours?: number },
): Promise<{ pollId?: string; messageId?: string; error?: string }> {
  const trimmedQ = question.trim();
  const labels = options.map((o) => o.trim()).filter(Boolean);
  if (!trimmedQ) return { error: "Question is required." };
  if (labels.length < 2) return { error: "Add at least two options." };

  const expiresAt = opts?.expiresInHours
    ? new Date(Date.now() + opts.expiresInHours * 3600000).toISOString()
    : null;

  const { data: poll, error: pollError } = await supabase
    .from("group_polls")
    .insert({
      conversation_id: conversationId,
      creator_id: userId,
      question: trimmedQ,
      is_anonymous: opts?.anonymous ?? false,
      allow_multiple: opts?.allowMultiple ?? false,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (pollError || !poll) {
    return { error: pollError?.message ?? "Could not create poll." };
  }

  const optionRows = labels.map((label, i) => ({
    poll_id: poll.id,
    label,
    sort_order: i,
  }));

  const { error: optError } = await supabase.from("poll_options").insert(optionRows);
  if (optError) return { error: optError.message };

  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: trimmedQ,
      message_type: "poll",
      poll_id: poll.id,
    })
    .select("id")
    .single();

  if (msgError) return { error: msgError.message };
  return { pollId: poll.id as string, messageId: msg?.id as string };
}

export async function loadPollWithResults(
  supabase: SupabaseClient,
  pollId: string,
  userId: string,
): Promise<GroupPoll | null> {
  const { data: poll } = await supabase
    .from("group_polls")
    .select("*")
    .eq("id", pollId)
    .maybeSingle();

  if (!poll) return null;

  const { data: options } = await supabase
    .from("poll_options")
    .select("*")
    .eq("poll_id", pollId)
    .order("sort_order", { ascending: true });

  const { data: votes } = await supabase
    .from("poll_votes")
    .select("option_id, user_id")
    .eq("poll_id", pollId);

  const voteRows = votes ?? [];
  const myVotes = new Set(
    voteRows.filter((v) => v.user_id === userId).map((v) => v.option_id as string),
  );

  const enriched: PollOption[] = (options ?? []).map((o) => ({
    ...(o as PollOption),
    vote_count: voteRows.filter((v) => v.option_id === o.id).length,
    voted_by_me: myVotes.has(o.id as string),
  }));

  return {
    ...(poll as GroupPoll),
    options: enriched,
  };
}

export async function voteOnPoll(
  supabase: SupabaseClient,
  userId: string,
  pollId: string,
  optionId: string,
): Promise<{ error?: string }> {
  const poll = await loadPollWithResults(supabase, pollId, userId);
  if (!poll) return { error: "Poll not found." };
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return { error: "This poll has ended." };
  }

  if (!poll.allow_multiple) {
    await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", userId);
  }

  const { error } = await supabase.from("poll_votes").upsert({
    poll_id: pollId,
    option_id: optionId,
    user_id: userId,
  });

  if (error) return { error: error.message };
  return {};
}
