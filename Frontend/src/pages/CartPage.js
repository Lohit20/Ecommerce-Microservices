import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus, faMinus, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/priceUtils';
import './CartPage.css';

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const handleRemove = (productId) => removeFromCart(productId);
  const handleQty = (productId, current, delta) => {
    const next = current + delta;
    if (next <= 0) removeFromCart(productId);
    else updateQuantity(productId, next);
  };

  const formatRupees = (n) => formatPrice(n);

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="page-title">Shopping Cart</h1>
        <p className="cart-count">{cart.totalItems} item{cart.totalItems !== 1 ? 's' : ''}</p>

        {!cart.items || cart.items.length === 0 ? (
          <div className="empty-cart">
            <FontAwesomeIcon icon={faShoppingBag} className="empty-icon" />
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything yet.</p>
            <Link to="/" className="shop-now-button">Start Shopping</Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items */}
            <div className="cart-items">
              {cart.items.map((item) => (
                <div className="cart-item" key={item.product_id}>
                  <div className="cart-item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </div>

                  <div className="cart-item-details">
                    <h3 className="cart-item-name">{item.name || `Product #${item.product_id}`}</h3>
                    <div className="cart-item-price">
                      <span className="current-price">{formatRupees(item.price)}</span>
                      {item.actual_price && item.actual_price > item.price && (
                        <span className="original-price">{formatRupees(item.actual_price)}</span>
                      )}
                    </div>
                  </div>

                  <div className="quantity-control">
                    <button className="qty-btn" onClick={() => handleQty(item.product_id, item.quantity, -1)}>
                      <FontAwesomeIcon icon={faMinus} />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => handleQty(item.product_id, item.quantity, 1)}>
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>

                  <div className="cart-item-subtotal">
                    {formatRupees(item.price * item.quantity)}
                  </div>

                  <button className="remove-btn" onClick={() => handleRemove(item.product_id)} title="Remove">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}

              <div className="cart-footer-actions">
                <button className="clear-btn" onClick={() => window.confirm('Clear cart?') && clearCart()}>
                  Clear Cart
                </button>
                <Link to="/" className="continue-link">← Continue Shopping</Link>
              </div>
            </div>

            {/* Summary */}
            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Items ({cart.totalItems})</span>
                <span>{formatRupees(cart.totalPrice)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span className="free-tag">FREE</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatRupees(cart.totalPrice)}</span>
              </div>
              <Link to="/checkout" className="checkout-button">
                Proceed to Checkout →
              </Link>
              <p className="secure-note">Secure checkout</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
