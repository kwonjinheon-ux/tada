"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { marketMessageResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

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

export type TradeOffer = {
  id: string;
  conversationId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountCents: number;
  note: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  createdAt: string;
  respondedAt: string | null;
  completedAt: string | null;
};

type Props = {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  initialMessages: MarketMessage[];
  initialOffers: TradeOffer[];
  currentUserId: string;
};

type ConversationFilter = "all" | "unread" | "buying" | "selling";

const CONVERSATION_FILTERS: ConversationFilter[] = ["all", "unread", "buying", "selling"];

function matchesFilter(conversation: ConversationSummary, filter: ConversationFilter) {
  if (filter === "unread") return conversation.unreadCount > 0;
  if (filter === "buying" || filter === "selling") return conversation.role === filter;
  return true;
}

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

function formatOfferAmount(amountCents: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2 }).format(amountCents / 100);
}

function Avatar({ name, src, className }: { name: string; src: string | null; className: string }) {
  return src ? <img className={className} src={src} alt="" /> : <span className={className}>{name.charAt(0).toUpperCase()}</span>;
}

export function MarketMessagesClient({ conversations: initialConversations, selectedConversationId, initialMessages, initialOffers, currentUserId }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState(initialMessages);
  const [offers, setOffers] = useState(initialOffers);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [updatingOfferId, setUpdatingOfferId] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const threadBodyRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const refreshFrameRef = useRef<number | null>(null);
  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null, [conversations, selectedConversationId]);
  const visibleConversations = useMemo(() => conversations.filter((conversation) => matchesFilter(conversation, filter)), [conversations, filter]);
  const totalUnreadCount = useMemo(() => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0), [conversations]);

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setOffers(initialOffers);
  }, [initialOffers]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    const threadBody = threadBodyRef.current;
    if (!threadBody) return;
    const frame = window.requestAnimationFrame(() => {
      threadBody.scrollTo({ top: threadBody.scrollHeight });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, offers]);

  useEffect(() => {
    router.prefetch("/market/dashboard/messages");
  }, [router]);

  useEffect(() => () => {
    if (refreshFrameRef.current !== null) window.cancelAnimationFrame(refreshFrameRef.current);
  }, []);

  useEffect(() => {
    let wasKeyboardOpen = false;
    const updateMobileViewport = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
      document.documentElement.style.setProperty("--messages-viewport-height", `${viewportHeight}px`);
      document.documentElement.style.setProperty("--messages-viewport-offset-top", `${viewportOffsetTop}px`);
      // window.innerHeight stays at the layout viewport height while the keyboard shrinks the visual one,
      // so the leftover is the keyboard inset. The thread claims the full visual viewport while it is up.
      const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop);
      const isKeyboardOpen = keyboardInset > 120;
      document.documentElement.classList.toggle("messages-keyboard-open", isKeyboardOpen);
      if (isKeyboardOpen !== wasKeyboardOpen) {
        wasKeyboardOpen = isKeyboardOpen;
        const threadBody = threadBodyRef.current;
        if (threadBody) window.requestAnimationFrame(() => threadBody.scrollTo({ top: threadBody.scrollHeight }));
      }
    };
    const updateHeaderHeight = () => {
      const siteHeader = document.querySelector<HTMLElement>(".site-header");
      document.documentElement.style.setProperty("--messages-site-header-height", `${siteHeader?.getBoundingClientRect().height ?? 0}px`);
    };
    updateMobileViewport();
    updateHeaderHeight();
    // visualViewport.scroll fires during iOS's pan-into-view on input focus, which changes
    // offsetTop without necessarily firing resize — both listeners are needed to track it.
    window.visualViewport?.addEventListener("resize", updateMobileViewport);
    window.visualViewport?.addEventListener("scroll", updateMobileViewport);
    if (!window.visualViewport) window.addEventListener("resize", updateMobileViewport);
    const siteHeader = document.querySelector<HTMLElement>(".site-header");
    const headerObserver = siteHeader ? new ResizeObserver(updateHeaderHeight) : null;
    if (siteHeader && headerObserver) headerObserver.observe(siteHeader);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateMobileViewport);
      window.visualViewport?.removeEventListener("scroll", updateMobileViewport);
      if (!window.visualViewport) window.removeEventListener("resize", updateMobileViewport);
      headerObserver?.disconnect();
      document.documentElement.classList.remove("messages-keyboard-open");
      document.documentElement.style.removeProperty("--messages-viewport-height");
      document.documentElement.style.removeProperty("--messages-viewport-offset-top");
      document.documentElement.style.removeProperty("--messages-site-header-height");
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    void fetch(`/api/market/messages/${selectedConversationId}/read`, { method: "PATCH" }).catch(() => undefined);
    setConversations((current) => current.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, unreadCount: 0 } : conversation));
  }, [selectedConversationId]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    let isActive = true;
    let hasConnectedBefore = false;
    let reconnectAttempt = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refreshConversationList = () => {
      if (refreshFrameRef.current !== null) return;
      refreshFrameRef.current = window.requestAnimationFrame(() => {
        refreshFrameRef.current = null;
        router.refresh();
      });
    };

    const handleIncomingMessage = (payload: { new: unknown }) => {
      const row = payload.new as { id: string; conversation_id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
      if (!row.id || !row.conversation_id || !row.body || !row.created_at) return;
      const incoming: MarketMessage = { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at, readAt: row.read_at };
      if (incoming.conversationId === selectedConversationIdRef.current) {
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
        void fetch(`/api/market/messages/${incoming.conversationId}/read`, { method: "PATCH" }).catch(() => undefined);
      }
      setConversations((current) => {
        const conversation = current.find((item) => item.id === incoming.conversationId);
        if (!conversation) {
          refreshConversationList();
          return current;
        }
        const isActiveConversation = incoming.conversationId === selectedConversationIdRef.current;
        return current.map((item) => item.id === incoming.conversationId ? { ...item, lastMessagePreview: incoming.body, lastMessageAt: incoming.createdAt, unreadCount: isActiveConversation ? 0 : item.unreadCount + 1 } : item);
      });
    };

    const handleReadReceiptUpdate = (payload: { new: unknown }) => {
      const row = payload.new as { id: string; conversation_id: string; read_at: string | null };
      if (!row.id || !row.conversation_id || row.conversation_id !== selectedConversationIdRef.current) return;
      setMessages((current) => current.map((message) => message.id === row.id ? { ...message, readAt: row.read_at } : message));
    };

    const handleIncomingOffer = (payload: { new: unknown }) => {
      const row = payload.new as { id: string; conversation_id: string; listing_id: string; buyer_id: string; seller_id: string; amount_cents: number; note: string | null; status: TradeOffer["status"]; created_at: string; responded_at: string | null; completed_at: string | null };
      if (!row.id || !row.conversation_id || !row.status) return;
      const incoming: TradeOffer = { id: row.id, conversationId: row.conversation_id, listingId: row.listing_id, buyerId: row.buyer_id, sellerId: row.seller_id, amountCents: row.amount_cents, note: row.note, status: row.status, createdAt: row.created_at, respondedAt: row.responded_at, completedAt: row.completed_at };
      if (incoming.conversationId === selectedConversationIdRef.current) setOffers((current) => current.some((offer) => offer.id === incoming.id) ? current.map((offer) => offer.id === incoming.id ? incoming : offer) : [...current, incoming]);
      setConversations((current) => {
        if (current.some((conversation) => conversation.id === incoming.conversationId)) return current;
        refreshConversationList();
        return current;
      });
    };

    const connect = () => {
      if (!isActive) return;
      try {
        channel = supabase
          .channel(`market-conversation-live:${currentUserId}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_messages", filter: `recipient_id=eq.${currentUserId}` }, handleIncomingMessage)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_messages", filter: `sender_id=eq.${currentUserId}` }, handleReadReceiptUpdate)
          .on("postgres_changes", { event: "*", schema: "public", table: "market_trade_offers", filter: `buyer_id=eq.${currentUserId}` }, handleIncomingOffer)
          .on("postgres_changes", { event: "*", schema: "public", table: "market_trade_offers", filter: `seller_id=eq.${currentUserId}` }, handleIncomingOffer)
          .subscribe((status) => {
            if (!isActive) return;
            if (status === "SUBSCRIBED") {
              reconnectAttempt = 0;
              if (hasConnectedBefore) refreshConversationList();
              hasConnectedBefore = true;
              return;
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              const failedChannel = channel;
              channel = null;
              if (failedChannel) void supabase.removeChannel(failedChannel).catch(() => undefined);
              const delay = Math.min(1000 * 2 ** reconnectAttempt, 20000);
              reconnectAttempt += 1;
              reconnectTimeout = setTimeout(connect, delay);
            }
          });
      } catch {
        // Realtime unavailable in this environment; the page still works via server-rendered data and refresh-on-focus below.
      }
    };
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshConversationList();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      if (reconnectTimeout !== null) clearTimeout(reconnectTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) void supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [currentUserId, router]);

  const openConversation = (conversationId: string) => {
    if (conversationId === selectedConversationIdRef.current) return;
    router.push(`/market/dashboard/messages?conversation=${conversationId}`);
  };
  const updateOffer = async (offer: TradeOffer, action: "accept" | "decline" | "cancel" | "complete") => {
    if (updatingOfferId) return;
    setUpdatingOfferId(offer.id);
    setOfferError(null);
    try {
      const response = await fetch(`/api/market/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null) as { offer?: { id: string; conversation_id: string; listing_id: string; buyer_id: string; seller_id: string; amount_cents: number; note: string | null; status: TradeOffer["status"]; created_at: string; responded_at: string | null; completed_at: string | null }; error?: string } | null;
      if (!response.ok || !payload?.offer) {
        setOfferError(payload?.error ?? "Unable to update this offer.");
        return;
      }
      const nextOffer: TradeOffer = { id: payload.offer.id, conversationId: payload.offer.conversation_id, listingId: payload.offer.listing_id, buyerId: payload.offer.buyer_id, sellerId: payload.offer.seller_id, amountCents: payload.offer.amount_cents, note: payload.offer.note, status: payload.offer.status, createdAt: payload.offer.created_at, respondedAt: payload.offer.responded_at, completedAt: payload.offer.completed_at };
      setOffers((current) => current.map((item) => item.id === nextOffer.id ? nextOffer : item));
    } catch {
      setOfferError("Unable to reach offers right now. Please try again.");
    } finally {
      setUpdatingOfferId(null);
    }
  };
  const markAllRead = async () => {
    if (!totalUnreadCount || isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    const readAt = new Date().toISOString();
    setConversations((current) => current.map((conversation) => conversation.unreadCount ? { ...conversation, unreadCount: 0 } : conversation));
    setMessages((current) => current.map((message) => message.recipientId === currentUserId && !message.readAt ? { ...message, readAt } : message));
    await fetch("/api/market/messages/read-all", { method: "PATCH" }).catch(() => undefined);
    setIsMarkingAllRead(false);
  };
  const prepareOffer = () => {
    setDraft((current) => current.trim() ? current : "Hi, I'd like to make an offer for this item.");
    requestAnimationFrame(() => composerRef.current?.focus());
  };
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedConversationId || sendingRef.current) return;
    sendingRef.current = true;
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
      const result = await readApiResponse(response, marketMessageResponseSchema);
      if (!result.data) {
        setSendError(result.error?.message ?? "Unable to send your message.");
        setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
        setDraft(body);
        return;
      }
      const message: MarketMessage = result.data;
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
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <main className={`messages-page ${selectedConversation ? "has-selected-conversation" : ""}`}>
      <section className="messages-list-panel" aria-label="Conversations">
        <header className="messages-list-header">
          <div><p>{t("marketplace")}</p><div className="messages-list-title"><h1>{t("messages")}</h1><span>{totalUnreadCount || ""}</span></div></div>
          <button className="messages-read-all" type="button" disabled={!totalUnreadCount || isMarkingAllRead} onClick={() => void markAllRead()}>
            <i className="fa-regular fa-envelope-open" aria-hidden="true" />
            {t("markAllRead")}
          </button>
        </header>
        <div className="messages-filter-row" role="tablist" aria-label="Filter conversations">
          {CONVERSATION_FILTERS.map((option) => <button className={filter === option ? "is-active" : ""} type="button" key={option} role="tab" aria-selected={filter === option} onClick={() => setFilter(option)}>{t(option)}</button>)}
        </div>
        <div className="messages-conversation-list">
          {visibleConversations.length ? visibleConversations.map((conversation) => <button className={`messages-conversation ${conversation.id === selectedConversationId ? "is-active" : ""}`} type="button" key={conversation.id} onClick={() => openConversation(conversation.id)}>
            {conversation.listing.imageUrl
              ? <Image className="messages-listing-thumbnail" src={conversation.listing.imageUrl} alt="" width={52} height={52} />
              : <span className="messages-listing-thumbnail"><i className="fa-regular fa-image" aria-hidden="true" /></span>}
            <span className="messages-conversation-copy">
              <span><strong>{conversation.listing.title}</strong><time suppressHydrationWarning>{formatListTime(conversation.lastMessageAt)}</time></span>
              <em>{conversation.counterpart.name} · {conversation.role === "buying" ? "Seller" : "Buyer"}</em>
              <span className="messages-conversation-preview">
                <small>{conversation.lastMessagePreview || "Start the conversation"}</small>
                {conversation.unreadCount ? <b aria-label={`${conversation.unreadCount} unread`}>{conversation.unreadCount}</b> : null}
              </span>
            </span>
          </button>) : conversations.length
            ? <div className="messages-empty-list"><i className="fa-regular fa-comment-dots" aria-hidden="true" /><strong>{filter === "unread" ? "No unread messages" : filter === "buying" ? "Nothing you're buying" : "Nothing you're selling"}</strong><span>{filter === "unread" ? "You're all caught up." : "Switch to All to see your other conversations."}</span></div>
            : <div className="messages-empty-list"><i className="fa-regular fa-comment-dots" aria-hidden="true" /><strong>No messages yet</strong><span>Start a conversation from any listing.</span></div>}
        </div>
      </section>

      <section className="messages-thread-panel" aria-label="Conversation">
        {selectedConversation ? <>
          <header className="messages-thread-header">
            <Link className="messages-mobile-back" href="/market/dashboard/messages" aria-label="Back to conversations"><i className="fa-solid fa-arrow-left" aria-hidden="true" /></Link>
            <a href={`/market/${selectedConversation.listing.id}`} className="messages-listing-context">
              {selectedConversation.listing.imageUrl ? <Image src={selectedConversation.listing.imageUrl} alt="" width={48} height={48} /> : <i className="fa-regular fa-image" aria-hidden="true" />}
              <span><b>{selectedConversation.listing.title}</b><small>{selectedConversation.listing.price}</small></span>
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </a>
            <div className="messages-thread-counterpart">
              <Avatar className="messages-avatar" name={selectedConversation.counterpart.name} src={selectedConversation.counterpart.avatarUrl} />
              <span><strong>{selectedConversation.counterpart.name}</strong><small>{selectedConversation.role === "buying" ? "Seller" : "Buyer"}</small></span>
            </div>
          </header>
          <div className="messages-thread-body" ref={threadBodyRef}>
            {offerError ? <p className="trade-offer-error" role="alert">{offerError}</p> : null}
            {offers.length ? offers.map((offer) => {
              const isBuyer = offer.buyerId === currentUserId;
              const isSeller = offer.sellerId === currentUserId;
              const isUpdating = updatingOfferId === offer.id;
              return <article className={`trade-offer-card status-${offer.status}`} key={offer.id}><div><span>{offer.status}</span><strong>{formatOfferAmount(offer.amountCents)}</strong></div>{offer.note ? <p>{offer.note}</p> : null}<small>{offer.status === "completed" ? "Trade complete. Both members received 10 trust points." : offer.status === "accepted" ? "Accepted. Meet safely, then buyer confirms completion." : offer.status === "pending" ? "Waiting for seller response." : "This offer is closed."}</small><footer>{offer.status === "pending" && isSeller ? <><button type="button" disabled={isUpdating} onClick={() => void updateOffer(offer, "accept")}>Accept</button><button type="button" disabled={isUpdating} onClick={() => void updateOffer(offer, "decline")}>Decline</button></> : null}{offer.status === "pending" && isBuyer ? <button type="button" disabled={isUpdating} onClick={() => void updateOffer(offer, "cancel")}>Cancel offer</button> : null}{offer.status === "accepted" && isBuyer ? <button type="button" disabled={isUpdating} onClick={() => void updateOffer(offer, "complete")}>Confirm trade complete</button> : null}{offer.status === "accepted" && isSeller ? <span>Waiting for buyer confirmation</span> : null}</footer></article>;
            }) : null}
            {messages.length ? messages.map((message) => <article className={`message-bubble ${message.senderId === currentUserId ? "is-mine" : ""}`} key={message.id}><p>{message.body}</p><span><time suppressHydrationWarning>{formatMessageTime(message.createdAt)}</time>{message.senderId === currentUserId ? <i className={`fa-solid ${message.readAt ? "fa-check-double" : "fa-check"}`} aria-label={message.readAt ? "Read" : "Sent"} /> : null}</span></article>) : !offers.length ? <div className="messages-thread-empty"><i className="fa-regular fa-handshake" aria-hidden="true" /><strong>Start the conversation</strong><span>Ask about the item, pickup, or delivery details.</span></div> : null}
          </div>
          <form className="messages-composer" onSubmit={sendMessage}><button className="messages-offer-button" type="button" onClick={prepareOffer}>Purchase</button><textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." rows={1} maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="submit" disabled={!draft.trim() || isSending} aria-label="Send message"><i className="fa-solid fa-paper-plane" aria-hidden="true" /></button>{sendError ? <p role="alert">{sendError}</p> : null}</form>
        </> : <div className="messages-select-empty"><i className="fa-regular fa-comments" aria-hidden="true" /><h2>Select a conversation</h2><p>Your messages about marketplace listings will appear here.</p></div>}
      </section>
    </main>
  );
}
