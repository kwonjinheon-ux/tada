"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type ConversationSummary = {
  id: string;
  listing: { id: string; title: string; price: string; imageUrl: string | null };
  counterpart: { id: string; name: string; avatarUrl: string | null };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  role: "buying" | "selling";
};

export type MarketMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  isPending?: boolean;
};

type Props = {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  initialMessages: MarketMessage[];
  currentUserId: string;
};

function formatListTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" });
  if (dateKey.format(date) === dateKey.format(today)) return new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" }).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function Avatar({ name, src, className }: { name: string; src: string | null; className: string }) {
  return src ? <img className={className} src={src} alt="" /> : <span className={className}>{name.charAt(0).toUpperCase()}</span>;
}

export function MarketMessagesClient({ conversations: initialConversations, selectedConversationId, initialMessages, currentUserId }: Props) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null, [conversations, selectedConversationId]);

  useEffect(() => setConversations(initialConversations), [initialConversations]);
  useEffect(() => setMessages(initialMessages), [initialMessages]);
  useEffect(() => bottomRef.current?.scrollIntoView({ block: "end" }), [messages]);
  useEffect(() => { if (selectedConversationId) router.prefetch("/market/dashboard/messages"); }, [router, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void fetch(`/api/market/messages/${selectedConversationId}/read`, { method: "PATCH" }).catch(() => undefined);
    setConversations((current) => current.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, unreadCount: 0 } : conversation));

    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const channel = supabase
        .channel(`market-messages:${selectedConversationId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_messages", filter: `conversation_id=eq.${selectedConversationId}` }, (payload) => {
          const row = payload.new as { id: string; conversation_id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
          if (!row.id || !row.body || !row.created_at) return;
          const incoming: MarketMessage = { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at, readAt: row.read_at };
          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) return current;
            const optimisticIndex = current.findIndex((message) => message.isPending && message.senderId === incoming.senderId && message.body === incoming.body);
            if (optimisticIndex === -1) return [...current, incoming];
            return current.map((message, index) => index === optimisticIndex ? incoming : message);
          });
          setConversations((current) => current.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, lastMessagePreview: incoming.body, lastMessageAt: incoming.createdAt, unreadCount: incoming.senderId === currentUserId ? 0 : conversation.unreadCount + 1 } : conversation));
          if (incoming.senderId !== currentUserId) void fetch(`/api/market/messages/${selectedConversationId}/read`, { method: "PATCH" }).catch(() => undefined);
        })
        .subscribe();
      return () => { void supabase.removeChannel(channel).catch(() => undefined); };
    } catch {
      // Realtime is optional: the sent message is still appended from the API response.
      return;
    }
  }, [currentUserId, selectedConversationId]);

  const openConversation = (conversationId: string) => router.push(`/market/dashboard/messages?conversation=${conversationId}`);
  const prepareOffer = () => {
    setDraft((current) => current.trim() ? current : "Hi, I'd like to make an offer for this item.");
    requestAnimationFrame(() => composerRef.current?.focus());
  };
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedConversationId || isSending) return;
    const optimisticMessage: MarketMessage = {
      id: `pending-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      conversationId: selectedConversationId,
      senderId: currentUserId,
      recipientId: selectedConversation?.counterpart.id ?? "",
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
      isPending: true,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setConversations((current) => current.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, lastMessagePreview: body, lastMessageAt: optimisticMessage.createdAt } : conversation));
    setDraft("");
    setIsSending(true);
    setSendError(null);
    try {
      const response = await fetch("/api/market/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selectedConversationId, body }) });
      const payload = await response.json().catch(() => null) as { error?: string; message?: { id: string; conversation_id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null } } | null;
      if (!response.ok || !payload?.message) {
        setSendError(payload?.error ?? "Unable to send your message.");
        setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
        setDraft(body);
        return;
      }
      const message: MarketMessage = { id: payload.message.id, conversationId: payload.message.conversation_id, senderId: payload.message.sender_id, recipientId: payload.message.recipient_id, body: payload.message.body, createdAt: payload.message.created_at, readAt: payload.message.read_at };
      setMessages((current) => {
        const withoutOptimistic = current.filter((item) => item.id !== optimisticMessage.id);
        return withoutOptimistic.some((item) => item.id === message.id) ? withoutOptimistic : [...withoutOptimistic, message];
      });
      setConversations((current) => current.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, lastMessagePreview: message.body, lastMessageAt: message.createdAt } : conversation));
    } catch {
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      setDraft(body);
      setSendError("Unable to reach the messaging service. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className={`messages-page ${selectedConversation ? "has-selected-conversation" : ""}`}>
      <section className="messages-list-panel" aria-label="Conversations">
        <header className="messages-list-header"><div><p>Marketplace</p><h1>Messages</h1></div><span>{conversations.reduce((total, conversation) => total + conversation.unreadCount, 0) || ""}</span></header>
        <div className="messages-filter-row"><button className="is-active" type="button">All</button><button type="button">Unread</button><button type="button">Buying</button><button type="button">Selling</button></div>
        <div className="messages-conversation-list">
          {conversations.length ? conversations.map((conversation) => <button className={`messages-conversation ${conversation.id === selectedConversationId ? "is-active" : ""}`} type="button" key={conversation.id} onClick={() => openConversation(conversation.id)}>
            <Avatar className="messages-avatar" name={conversation.counterpart.name} src={conversation.counterpart.avatarUrl} />
            <span className="messages-conversation-copy"><span><strong>{conversation.counterpart.name}</strong><time suppressHydrationWarning>{formatListTime(conversation.lastMessageAt)}</time></span><em>{conversation.listing.title}</em><small>{conversation.lastMessagePreview || "Start the conversation"}</small></span>
            {conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}
          </button>) : <div className="messages-empty-list"><i className="fa-regular fa-comment-dots" aria-hidden="true" /><strong>No messages yet</strong><span>Start a conversation from any listing.</span></div>}
        </div>
      </section>

      <section className="messages-thread-panel" aria-label="Conversation">
        {selectedConversation ? <>
          <header className="messages-thread-header"><button className="messages-mobile-back" type="button" aria-label="Back to conversations" onClick={() => router.replace("/market/dashboard/messages", { scroll: false })}><i className="fa-solid fa-arrow-left" aria-hidden="true" /></button><Avatar className="messages-avatar" name={selectedConversation.counterpart.name} src={selectedConversation.counterpart.avatarUrl} /><div><strong>{selectedConversation.counterpart.name}</strong><span>{selectedConversation.role === "buying" ? "Seller" : "Buyer"}</span></div><a href={`/market/${selectedConversation.listing.id}`} className="messages-listing-context">{selectedConversation.listing.imageUrl ? <Image src={selectedConversation.listing.imageUrl} alt="" width={42} height={42} /> : <i className="fa-regular fa-image" aria-hidden="true" />}<span><b>{selectedConversation.listing.title}</b><small>{selectedConversation.listing.price}</small></span><i className="fa-solid fa-chevron-right" aria-hidden="true" /></a></header>
          <div className="messages-thread-body">
            {messages.length ? messages.map((message) => <article className={`message-bubble ${message.senderId === currentUserId ? "is-mine" : ""}`} key={message.id}><p>{message.body}</p><span><time suppressHydrationWarning>{formatMessageTime(message.createdAt)}</time>{message.senderId === currentUserId ? <i className={`fa-solid ${message.readAt ? "fa-check-double" : "fa-check"}`} aria-label={message.readAt ? "Read" : "Sent"} /> : null}</span></article>) : <div className="messages-thread-empty"><i className="fa-regular fa-handshake" aria-hidden="true" /><strong>Start the conversation</strong><span>Ask about the item, pickup, or delivery details.</span></div>}
            <div ref={bottomRef} />
          </div>
          <form className="messages-composer" onSubmit={sendMessage}><button className="messages-offer-button" type="button" aria-label="Prepare an offer" onClick={prepareOffer}><i className="fa-solid fa-tag" aria-hidden="true" /></button><textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." rows={1} maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="submit" disabled={!draft.trim() || isSending} aria-label="Send message"><i className="fa-solid fa-paper-plane" aria-hidden="true" /></button>{sendError ? <p role="alert">{sendError}</p> : null}</form>
        </> : <div className="messages-select-empty"><i className="fa-regular fa-comments" aria-hidden="true" /><h2>Select a conversation</h2><p>Your messages about marketplace listings will appear here.</p></div>}
      </section>
    </main>
  );
}
