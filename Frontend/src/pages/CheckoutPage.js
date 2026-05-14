import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faChevronLeft, faCreditCard, faMoneyBillWave, faTruck } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toGBP } from '../utils/priceUtils';
import './CheckoutPage.css';

const fmt = (inr) => `£${toGBP(inr).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card', icon: faCreditCard, desc: 'Pay securely with your credit card' },
  { value: 'paypal', label: 'PayPal', icon: faCreditCard, desc: 'Pay via your PayPal account' },
  { value: 'cod', label: 'Cash on Delivery', icon: faMoneyBillWave, desc: 'Pay when your order arrives' },
];

const CheckoutPage = () => {
  const { cart, checkout, loading } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState('');

  // Empty cart guard
  if (cart.items.length === 0 && !orderPlaced) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="empty-checkout">
            <h2>Your cart is empty</h2>
            <p>Add items to your cart before checking out.</p>
            <Link to="/" className="back-to-cart-btn">Browse Products</Link>
          </div>
        </div>
      </div>
    );
  }

  // Auth guard
  if (!isAuthenticated) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="empty-checkout">
            <h2>Please log in to checkout</h2>
            <Link to="/login" className="back-to-cart-btn">Login</Link>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (orderPlaced) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="order-success">
            <div className="success-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <h2>Order Placed Successfully!</h2>
            <p className="order-id">Order ID: <strong>{orderId}</strong></p>
            <p>Your order has been received and is being processed.</p>

            <div className="success-details">
              <div className="success-row">
                <span>Payment Method</span>
                <span>{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}</span>
              </div>
              <div className="success-row">
                <span>Shipping to</span>
                <span>{user?.address || 'Your registered address'}</span>
              </div>
              <div className="success-row total">
                <span>Total Paid</span>
                <span>{fmt(cart.totalPrice)}</span>
              </div>
            </div>

            <div className="success-actions">
              <Link to="/account" className="view-orders-btn">View My Orders</Link>
              <button className="continue-shopping-btn" onClick={() => navigate('/')}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setError('');
    const result = await checkout(paymentMethod);
    if (result.success) {
      setOrderId(result.orderId);
      setOrderPlaced(true);
      window.scrollTo(0, 0);
    } else {
      setError(result.message || 'Checkout failed. Please try again.');
    }
  };

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="checkout-header">
          <Link to="/cart" className="back-link">
            <FontAwesomeIcon icon={faChevronLeft} /> Back to Cart
          </Link>
          <h1 className="page-title">Checkout</h1>
        </div>

        <div className="checkout-content">
          {/* Left: payment selection */}
          <div className="checkout-form-container">
            {/* Delivery info (from user profile) */}
            <section className="checkout-section">
              <h2><FontAwesomeIcon icon={faTruck} /> Delivery Details</h2>
              <div className="info-card">
                <p><strong>{user?.username}</strong></p>
                <p>{user?.address}</p>
                <p>{user?.phone_number}</p>
                <p>{user?.email}</p>
              </div>
              <p className="info-note">Shipping to your registered address. To change it, update your profile.</p>
            </section>

            {/* Payment method */}
            <section className="checkout-section">
              <h2><FontAwesomeIcon icon={faCreditCard} /> Payment Method</h2>
              <div className="payment-options">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.value}
                    className={`payment-option ${paymentMethod === m.value ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.value}
                      checked={paymentMethod === m.value}
                      onChange={() => setPaymentMethod(m.value)}
                    />
                    <FontAwesomeIcon icon={m.icon} className="payment-icon" />
                    <div className="payment-text">
                      <strong>{m.label}</strong>
                      <span>{m.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {error && <p className="checkout-error">{error}</p>}

            <button
              className="place-order-btn"
              onClick={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? 'Placing Order…' : `Place Order · ${fmt(cart.totalPrice)}`}
            </button>
          </div>

          {/* Right: order summary */}
          <aside className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cart.items.map((item) => (
                <div className="summary-item" key={item.product_id}>
                  {item.image && (
                    <div className="summary-item-image">
                      <img src={item.image} alt={item.name} />
                      <span className="item-qty-badge">{item.quantity}</span>
                    </div>
                  )}
                  <div className="summary-item-details">
                    <p className="summary-item-name">{item.name || `Product #${item.product_id}`}</p>
                    <p className="summary-item-price">{fmt(item.price)} × {item.quantity}</p>
                  </div>
                  <span className="summary-item-total">
                    {fmt(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="total-row">
                <span>Subtotal ({cart.totalItems} items)</span>
                <span>{fmt(cart.totalPrice)}</span>
              </div>
              <div className="total-row">
                <span>Delivery</span>
                <span className="free-text">FREE</span>
              </div>
              <div className="total-row grand-total">
                <span>Total</span>
                <span>{fmt(cart.totalPrice)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
