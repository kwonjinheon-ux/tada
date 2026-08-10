"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { marketConversationBulkResponseSchema, marketMessageResponseSchema } from "@/contracts/api";
import { readApiResponse } from "@/lib/api/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { useLanguage } from "@/components/LanguageProvider";

export type ConversationSummary = {
  id: string;
  listing: { id: string; title: string; price: string; imageUrl: string | null };
  counterpart: { id: string; name: string; avatarUrl: string | null };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  role: "buying" | "selling";
  archivedAt: string | null;
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

type ConversationFilter = "all" | "unread" | "buying" | "selling" | "archived";

const CONVERSATION_FILTERS: ConversationFilter[] = ["all", "unread", "buying", "selling", "archived"];

// Archived conversations live in their own tab: every other filter describes the
// inbox, so they would otherwise reappear in the list the user filed them out of.
function matchesFilter(conversation: ConversationSummary, filter: ConversationFilter) {
  if (filter === "archived") return Boolean(conversation.archivedAt);
  if (conversation.archivedAt) return false;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [pendingDeleteScope, setPendingDeleteScope] = useState<"selection" | "everything" | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerDialogError, setOfferDialogError] = useState<string | null>(null);
  const threadBodyRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const refreshFrameRef = useRef<number | null>(null);
  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null, [conversations, selectedConversationId]);
  const hasSelectedConversation = Boolean(selectedConversation);
  const visibleConversations = useMemo(() => conversations.filter((conversation) => matchesFilter(conversation, filter)), [conversations, filter]);
  const totalUnreadCount = useMemo(() => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0), [conversations]);
  const visibleIds = useMemo(() => visibleConversations.map((conversation) => conversation.id), [visibleConversations]);
  const selectedVisibleIds = useMemo(() => visibleIds.filter((id) => selectedIds.includes(id)), [visibleIds, selectedIds]);
  const isViewingArchive = filter === "archived";

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
    const root = document.documentElement;
    root.classList.toggle("messages-thread-active", hasSelectedConversation);
    return () => root.classList.remove("messages-thread-active");
  }, [hasSelectedConversation]);

  useEffect(() => {
    const root = document.documentElement;
    let wasKeyboardOpen = false;
    // Some mobile browsers shrink both innerHeight and visualViewport.height when
    // the keyboard opens. Keep the last keyboard-free height so that case is
    // still measured rather than relying on focus state.
    let keyboardFreeViewportHeight = Math.max(window.innerHeight, window.visualViewport?.height ?? 0);
    const updateMobileViewport = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
      const keyboardInset = Math.max(0, window.innerHeight - viewportHeight, keyboardFreeViewportHeight - viewportHeight);
      const isKeyboardOpen = keyboardInset > 120;
      if (!isKeyboardOpen) keyboardFreeViewportHeight = Math.max(window.innerHeight, viewportHeight);
      root.style.setProperty("--messages-viewport-height", `${viewportHeight}px`);
      root.style.setProperty("--messages-viewport-offset-top", `${viewportOffsetTop}px`);
      root.classList.toggle("messages-keyboard-open", isKeyboardOpen);
      if (isKeyboardOpen !== wasKeyboardOpen) {
        wasKeyboardOpen = isKeyboardOpen;
        const threadBody = threadBodyRef.current;
        if (threadBody) window.requestAnimationFrame(() => threadBody.scrollTo({ top: threadBody.scrollHeight }));
      }
    };
    const updateHeaderHeight = () => {
      const siteHeader = document.querySelector<HTMLElement>(".site-header");
      root.style.setProperty("--messages-site-header-height", `${siteHeader?.getBoundingClientRect().height ?? 0}px`);
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
      root.classList.remove("messages-keyboard-open");
      root.style.removeProperty("--messages-viewport-height");
      root.style.removeProperty("--messages-viewport-offset-top");
      root.style.removeProperty("--messages-site-header-height");
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
    setBulkError(null);
    const readAt = new Date().toISOString();
    const previousConversations = conversations;
    const previousMessages = messages;
    setConversations((current) => current.map((conversation) => conversation.unreadCount ? { ...conversation, unreadCount: 0 } : conversation));
    setMessages((current) => current.map((message) => message.recipientId === currentUserId && !message.readAt ? { ...message, readAt } : message));
    try {
      const response = await fetch("/api/market/messages/read-all", { method: "PATCH" });
      if (!response.ok) throw new Error("Unable to mark messages as read.");
      router.refresh();
    } catch {
      setConversations(previousConversations);
      setMessages(previousMessages);
      setBulkError("Unable to mark messages as read. Please try again.");
    } finally {
      setIsMarkingAllRead(false);
    }
  };
  const exitSelection = () => {
    setIsSelecting(false);
    setSelectedIds([]);
    setPendingDeleteScope(null);
  };
  const toggleSelection = (conversationId: string) => {
    setSelectedIds((current) => current.includes(conversationId) ? current.filter((id) => id !== conversationId) : [...current, conversationId]);
    setPendingDeleteScope(null);
  };
  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => selectedVisibleIds.length === visibleIds.length ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]);
    setPendingDeleteScope(null);
  };

  const runBulkAction = async (
    endpoint: "archive" | "delete",
    body: Record<string, unknown>,
    apply: (conversationIds: string[]) => void,
    failureMessage: string,
  ) => {
    if (isBulkPending) return;
    setIsBulkPending(true);
    setBulkError(null);
    try {
      const response = await fetch(`/api/market/messages/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await readApiResponse(response, marketConversationBulkResponseSchema);
      if (!result.data) {
        setBulkError(result.error?.message ?? failureMessage);
        return;
      }
      apply(result.data.conversationIds);
      exitSelection();
      // The thread pane is showing a conversation that may no longer be in view.
      if (selectedConversationId && result.data.conversationIds.includes(selectedConversationId)) router.push("/market/dashboard/messages");
      else router.refresh();
    } catch {
      setBulkError(failureMessage);
    } finally {
      setIsBulkPending(false);
    }
  };

  const archiveConversations = (conversationIds: string[], archived: boolean) => void runBulkAction(
    "archive",
    { conversationIds, archived },
    (applied) => {
      const archivedAt = archived ? new Date().toISOString() : null;
      const target = new Set(applied);
      setConversations((current) => current.map((conversation) => target.has(conversation.id) ? { ...conversation, archivedAt } : conversation));
    },
    archived ? "Unable to archive these conversations." : "Unable to restore these conversations.",
  );

  const deleteConversations = (body: Record<string, unknown>) => void runBulkAction(
    "delete",
    body,
    (applied) => {
      const target = new Set(applied);
      setConversations((current) => current.filter((conversation) => !target.has(conversation.id)));
    },
    "Unable to delete these conversations.",
  );

  // Purchase opens the same offer dialog as the listing page rather than drafting a
  // message, so a buyer can strike the deal without leaving the thread. The accepted
  // offer then arrives back in this thread as a trade card over realtime.
  const openOfferDialog = () => {
    if (!selectedConversation) return;
    setOfferAmount((current) => current || selectedConversation.listing.price.replace(/[^0-9.]/g, ""));
    setOfferNote("");
    setOfferDialogError(null);
    setIsOfferDialogOpen(true);
  };

  const submitOffer = async () => {
    if (isSubmittingOffer || !selectedConversation) return;
    const amount = Number(offerAmount);
    const amountCents = Math.round(amount * 100);
    if (!offerAmount.trim() || !Number.isFinite(amount) || amountCents < 0) {
      setOfferDialogError("Enter a valid offer amount.");
      return;
    }
    setIsSubmittingOffer(true);
    setOfferDialogError(null);
    try {
      const response = await fetch("/api/market/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedConversation.listing.id, amountCents, note: offerNote }),
      });
      const payload = await response.json().catch(() => null) as { conversationId?: string; error?: string } | null;
      if (response.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/market/dashboard/messages?conversation=${selectedConversation.id}`)}`);
        return;
      }
      if (!response.ok || !payload?.conversationId) {
        setOfferDialogError(payload?.error ?? "Unable to make an offer right now.");
        return;
      }
      setIsOfferDialogOpen(false);
      setOfferNote("");
      router.refresh();
    } catch {
      setOfferDialogError("Unable to reach the offers service. Please try again.");
    } finally {
      setIsSubmittingOffer(false);
    }
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
          <button className="bulk-action-button is-compact" type="button" disabled={!totalUnreadCount || isMarkingAllRead} onClick={() => void markAllRead()}>
            <i className="fa-regular fa-envelope-open" aria-hidden="true" />
            {t("markAllRead")}
          </button>
        </header>
        <div className="messages-filter-row" role="tablist" aria-label="Filter conversations">
          {CONVERSATION_FILTERS.map((option) => <button className={filter === option ? "is-active" : ""} type="button" key={option} role="tab" aria-selected={filter === option} onClick={() => { setFilter(option); setPendingDeleteScope(null); }}>{t(option)}</button>)}
        </div>

        {isSelecting ? (
          <div className="messages-selection-bar" role="group" aria-label="Bulk conversation actions">
            <button className="messages-selection-toggle" type="button" onClick={toggleSelectAllVisible} disabled={!visibleIds.length}>
              <i className={`fa-regular ${selectedVisibleIds.length && selectedVisibleIds.length === visibleIds.length ? "fa-square-check" : "fa-square"}`} aria-hidden="true" />
              {selectedVisibleIds.length ? `${selectedVisibleIds.length} ${t("selected")}` : t("selectAll")}
            </button>
            <button className="bulk-action-button is-compact" type="button" disabled={!selectedVisibleIds.length || isBulkPending} onClick={() => archiveConversations(selectedVisibleIds, !isViewingArchive)}>
              <i className={`fa-solid ${isViewingArchive ? "fa-inbox" : "fa-box-archive"}`} aria-hidden="true" />
              {isViewingArchive ? t("restore") : t("archive")}
            </button>
            {pendingDeleteScope === "selection" ? (
              <button className="bulk-action-button is-compact is-danger" type="button" disabled={isBulkPending} onClick={() => deleteConversations({ conversationIds: selectedVisibleIds })}>
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                {t("deleteConfirm")}
              </button>
            ) : (
              <button className="bulk-action-button is-compact is-danger" type="button" disabled={!selectedVisibleIds.length || isBulkPending} onClick={() => setPendingDeleteScope("selection")}>
                <i className="fa-regular fa-trash-can" aria-hidden="true" />
                {t("delete")}
              </button>
            )}
            <button className="bulk-action-button is-compact" type="button" disabled={isBulkPending} onClick={exitSelection}>
              <i className="fa-solid fa-xmark" aria-hidden="true" />
              {t("cancel")}
            </button>
          </div>
        ) : null}

        {!isSelecting && visibleConversations.length ? (
          <div className="messages-selection-bar">
            <button className="messages-selection-toggle" type="button" onClick={() => setIsSelecting(true)}>
              <i className="fa-regular fa-square-check" aria-hidden="true" />
              {t("select")}
            </button>
            {pendingDeleteScope === "everything" ? (
              <>
                <button className="bulk-action-button is-compact is-danger" type="button" disabled={isBulkPending} onClick={() => deleteConversations({ scope: isViewingArchive ? "archived" : "inbox" })}>
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  {`${t("deleteConfirm")} (${visibleConversations.length})`}
                </button>
                <button className="bulk-action-button is-compact" type="button" disabled={isBulkPending} onClick={() => setPendingDeleteScope(null)}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                  {t("cancel")}
                </button>
              </>
            ) : (
              <button className="bulk-action-button is-compact is-danger" type="button" disabled={isBulkPending} onClick={() => setPendingDeleteScope("everything")}>
                <i className="fa-regular fa-trash-can" aria-hidden="true" />
                {isViewingArchive ? t("deleteArchived") : t("deleteAll")}
              </button>
            )}
          </div>
        ) : null}

        {bulkError ? <p className="messages-bulk-error" role="alert">{bulkError}</p> : null}
        <div className="messages-conversation-list">
          {visibleConversations.length ? visibleConversations.map((conversation) => <button className={`messages-conversation ${conversation.id === selectedConversationId && !isSelecting ? "is-active" : ""} ${isSelecting ? "is-selectable" : ""} ${selectedIds.includes(conversation.id) ? "is-selected" : ""}`} type="button" key={conversation.id} aria-pressed={isSelecting ? selectedIds.includes(conversation.id) : undefined} onClick={() => isSelecting ? toggleSelection(conversation.id) : openConversation(conversation.id)}>
            {isSelecting ? <span className="messages-conversation-check" aria-hidden="true"><i className={`fa-regular ${selectedIds.includes(conversation.id) ? "fa-square-check" : "fa-square"}`} /></span> : null}
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
            ? <div className="messages-empty-list"><i className={`fa-regular ${filter === "archived" ? "fa-box-archive" : "fa-comment-dots"}`} aria-hidden="true" /><strong>{filter === "unread" ? "No unread messages" : filter === "archived" ? "Nothing archived" : filter === "buying" ? "Nothing you're buying" : "Nothing you're selling"}</strong><span>{filter === "unread" ? "You're all caught up." : filter === "archived" ? "Archived conversations are kept for 60 days, then deleted." : "Switch to All to see your other conversations."}</span></div>
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
          <form className="messages-composer" onSubmit={sendMessage}>{selectedConversation.role === "buying" ? <button className="messages-offer-button" type="button" onClick={openOfferDialog}>Purchase</button> : null}<textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." rows={1} maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="submit" disabled={!draft.trim() || isSending} aria-label="Send message"><i className="fa-solid fa-paper-plane" aria-hidden="true" /></button>{sendError ? <p role="alert">{sendError}</p> : null}</form>
        </> : <div className="messages-select-empty"><i className="fa-regular fa-comments" aria-hidden="true" /><h2>Select a conversation</h2><p>Your messages about marketplace listings will appear here.</p></div>}
      </section>

      {isOfferDialogOpen && selectedConversation ? <DialogOverlay className="listing-offer-backdrop" aria-labelledby="messages-offer-title" onClose={() => setIsOfferDialogOpen(false)} isDismissible={!isSubmittingOffer}>
        <section className="listing-offer-dialog">
          <div className="listing-offer-dialog-icon"><i className="fa-solid fa-handshake" aria-hidden="true" /></div>
          <h2 id="messages-offer-title">Make an offer</h2>
          <p>Send a clear price to {selectedConversation.counterpart.name}. If they accept, you can confirm the trade and both members receive trust points.</p>
          <label><span>Offer amount</span><input type="number" min="0" step="0.01" inputMode="decimal" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} /></label>
          <label><span>Message</span><textarea value={offerNote} maxLength={500} rows={3} placeholder="Pickup time, delivery note, or anything useful..." onChange={(event) => setOfferNote(event.target.value)} /></label>
          {offerDialogError ? <p className="listing-offer-error" role="alert">{offerDialogError}</p> : null}
          <div>
            <button type="button" onClick={() => setIsOfferDialogOpen(false)} disabled={isSubmittingOffer}>Cancel</button>
            <button type="button" className="listing-offer-submit" onClick={() => void submitOffer()} disabled={isSubmittingOffer}>{isSubmittingOffer ? "Sending..." : "Send offer"}</button>
          </div>
        </section>
      </DialogOverlay> : null}
    </main>
  );
}
