import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot, faUser, faPaperPlane, faSpinner, faTag,
  faPlus, faTrash, faComments, faBars, faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { assistantService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AssistantPage.css';

// ── Shared rendering helpers (mirrors ChatWidget) ─────────────────────────────

const RichText = ({ text }) => {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('_') && part.endsWith('_'))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      })}
    </>
  );
};

const BubbleContent = ({ content }) =>
  content.split('\n').map((line, i) => {
    const isBullet = /^[\s]*[•*-]\s/.test(line);
    if (isBullet) {
      const text = line.trimStart().replace(/^[•*-]\s/, '');
      return (
        <div key={i} className="ap-bullet-line">
          <span className="ap-bullet-dot">•</span>
          <span><RichText text={text} /></span>
        </div>
      );
    }
    return (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        <RichText text={line} />
      </React.Fragment>
    );
  });

const Stars = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="ap-stars">
      {[1, 2, 3, 4, 5].map(i => {
        const cls = i <= full ? 'star-on' : (i === full + 1 && half ? 'star-half' : 'star-off');
        return <span key={i} className={`ap-star ${cls}`}>★</span>;
      })}
      <span className="ap-stars-val">{rating?.toFixed(1)}</span>
    </span>
  );
};

const ProductCard = ({ product }) => {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link to={`/product/${product.product_id}`} className="ap-product-card" target="_blank" rel="noreferrer">
      <div className="ap-product-img-wrap">
        {!imgErr
          ? <img src={product.image} alt={product.name} onError={() => setImgErr(true)} loading="lazy" />
          : <div className="ap-product-no-img">No Image</div>
        }
        {product.discount_pct > 0 && (
          <span className="ap-product-badge">
            <FontAwesomeIcon icon={faTag} /> {product.discount_pct}% OFF
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="ap-product-low-stock">Only {product.stock} left</span>
        )}
      </div>
      <div className="ap-product-body">
        <p className="ap-product-cat">{product.sub_category}</p>
        <p className="ap-product-name">
          {product.name.length > 52 ? product.name.slice(0, 52) + '…' : product.name}
        </p>
        <Stars rating={product.rating || 0} />
        <p className="ap-product-review-count">
          {product.no_of_ratings?.toLocaleString('en-GB')} reviews
        </p>
        <div className="ap-product-price-row">
          <span className="ap-product-price">£{product.price?.toFixed(2)}</span>
          {product.was && <span className="ap-product-was">£{product.was?.toFixed(2)}</span>}
        </div>
        <div className="ap-product-cta">View Product →</div>
      </div>
    </Link>
  );
};

const TypingIndicator = () => (
  <div className="ap-message ap-message--assistant">
    <span className="ap-avatar"><FontAwesomeIcon icon={faRobot} /></span>
    <div className="ap-bubble ap-bubble--typing"><span /><span /><span /></div>
  </div>
);

// ── Date grouping helpers ─────────────────────────────────────────────────────

