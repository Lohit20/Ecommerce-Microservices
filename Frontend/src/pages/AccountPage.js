import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faShoppingBag, faCreditCard, faHeart, faSignOutAlt, faEdit } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import './AccountPage.css';

const AccountPage = () => {
  // Get user data and auth functions from context
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;
  const navigate = useNavigate();

  // Mock order history - in a real app, this would come from an API
  const [orders] = useState([
    {
      id: 'ORD-12345',
      date: 'June 15, 2023',
      total: 129.99,
      status: 'Delivered',
      items: [
        { id: 1, name: 'Classic White T-Shirt', price: 29.99, quantity: 2 },
        { id: 2, name: 'Slim Fit Jeans', price: 69.99, quantity: 1 }
      ]
    },
    {
      id: 'ORD-12346',
      date: 'May 22, 2023',
      total: 89.99,
      status: 'Delivered',
      items: [
        { id: 3, name: 'Summer Dress', price: 59.99, quantity: 1 },
        { id: 4, name: 'Canvas Shoes', price: 29.99, quantity: 1 }
      ]
    },
    {
      id: 'ORD-12347',
      date: 'April 10, 2023',
      total: 159.99,
      status: 'Delivered',
      items: [
        { id: 5, name: 'Winter Jacket', price: 159.99, quantity: 1 }
      ]
    }
  ]);

  // State to track which order is expanded
  const [expandedOrder, setExpandedOrder] = useState(null);

  const toggleOrderDetails = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  return (
    <div className="account-page">
      <div className="container">
        <h1 className="page-title">My Account</h1>
        
        <div className="account-content">
          <div className="account-sidebar">
            <div className="user-info">
              <div className="user-avatar">
                <span>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
              </div>
              <h3>{user.firstName} {user.lastName}</h3>
              <p>{user.email}</p>
            </div>
            
            <ul className="account-nav">
              <li className="active">
                <FontAwesomeIcon icon={faUser} />
                <span>Profile</span>
              </li>
              <li>
                <FontAwesomeIcon icon={faShoppingBag} />
                <span>Orders</span>
              </li>
              <li>
                <FontAwesomeIcon icon={faCreditCard} />
                <span>Payment Methods</span>
              </li>
              <li>
                <FontAwesomeIcon icon={faHeart} />
                <span>Wishlist</span>
              </li>
              <li className="logout" onClick={() => {
                logout();
                navigate('/login');
              }}>
                <FontAwesomeIcon icon={faSignOutAlt} />
                <span>Logout</span>
              </li>
            </ul>
          </div>
          
          <div className="account-main">
            <div className="account-section">
              <div className="section-header">
                <h2>Personal Information</h2>
                <button className="edit-btn">
                  <FontAwesomeIcon icon={faEdit} />
                  Edit
                </button>
              </div>
              
              <div className="profile-details">
                <div className="profile-row">
                  <div className="profile-field">
                    <label>First Name</label>
                    <p>{user.firstName}</p>
                  </div>
                  <div className="profile-field">
                    <label>Last Name</label>
                    <p>{user.lastName}</p>
                  </div>
                </div>
                
                <div className="profile-row">
                  <div className="profile-field">
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                  <div className="profile-field">
                    <label>Phone</label>
                    <p>{user.phone}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="account-section">
              <div className="section-header">
                <h2>Address</h2>
                <button className="edit-btn">
                  <FontAwesomeIcon icon={faEdit} />
                  Edit
                </button>
              </div>
              
              <div className="address-details">
                <p>{user.address}</p>
                <p>{user.city}, {user.state} {user.zipCode}</p>
                <p>{user.country}</p>
              </div>
            </div>
            
            <div className="account-section">
              <div className="section-header">
                <h2>Order History</h2>
              </div>
              
              {orders.length > 0 ? (
                <div className="order-history">
                  {orders.map(order => (
                    <div className="order-item" key={order.id}>
                      <div className="order-header" onClick={() => toggleOrderDetails(order.id)}>
                        <div className="order-summary">
                          <div className="order-id">
                            <span>Order #:</span> {order.id}
                          </div>
                          <div className="order-date">
                            <span>Date:</span> {order.date}
                          </div>
                        </div>
                        <div className="order-info">
                          <div className="order-total">
                            <span>Total:</span> ${order.total.toFixed(2)}
                          </div>
                          <div className="order-status">
                            <span className={`status-badge ${order.status.toLowerCase()}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {expandedOrder === order.id && (
                        <div className="order-details">
                          <h4>Items</h4>
                          <div className="order-items">
                            {order.items.map(item => (
                              <div className="order-product" key={item.id}>
                                <div className="product-info">
                                  <p className="product-name">{item.name}</p>
                                  <p className="product-price">${item.price.toFixed(2)} x {item.quantity}</p>
                                </div>
                                <div className="product-total">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="order-actions">
                            <button className="btn-secondary">Track Order</button>
                            <button className="btn-outline">View Invoice</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-orders">
                  <p>You haven't placed any orders yet.</p>
                  <Link to="/" className="shop-now-button">Start Shopping</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;