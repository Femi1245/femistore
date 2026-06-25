"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  acknowledgeCallDelivered,
  ensureCallNotificationPermission,
  notifyIncomingCall,
} from "@/lib/call-notifications";
import { loadActiveChat } from "@/lib/chat";
import { CallOverlay } from "@/components/chat/CallOverlay";
import { IncomingCallModal } from "@/components/chat/IncomingCallModal";
import { OutgoingCallOverlay } from "@/components/chat/OutgoingCallOverlay";
import type { CallSession, CallType, Profile } from "@/lib/types";
import { createContext, useContext } from "react";

export type ActiveCallState = {
  sessionId: string;
  callType: CallType;
  title: string;
};

export type OutgoingCallState = {
  session: CallSession;
  callee: Profile | null;
  title: string;
};

type StartCallParams = {
  conversationId: string;
  callType: CallType;
  title: string;
  callee?: Profile | null;
};

type CallContextValue = {
  activeCall: ActiveCallState | null;
  outgoingCall: OutgoingCallState | null;
  startCall: (params: StartCallParams) => Promise<{ error?: string }>;
  cancelOutgoingCall: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCalls(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCalls must be used within CallProvider");
  }
  return ctx;
}

export function CallProvider({
  userId,
  children,
}: {
  userId: string;
  children?: React.ReactNode;
}) {
  const getSupabase = useCallback(() => createClient(), []);

  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [incomingCaller, setIncomingCaller] = useState<Profile | null>(null);

  const handleIncomingSession = useCallback(
    async (session: CallSession) => {
      if (session.initiator_id === userId) return;
      if (!["ringing", "active"].includes(session.status)) return;
      if (activeCall || outgoingCall) return;

      const supabase = getSupabase();
      const { data: member } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", session.conversation_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!member) return;

      const { data: caller } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.initiator_id)
        .maybeSingle();

      void ensureCallNotificationPermission();
      void acknowledgeCallDelivered(session.id);
      notifyIncomingCall(session, (caller as Profile) ?? null);

      setIncomingCall(session);
      setIncomingCaller((caller as Profile) ?? null);
    },
    [activeCall, getSupabase, outgoingCall, userId],
  );

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`incoming-calls:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_sessions" },
        (payload) => {
          void handleIncomingSession(payload.new as CallSession);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions" },
        (payload) => {
          const session = payload.new as CallSession;
          if (session.initiator_id === userId) return;
          if (incomingCall?.id === session.id && !["ringing", "active"].includes(session.status)) {
            setIncomingCall(null);
            setIncomingCaller(null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getSupabase, handleIncomingSession, incomingCall?.id, userId]);

  const startCall = useCallback(async (params: StartCallParams) => {
    void ensureCallNotificationPermission();

    const res = await fetch("/api/calls/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: params.conversationId,
        callType: params.callType,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: (data.error as string) ?? "Could not start call" };
    }

    const session = data.session as CallSession;
    if (session.status === "active") {
      setActiveCall({
        sessionId: session.id,
        callType: session.call_type,
        title: params.title,
      });
    } else {
      setOutgoingCall({
        session,
        callee: params.callee ?? null,
        title: params.title,
      });
    }
    return {};
  }, []);

  const cancelOutgoingCall = useCallback(async () => {
    if (!outgoingCall) return;
    await fetch("/api/calls/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: outgoingCall.session.id }),
    });
    setOutgoingCall(null);
  }, [outgoingCall]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    const res = await fetch("/api/calls/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: incomingCall.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setIncomingCall(null);
      setIncomingCaller(null);
      return;
    }

    const chat = await loadActiveChat(getSupabase(), userId, incomingCall.conversation_id);
    setActiveCall({
      sessionId: incomingCall.id,
      callType: incomingCall.call_type,
      title: chat?.title ?? incomingCaller?.display_name ?? "Call",
    });
    setIncomingCall(null);
    setIncomingCaller(null);
  }, [getSupabase, incomingCall, incomingCaller, userId]);

  const declineIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    await fetch("/api/calls/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: incomingCall.id }),
    });
    setIncomingCall(null);
    setIncomingCaller(null);
  }, [incomingCall]);

  const onOutgoingAnswered = useCallback(
    (session: CallSession) => {
      setOutgoingCall(null);
      setActiveCall({
        sessionId: session.id,
        callType: session.call_type,
        title: outgoingCall?.title ?? "Call",
      });
    },
    [outgoingCall?.title],
  );

  const onOutgoingEnded = useCallback(() => {
    setOutgoingCall(null);
  }, []);

  const value = useMemo(
    () => ({
      activeCall,
      outgoingCall,
      startCall,
      cancelOutgoingCall,
    }),
    [activeCall, cancelOutgoingCall, outgoingCall, startCall],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {incomingCall && (
        <IncomingCallModal
          session={incomingCall}
          caller={incomingCaller}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}
      {outgoingCall && (
        <OutgoingCallOverlay
          session={outgoingCall.session}
          callee={outgoingCall.callee}
          title={outgoingCall.title}
          onCancel={cancelOutgoingCall}
          onAnswered={onOutgoingAnswered}
          onEnded={onOutgoingEnded}
        />
      )}
      {activeCall && (
        <CallOverlay
          sessionId={activeCall.sessionId}
          callType={activeCall.callType}
          title={activeCall.title}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </CallContext.Provider>
  );
}
