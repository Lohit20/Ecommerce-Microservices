import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots, faTimes, faPaperPlane, faRobot, faUser,
  faSpinner, faTag,
} from '@fortawesome/free-solid-svg-icons';
import { assistantService, productsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ChatWidget.css';

const SUGGESTIONS = [
  "I'm looking for headphones",
  'What are your best deals today?',
  'Tell me about your return policy',
  'Where is my order?',
];

/* ── Inline markdown renderer ─────────────────────────────── */
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
        <div key={i} className="cw-bullet-line">
          <span className="cw-bullet-dot">•</span>
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

/* ── Star rating ──────────────────────────────────────────── */
const Stars = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="cw-stars">
      {[1, 2, 3, 4, 5].map(i => {
        const cls = i <= full ? 'star-on' : (i === full + 1 && half ? 'star-half' : 'star-off');
        return <span key={i} className={`cw-star ${cls}`}>★</span>;
      })}
      <span className="cw-stars-val">{rating?.toFixed(1)}</span>
    </span>
  );
};

/* ── Mini product card inside chat ───────────────────────── */
const ChatProductCard = ({ product }) => {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link to={`/product/${product.product_id}`} className="cw-product-card" target="_blank" rel="noreferrer">
      <div className="cw-product-img-wrap">
        {!imgErr
          ? <img src={product.image} alt={product.name} onError={() => setImgErr(true)} loading="lazy" />
          : <div className="cw-product-no-img">No Image</div>
        }
        {product.discount_pct > 0 && (
          <span className="cw-product-badge">
            <FontAwesomeIcon icon={faTag} /> {product.discount_pct}% OFF
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="cw-product-low-stock">Only {product.stock} left</span>
        )}
      </div>
      <div className="cw-product-body">
        <p className="cw-product-cat">{product.sub_category}</p>
        <p className="cw-product-name">
          {product.name.length > 52 ? product.name.slice(0, 52) + '…' : product.name}
        </p>
        <Stars rating={product.rating || 0} />
        <p className="cw-product-rating-count">
          {product.no_of_ratings?.toLocaleString('en-GB')} reviews
        </p>
        <div className="cw-product-price-row">
          <span className="cw-product-price">£{product.price?.toFixed(2)}</span>
          {product.was && (
            <span className="cw-product-was">£{product.was?.toFixed(2)}</span>
          )}
        </div>
        <div className="cw-product-cta">View Product →</div>
      </div>
    </Link>
  );
};

/* ── Typing indicator ─────────────────────────────────────── */
const TypingIndicator = () => (
  <div className="cw-message cw-message--assistant">
    <span className="cw-avatar"><FontAwesomeIcon icon={faRobot} /></span>
    <div className="cw-bubble cw-bubble--typing"><span /><span /><span /></div>
  </div>
);

/* ── Main widget ──────────────────────────────────────────── */
const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Vera, your personal Velour shopping assistant. What can I help you with today?",
      options: SUGGESTIONS,
      products: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [productContext, setProductContext] = useState(null);
  const [pendingProductId, setPendingProductId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const match = location.pathname.match(/^\/product\/(\d+)/);
    if (match) {
      productsService.getProduct(match[1])
        .then(res => setProductContext(res.data))
        .catch(() => setProductContext(null));
    } else {
      setProductContext(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Clear options on the last assistant message when user replies
    setMessages(prev => {
      const updated = prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'assistant' ? { ...m, options: [] } : m
      );
      return [...updated, { role: 'user', content: trimmed, options: [], products: [] }];
    });

    setInput('');
    setLoading(true);

    const history = messages
      .slice(1)
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-12);

    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    const userId = savedUser ? JSON.parse(savedUser).id : null;

    try {
      const res = await assistantService.chat({
        message: trimmed,
        history,
        product_context: productContext || null,
        user_id: isAuthenticated && userId ? userId : null,
        auth_token: isAuthenticated && token ? token : null,
        pending_product_id: pendingProductId || null,
      });

      // Track the pending product for the next confirmation turn
      setPendingProductId(res.data?.pending_product_id ?? null);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data?.response || "Sorry, I didn't get a response. Please try again.",
        options: Array.isArray(res.data?.options) ? res.data.options : [],
        products: Array.isArray(res.data?.products) ? res.data.products : [],
      }]);
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
  }, [messages, loading, productContext, isAuthenticated]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const isLastMsg = (i) => i === messages.length - 1;

  return (
    <>
      <button
        className={`cw-bubble-btn ${open ? 'cw-bubble-btn--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close Vera' : 'Chat with Vera'}
      >
        <FontAwesomeIcon icon={open ? faTimes : faCommentDots} />
        {!open && messages.length > 1 && <span className="cw-unread-dot" />}
      </button>

      <div className={`cw-window ${open ? 'cw-window--open' : ''}`} aria-hidden={!open}>

        {/* Header */}
        <div className="cw-header">
          <div className="cw-header-info">
            <div className="cw-header-avatar">
              <FontAwesomeIcon icon={faRobot} />
              <span className="cw-online-dot" />
            </div>
            <div>
              <div className="cw-header-name">Vera</div>
              <div className="cw-header-sub">Velour AI Shopping Assistant</div>
            </div>
          </div>
          <button className="cw-close-btn" onClick={() => setOpen(false)} aria-label="Close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Product context pill */}
        {productContext && open && (
          <div className="cw-context-pill">
            Asking about: <strong>{productContext.name?.slice(0, 42)}{productContext.name?.length > 42 ? '…' : ''}</strong>
          </div>
        )}

        {/* Messages */}
        <div className="cw-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`cw-message-group cw-message-group--${msg.role}`}>

              {/* Text bubble */}
              <div className={`cw-message cw-message--${msg.role}`}>
                <span className="cw-avatar">
                  <FontAwesomeIcon icon={msg.role === 'assistant' ? faRobot : faUser} />
                </span>
                <div className="cw-bubble">
                  <BubbleContent content={msg.content} />
                </div>
              </div>

              {/* Product cards */}
              {msg.products?.length > 0 && (
                <div className="cw-products-scroll">
                  {msg.products.map(p => <ChatProductCard key={p.product_id} product={p} />)}
                </div>
              )}

              {/* Option chips — only on last assistant message and not while loading */}
              {msg.role === 'assistant' && msg.options?.length > 0 && isLastMsg(i) && !loading && (
                <div className="cw-option-row">
                  {msg.options.map(opt => (
                    <button key={opt} className="cw-option-btn" onClick={() => sendMessage(opt)}>
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
        <form className="cw-input-row" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="cw-input"
            placeholder="Ask me anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            className="cw-send-btn"
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            <FontAwesomeIcon icon={loading ? faSpinner : faPaperPlane} spin={loading} />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatWidget;
