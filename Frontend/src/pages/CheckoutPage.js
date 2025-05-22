import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faChevronLeft, faCreditCard, faUser, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { faCcVisa, faCcMastercard, faCcPaypal, faApplePay } from '@fortawesome/free-brands-svg-icons';
import { useCart } from '../context/CartContext';
import './CheckoutPage.css';
import { formatPrice } from '../utils/priceUtils';

const CheckoutPage = () => {
  const { cart, clearCart, checkout } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'United Kingdom',
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    saveInfo: false
  });

  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [shippingMethod, setShippingMethod] = useState('standard');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleShippingChange = (e) => {
    setShippingMethod(e.target.value);
  };

  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      // Validate contact information
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
        isValid = false;
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
        isValid = false;
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
        isValid = false;
      }

      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone is required';
        isValid = false;
      }
    }

    if (step === 2) {
      // Validate shipping information
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
        isValid = false;
      }

      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
        isValid = false;
      }

      if (!formData.postalCode.trim()) {
        newErrors.postalCode = 'Postal code is required';
        isValid = false;
      }

      if (!formData.country.trim()) {
        newErrors.country = 'Country is required';
        isValid = false;
      }
    }

    if (step === 3) {
      // Validate payment information
      if (!formData.cardName.trim()) {
        newErrors.cardName = 'Cardholder name is required';
        isValid = false;
      }
      
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card number is required';
        isValid = false;
      } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Card number must be 16 digits';
        isValid = false;
      }
      if (!formData.expiryDate.trim()) {
        newErrors.expiryDate = 'Expiry date is required';
        isValid = false;
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiryDate)) {
        newErrors.expiryDate = 'Expiry date must be in MM/YY format';
        isValid = false;
      }

      if (!formData.cvv.trim()) {
        newErrors.cvv = 'CVV is required';
        isValid = false;
      } else if (!/^\d{3,4}$/.test(formData.cvv)) {
        newErrors.cvv = 'CVV must be 3 or 4 digits';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateStep(currentStep)) {
      // Generate order ID (in real app, this would come from the backend)
      const orderNumber = Math.floor(100000000 + Math.random() * 900000000);
      setOrderId(`ORD-${orderNumber}`);

      // Simulate order processing
      setOrderPlaced(true);

      // Clear cart
      setTimeout(() => {
        clearCart();
      }, 1000);
    }
  };

  const placeOrder = async () => {
    console.log(formData)
    // Validate current step
    if (!validateStep(3)) {
      return;
    }

    // Format checkout data for backend
    const checkoutData = {
      ...formData,
      paymentMethod: 'credit_card', // Or get from form if you have multiple payment methods
      address: formData.address,
      city: formData.city,
      state: formData.country, // Using country as state for now
      postalCode: formData.postalCode,
      country: formData.country,
      shippingMethod: shippingMethod,
      shippingCost: shippingCost
    };

    try {
      // Use the checkout method from CartContext to process the order
      const result = await checkout(checkoutData);

      if (result.success) {
        // Order was successfully placed
        setOrderId(result.orderId);
        setOrderPlaced(true);
      } else {
        // Display error message
        alert(result.message || 'Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  // Calculate shipping cost
  const shippingCost = shippingMethod === 'express' ? 9.99 : 0;

  // Calculate total amount
  const totalAmount = cart.totalPrice + shippingCost;

  // If cart is empty and order not placed, redirect to cart
  if (cart.items.length === 0 && !orderPlaced) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="empty-checkout">
            <h2>Your cart is empty</h2>
            <p>You need to add items to your cart before proceeding to checkout.</p>
            <Link to="/cart" className="back-to-cart-btn">Back to Cart</Link>
          </div>
        </div>
      </div>
    );
  }

  // Order success page
  if (orderPlaced) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="order-success">
            <div className="success-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <h2>Thank You For Your Order!</h2>
            <p className="order-id">Order #{orderId}</p>
            <p>Your order has been placed and is being processed. You will receive an email confirmation shortly.</p>

            <div className="order-details">
              <h3>Order Summary</h3>
              <div className="order-items">
                {cart.items.map(item => (
                  <div className="order-item" key={item.key}>
                    <div className="order-item-image">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="order-item-details">
                      <h4>{item.name}</h4>
                      <p>
                        {item.quantity} × {formatPrice(item.price)}
                        {item.size && ` · Size: ${item.size}`}
                        {item.color && ` · Color: ${item.color}`}
                      </p>
                    </div>
                    <div className="order-item-price">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-total">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(cart.totalPrice)}</span>
                </div>
                <div className="total-row">
                  <span>Shipping</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>
                <div className="total-row final">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="shipping-address">
              <h3>Shipping Details</h3>
              <p>
                {formData.firstName} {formData.lastName}<br />
                {formData.address}<br />
                {formData.city}, {formData.postalCode}<br />
                {formData.country}
              </p>
            </div>

            <button className="continue-shopping-btn" onClick={handleBackToHome}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="checkout-header">
          <h1 className="page-title">Checkout</h1>
          <Link to="/cart" className="back-link">
            <FontAwesomeIcon icon={faChevronLeft} /> Back to Cart
          </Link>
        </div>

        <div className="checkout-content">
          <div className="checkout-steps">
            <div className={`step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
              <div className="step-number">{currentStep > 1 ? <FontAwesomeIcon icon={faCheckCircle} /> : 1}</div>
              <div className="step-label">Contact</div>
            </div>

            <div className="step-line"></div>

            <div className={`step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
              <div className="step-number">{currentStep > 2 ? <FontAwesomeIcon icon={faCheckCircle} /> : 2}</div>
              <div className="step-label">Shipping</div>
            </div>

            <div className="step-line"></div>

            <div className={`step ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Payment</div>
            </div>
          </div>

          <div className="checkout-form-container">
            <form className="checkout-form" onSubmit={handleSubmit}>
              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <div className="checkout-step">
                  <h2 className="step-title">
                    <FontAwesomeIcon icon={faUser} /> Contact Information
                  </h2>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={errors.firstName ? 'error' : ''}
                      />
                      {errors.firstName && <div className="error-message">{errors.firstName}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={errors.lastName ? 'error' : ''}
                      />
                      {errors.lastName && <div className="error-message">{errors.lastName}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <div className="error-message">{errors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <div className="error-message">{errors.phone}</div>}
                  </div>

                  <div className="form-actions">
                    <button type="button" className="next-btn" onClick={handleNext}>
                      Continue to Shipping
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Shipping Information */}
              {currentStep === 2 && (
                <div className="checkout-step">
                  <h2 className="step-title">
                    <FontAwesomeIcon icon={faMapMarkerAlt} /> Shipping Address
                  </h2>

                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className={errors.address ? 'error' : ''}
                    />
                    {errors.address && <div className="error-message">{errors.address}</div>}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">City</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={errors.city ? 'error' : ''}
                      />
                      {errors.city && <div className="error-message">{errors.city}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="postalCode">Postal Code</label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        className={errors.postalCode ? 'error' : ''}
                      />
                      {errors.postalCode && <div className="error-message">{errors.postalCode}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={errors.country ? 'error' : ''}
                    >
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="France">France</option>
                      <option value="Germany">Germany</option>
                    </select>
                    {errors.country && <div className="error-message">{errors.country}</div>}
                  </div>

                  <div className="shipping-options">
                    <h3>Shipping Method</h3>
                    <div className="shipping-option">
                      <input
                        type="radio"
                        id="standard"
                        name="shipping"
                        value="standard"
                        checked={shippingMethod === 'standard'}
                        onChange={handleShippingChange}
                      />
                      <label htmlFor="standard">
                        <div className="shipping-label">
                          <span className="shipping-title">Standard Shipping</span>
                          <span className="shipping-price">Free</span>
                        </div>
                        <div className="shipping-description">Delivery within 3-5 business days</div>
                      </label>
                    </div>

                    <div className="shipping-option">
                      <input
                        type="radio"
                        id="express"
                        name="shipping"
                        value="express"
                        checked={shippingMethod === 'express'}
                        onChange={handleShippingChange}
                      />
                      <label htmlFor="express">
                        <div className="shipping-label">
                          <span className="shipping-title">Express Shipping</span>
                          <span className="shipping-price">£9.99</span>
                        </div>
                        <div className="shipping-description">Delivery within 1-2 business days</div>
                      </label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="back-btn" onClick={handlePrevious}>
                      Back
                    </button>
                    <button type="button" className="next-btn" onClick={handleNext}>
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment Information */}
              {currentStep === 3 && (
                <div className="checkout-step">
                  <h2 className="step-title">
                    <FontAwesomeIcon icon={faCreditCard} /> Payment Method
                  </h2>

                  <div className="payment-cards-info">
                    <div className="accepted-cards">
                      <FontAwesomeIcon icon={faCcVisa} size="2x" />
                      <FontAwesomeIcon icon={faCcMastercard} size="2x" />
                      <FontAwesomeIcon icon={faCcPaypal} size="2x" />
                      <FontAwesomeIcon icon={faApplePay} size="2x" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cardName">Cardholder Name</label>
                    <input
                      type="text"
                      id="cardName"
                      name="cardName"
                      value={formData.cardName}
                      onChange={handleChange}
                      className={errors.cardName ? 'error' : ''}
                      placeholder="Name as it appears on card"
                    />
                    {errors.cardName && <div className="error-message">{errors.cardName}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="cardNumber">Card Number</label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleChange}
                      className={errors.cardNumber ? 'error' : ''}
                      maxLength="19"
                      placeholder="1234 5678 9012 3456"
                    />
                    {errors.cardNumber && <div className="error-message">{errors.cardNumber}</div>}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiryDate">Expiry Date</label>
                      <input
                        type="text"
                        id="expiryDate"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        className={errors.expiryDate ? 'error' : ''}
                        maxLength="5"
                        placeholder="MM/YY"
                      />
                      {errors.expiryDate && <div className="error-message">{errors.expiryDate}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="cvv">CVV</label>
                      <input
                        type="text"
                        id="cvv"
                        name="cvv"
                        value={formData.cvv}
                        onChange={handleChange}
                        className={errors.cvv ? 'error' : ''}
                        maxLength="4"
                        placeholder="123"
                      />
                      {errors.cvv && <div className="error-message">{errors.cvv}</div>}
                    </div>
                  </div>

                  <div className="save-info">
                    <input
                      type="checkbox"
                      id="saveInfo"
                      name="saveInfo"
                      checked={formData.saveInfo}
                      onChange={handleChange}
                    />
                    <label htmlFor="saveInfo">Save payment information for future purchases</label>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="back-btn" onClick={handlePrevious}>
                      Back
                    </button>
                    <button type="button" className="place-order-btn" onClick={placeOrder}>
                      Place Order
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="order-summary">
              <h2 className="summary-title">Order Summary</h2>

              <div className="summary-items">
                {cart.items.map(item => (
                  <div className="summary-item" key={item.key}>
                    <div className="summary-item-image">
                      <img src={item.image} alt={item.name} />
                      <span className="item-quantity">{item.quantity}</span>
                    </div>
                    <div className="summary-item-details">
                      <h3 className="summary-item-name">{item.name}</h3>
                      {item.size && <p className="summary-item-variant">Size: {item.size}</p>}
                      {item.color && <p className="summary-item-variant">Color: {item.color}</p>}
                    </div>
                    <div className="summary-item-price">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="totals">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(cart.totalPrice)}</span>
                </div>

                <div className="total-row">
                  <span>Shipping</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>

                <div className="total-row final">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