function dateLabel(isoStr) {
  if (!isoStr) return 'Older';
  const d = new Date(isoStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Last 7 days';
  if (diffDays <= 30) return 'Last 30 days';
  return 'Older';
}

function groupByDate(convs) {
  const order = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'];
  const groups = {};
  for (const c of convs) {
    const label = dateLabel(c.updated_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  }
  return order.filter(k => groups[k]).map(k => ({ label: k, items: groups[k] }));
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm Vera, your personal Velour shopping assistant. What can I help you with today?",
  options: ['Find a product', 'My orders', 'Delivery & returns', 'Gift ideas'],
  products: [],
};

// ── Main page ─────────────────────────────────────────────────────────────────

const AssistantPage = () => {
  const { isAuthenticated } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [activeSessionId, setActiveSessionId] = useState(null); // the session_id currently displayed
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingProductId, setPendingProductId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load conversation list ──────────────────────────────────────────────
  const refreshList = useCallback(() => {
    const savedUser = localStorage.getItem('user');
    const userId = savedUser ? JSON.parse(savedUser).id : null;
    if (!isAuthenticated || !userId) return;
    assistantService.getConversations(userId)
      .then(res => setConversations(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── New chat ────────────────────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    const newId = crypto.randomUUID();
    setSessionId(newId);
    setActiveSessionId(null);
    setMessages([WELCOME]);
    setPendingProductId(null);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ── Load a past conversation ────────────────────────────────────────────
  const loadConversation = async (conv) => {
    const savedUser = localStorage.getItem('user');
    const userId = savedUser ? JSON.parse(savedUser).id : null;
    if (!userId) return;
    try {
      const res = await assistantService.getConversation(userId, conv.session_id);
      const msgs = (res.data.messages || []).map(m => ({
        role: m.role,
        content: m.content,
        products: m.products || [],
        options: [],
        ts: m.ts,
      }));
      setMessages([WELCOME, ...msgs]);
      setSessionId(conv.session_id);
      setActiveSessionId(conv.session_id);
      setPendingProductId(null);
    } catch {}
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // ── Delete a conversation ───────────────────────────────────────────────
  const deleteConversation = async (e, convSessionId) => {
    e.stopPropagation();
    const savedUser = localStorage.getItem('user');
    const userId = savedUser ? JSON.parse(savedUser).id : null;
    if (!userId) return;
    setDeletingId(convSessionId);
    try {
      await assistantService.deleteConversation(userId, convSessionId);
      setConversations(prev => prev.filter(c => c.session_id !== convSessionId));
      if (convSessionId === sessionId) startNewChat();
    } catch {}
    setDeletingId(null);
  };

  // ── Send message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages(prev => {
      const updated = prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'assistant' ? { ...m, options: [] } : m
      );
      return [...updated, { role: 'user', content: trimmed, options: [], products: [] }];
    });
    setInput('');
    setLoading(true);

    const history = messages
      .filter(m => m !== WELCOME)
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-12);

    // Collect unique products seen this session so cart agent knows product IDs
    const recentProducts = [];
    const seenPids = new Set();
    for (let i = messages.length - 1; i >= 0; i--) {
      for (const p of (messages[i].products || [])) {
        if (p.product_id && !seenPids.has(p.product_id)) {
          recentProducts.push(p);
          seenPids.add(p.product_id);
        }
      }
      if (recentProducts.length >= 16) break;
    }

    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    const userId = savedUser ? JSON.parse(savedUser).id : null;

    try {
      const res = await assistantService.chat({
        message: trimmed,
        history,
        product_context: null,
        user_id: isAuthenticated && userId ? userId : null,
        auth_token: isAuthenticated && token ? token : null,
        pending_product_id: pendingProductId || null,
        session_id: isAuthenticated && userId ? sessionId : null,
        recent_products: recentProducts,
      });

      setPendingProductId(res.data?.pending_product_id ?? null);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data?.response || "Sorry, I didn't get a response. Please try again.",
        options: Array.isArray(res.data?.options) ? res.data.options : [],
        products: Array.isArray(res.data?.products) ? res.data.products : [],
      }]);

      if (isAuthenticated && userId) {
        setActiveSessionId(sessionId);
        refreshList();
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        options: [],
        products: [],
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, pendingProductId, sessionId, isAuthenticated, refreshList]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const isLastMsg = (i) => i === messages.length - 1;
  const groups = groupByDate(conversations);

  return (
    <div className="ap-layout">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`ap-sidebar ${sidebarOpen ? 'ap-sidebar--open' : 'ap-sidebar--closed'}`}>

        <div className="ap-sidebar-header">
          <div className="ap-sidebar-brand">
            <FontAwesomeIcon icon={faComments} />
            <span>Vera</span>
          </div>
          <button className="ap-sidebar-toggle-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
            <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
          </button>
        </div>

        <button className="ap-new-chat-btn" onClick={startNewChat}>
          <FontAwesomeIcon icon={faPlus} />
          New Chat
        </button>

        {!isAuthenticated ? (
          <div className="ap-sidebar-signin-note">
            <Link to="/login">Sign in</Link> to save your conversation history
          </div>
        ) : conversations.length === 0 ? (
          <div className="ap-sidebar-empty">No past conversations yet</div>
        ) : (
          <div className="ap-conv-list">
            {groups.map(group => (
              <div key={group.label} className="ap-conv-group">
                <div className="ap-conv-group-label">{group.label}</div>
                {group.items.map(conv => (
                  <div
                    key={conv.session_id}
                    className={`ap-conv-item ${conv.session_id === activeSessionId ? 'ap-conv-item--active' : ''}`}
                    onClick={() => loadConversation(conv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && loadConversation(conv)}
                  >
                    <span className="ap-conv-title">{conv.title || 'Conversation'}</span>
                    <button
                      className="ap-conv-delete"
                      onClick={(e) => deleteConversation(e, conv.session_id)}
                      aria-label="Delete conversation"
                      disabled={deletingId === conv.session_id}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Chat area ────────────────────────────────────────────────────── */}
      <div className="ap-chat-area">

        {/* Mobile sidebar toggle */}
        <button
          className="ap-mobile-sidebar-btn"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle sidebar"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        {/* Chat header */}
        <div className="ap-chat-header">
          <div className="ap-chat-header-avatar">
            <FontAwesomeIcon icon={faRobot} />
            <span className="ap-online-dot" />
          </div>
          <div>
            <div className="ap-chat-header-name">Vera</div>
            <div className="ap-chat-header-sub">Velour AI Shopping Assistant</div>
          </div>
        </div>

        {/* Messages */}
        <div className="ap-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`ap-message-group ap-message-group--${msg.role}`}>

              <div className={`ap-message ap-message--${msg.role}`}>
                <span className="ap-avatar">
                  <FontAwesomeIcon icon={msg.role === 'assistant' ? faRobot : faUser} />
                </span>
                <div className="ap-bubble">
                  <BubbleContent content={msg.content} />
                  {msg.ts && (
                    <span className="ap-ts">
                      {new Date(msg.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>

              {msg.products?.length > 0 && (
                <div className="ap-products-scroll">
                  {msg.products.map(p => <ProductCard key={p.product_id} product={p} />)}
                </div>
              )}

              {msg.role === 'assistant' && msg.options?.length > 0 && isLastMsg(i) && !loading && (
                <div className="ap-option-row">
                  {msg.options.map(opt => (
                    <button key={opt} className="ap-option-btn" onClick={() => sendMessage(opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="ap-input-row" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="ap-input"
            placeholder="Ask me anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            className="ap-send-btn"
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            <FontAwesomeIcon icon={loading ? faSpinner : faPaperPlane} spin={loading} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssistantPage;
