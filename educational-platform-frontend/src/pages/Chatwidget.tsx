import React, { useEffect, useMemo, useRef, useState } from 'react';
import { chatOpenAI, type ChatMessage } from './chatApi';
import '../css/ChatWidget.css';

type Palette = {
  primary?: string;   // header + FAB background (ex: orange)
  accent?: string;    // avatar + details (ex: violet)
  textOnPrimary?: string;
  bubbleBg?: string;  // assistant bubble background
  userBubbleBg?: string;
  border?: string;    // outline for teaser balloon
};

interface ChatWidgetProps {
  brandName?: string;
  welcomeText?: string;
  palette?: Palette;
  position?: 'right' | 'left';
  storageKey?: string; // localStorage key for history
}

export default function ChatWidget({
  brandName = 'EduPlatform',
  welcomeText = "Bonjour, je suis  Assistant IA (Alexandra), informations et inscriptions, n'hésitez-pas!",
  palette,
  position = 'right',
  storageKey = 'widget_chat_history'
}: ChatWidgetProps) {
  const colors = useMemo(
    () => ({
      primary: palette?.primary ?? '#f97316', // orange
      accent: palette?.accent ?? '#7c3aed',   // violet
      textOnPrimary: palette?.textOnPrimary ?? '#ffffff',
      bubbleBg: palette?.bubbleBg ?? 'rgba(59,130,246,0.08)', // bleu pâle
      userBubbleBg: palette?.userBubbleBg ?? 'rgba(124,58,237,0.12)',
      border: palette?.border ?? '#f97316'
    }),
    [palette]
  );

  // States
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw
        ? (JSON.parse(raw) as ChatMessage[])
        : [{ role: 'assistant', content: welcomeText }];
    } catch {
      return [{ role: 'assistant', content: welcomeText }];
    }
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Persist and autoscroll
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, storageKey]);

  // Teaser balloon logic (once per session)
  useEffect(() => {
    const dismissed = sessionStorage.getItem('chat_teaser_dismissed');
    if (!dismissed) {
      setShowTeaser(true);
      const t = setTimeout(() => setShowTeaser(false), 10000);
      return () => clearTimeout(t);
    }
  }, []);

  const dismissTeaser = () => {
    setShowTeaser(false);
    sessionStorage.setItem('chat_teaser_dismissed', '1');
  };

  const openPanel = () => {
    setOpen(true);
    dismissTeaser();
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    const next = [...messages, { role: 'user', content: q } as ChatMessage];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await chatOpenAI({ question: q, history: next, stream: false });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.output }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Désolé, une erreur est survenue: ${e?.message || e}` }
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  // Inline CSS variables for theming
  const styleVars: React.CSSProperties = {
    ['--chat-primary' as any]: colors.primary,
    ['--chat-accent' as any]: colors.accent,
    ['--chat-text-on-primary' as any]: colors.textOnPrimary,
    ['--chat-bubble-bg' as any]: colors.bubbleBg,
    ['--chat-user-bubble-bg' as any]: colors.userBubbleBg,
    ['--chat-border' as any]: colors.border
  };

  return (
    <div className={`chat-widget-root ${position === 'left' ? 'left' : 'right'}`} style={styleVars}>
      {/* Floating Action Button */}
      <button
        className="chat-fab"
        aria-label="Ouvrir le chat"
        onClick={() => (open ? setOpen(false) : openPanel())}
        title={open ? 'Fermer' : 'Discuter avec nous'}
      >
        {!open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H8l-4 5v-15.5Z" stroke="white" strokeWidth="1.6" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* Teaser speech balloon */}
      {showTeaser && !open && (
        <div className="chat-teaser">
          <div className="teaser-avatar">∴</div>
          <button className="teaser-close" onClick={dismissTeaser} aria-label="Fermer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="teaser-bubble">
            {welcomeText}
          </div>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-brand">
              <div className="brand-avatar">∴</div>
              <div>
                <div className="brand-name">{brandName}</div>
                <div className="brand-sub">Nous répondons généralement en quelques minutes</div>
              </div>
            </div>
            <button className="header-close" onClick={() => setOpen(false)} aria-label="Fermer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="chat-body">
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} className={`msg-row ${isUser ? 'right' : 'left'}`}>
                  {!isUser && <div className="msg-avatar">∴</div>}
                  <div className={`msg-bubble ${isUser ? 'user' : 'ai'}`}>{m.content}</div>
                </div>
              );
            })}
            {sending && <div className="typing">Alexandra rédige une réponse…</div>}
            <div ref={endRef} />
          </div>

          <div className="chat-input-bar">
            <input
              className="chat-input"
              placeholder="Écrire un message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
            />
            <button className="send-btn" onClick={send} disabled={sending || !input.trim()} aria-label="Envoyer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 12l16-8-6 8 6 8-16-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}