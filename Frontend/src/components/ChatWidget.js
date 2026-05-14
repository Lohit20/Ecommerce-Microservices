import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots, faTimes, faPaperPlane, faRobot, faUser, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { assistantService, productsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ChatWidget.css';

const SUGGESTIONS = [
  'What are your best headphones under £50?',
  'Tell me about your return policy',
  'Show me top-rated fitness gear',
  'Where is my order?',
];

const TypingIndicator = () => (
  <div className="cw-message cw-message--assistant">
    <span className="cw-avatar"><FontAwesomeIcon icon={faRobot} /></span>
    <div className="cw-bubble cw-bubble--typing">
      <span /><span /><span />
    </div>
  </div>
);

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Vera, your Velour shopping assistant. How can I help you today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [productContext, setProductContext] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Fetch product context when on a product page
  useEffect(() => {
    const match = location.pathname.match(/^\/product\/(\d+)/);
    if (match) {
      const productId = match[1];
      productsService.getProduct(productId)
        .then(res => setProductContext(res.data))
        .catch(() => setProductContext(null));
    } else {
      setProductContext(null);
    }
  }, [location.pathname]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history excluding the initial greeting
    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

    // Auth context for order queries
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const userId = savedUser ? JSON.parse(savedUser).id : null;

    try {
      const res = await assistantService.chat({
        message: trimmed,
        history,
        product_context: productContext || null,
        user_id: isAuthenticated && userId ? userId : null,
        auth_token: isAuthenticated && token ? token : null,
      });
      const reply = res.data?.response || "Sorry, I didn't get a response. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, productContext, isAuthenticated]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        className={`cw-bubble-btn ${open ? 'cw-bubble-btn--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        <FontAwesomeIcon icon={open ? faTimes : faCommentDots} />
        {!open && messages.length > 1 && (
          <span className="cw-unread-dot" />
        )}
      </button>

      {/* Chat window */}
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
              <div className="cw-header-sub">Velour AI Assistant</div>
            </div>
          </div>
          <button className="cw-close-btn" onClick={() => setOpen(false)} aria-label="Close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Context pill — show when on product page */}
        {productContext && open && (
          <div className="cw-context-pill">
            Chatting about: <strong>{productContext.name?.slice(0, 40)}{productContext.name?.length > 40 ? '…' : ''}</strong>
          </div>
        )}

        {/* Messages */}
        <div className="cw-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`cw-message cw-message--${msg.role}`}
            >
              <span className="cw-avatar">
                <FontAwesomeIcon icon={msg.role === 'assistant' ? faRobot : faUser} />
              </span>
              <div className="cw-bubble">
                {msg.content.split('\n').map((line, j) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}

          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions — show when only greeting visible */}
        {messages.length === 1 && !loading && (
          <div className="cw-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="cw-suggestion-chip" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

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
            {loading
              ? <FontAwesomeIcon icon={faSpinner} spin />
              : <FontAwesomeIcon icon={faPaperPlane} />
            }
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatWidget;
