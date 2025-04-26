import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import './CartPage.css';
import { formatPrice } from '../utils/priceUtils';

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const handleRemoveItem = (itemKey) => {
    removeFromCart(itemKey);
  };

  const handleUpdateQuantity = (itemKey, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity <= 0) {
      removeFromCart(itemKey);
    } else {
      updateQuantity(itemKey, newQuantity);
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
    }
  };

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="page-title">Your Shopping Cart</h1>
        
        {cart.items.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link to="/" className="shop-now-button">Shop Now</Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              <div className="cart-header">
                <div className="cart-item-product">Product</div>
                <div className="cart-item-price">Price</div>
                <div className="cart-item-quantity">Quantity</div>
                <div className="cart-item-total">Total</div>
                <div className="cart-item-actions">Actions</div>
              </div>
              
              {cart.items.map(item => (
                <div className="cart-item" key={item.key}>
                  <div className="cart-item-product">
                    <div className="cart-item-image">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="cart-item-details">
                      <h3 className="cart-item-name">{item.name}</h3>
                      {item.size && <p className="cart-item-size">Size: {item.size}</p>}
                      {item.color && <p className="cart-item-color">Color: {item.color}</p>}
                    </div>
                  </div>
                  
                  <div className="cart-item-price">{formatPrice(item.price)}</div>
                  
                  <div className="cart-item-quantity">
                    <div className="quantity-control">
                      <button 
                        className="quantity-btn"
                        onClick={() => handleUpdateQuantity(item.key, item.quantity, -1)}
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <div className="quantity-display">{item.quantity}</div>
                      <button 
                        className="quantity-btn"
                        onClick={() => handleUpdateQuantity(item.key, item.quantity, 1)}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="cart-item-total">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                  
                  <div className="cart-item-actions">
                    <button 
                      className="remove-item-btn"
                      onClick={() => handleRemoveItem(item.key)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-summary">
              <h2 className="summary-title">Order Summary</h2>
              
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(cart.totalPrice)}</span>
              </div>
              
              <div className="summary-row">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatPrice(cart.totalPrice)}</span>
              </div>
              
              <Link to="/checkout" className="checkout-button">
                Proceed to Checkout
              </Link>
              
              <div className="cart-actions">
                <button className="clear-cart-button" onClick={handleClearCart}>
                  Clear Cart
                </button>
                <Link to="/" className="continue-shopping">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;