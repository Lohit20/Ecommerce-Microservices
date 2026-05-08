import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faShoppingBag, faSignOutAlt, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { cartService } from '../services/api';
import './AccountPage.css';

const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) return;
        const u = JSON.parse(savedUser);
        const response = await cartService.getUserTransactions(u.id);
        if (Array.isArray(response.data)) {
          setOrders(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleOrder = (orderId) => {
    setExpandedOrder(prev => (prev === orderId ? null : orderId));
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="account-page">
      <div className="container">
        <h1 className="page-title">My Account</h1>

        <div className="account-content">
          <div className="account-sidebar">
            <div className="user-info">
              <div className="user-avatar">
                <span>{user?.username?.slice(0, 2).toUpperCase() || 'U'}</span>
              </div>
              <h3>{user?.username}</h3>
              <p>{user?.email}</p>
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
              <li className="logout" onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} />
                <span>Logout</span>
              </li>
            </ul>
          </div>

          <div className="account-main">
            <div className="account-section">
              <div className="section-header">
                <h2>Personal Information</h2>
              </div>

              <div className="profile-details">
                <div className="profile-row">
                  <div className="profile-field">
                    <label>Username</label>
                    <p>{user?.username || '—'}</p>
                  </div>
                  <div className="profile-field">
                    <label>Email</label>
                    <p>{user?.email || '—'}</p>
                  </div>
                </div>

                <div className="profile-row">
                  <div className="profile-field">
                    <label>Phone</label>
                    <p>{user?.phone_number || '—'}</p>
                  </div>
                  <div className="profile-field">
                    <label>Address</label>
                    <p>{user?.address || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="account-section">
              <div className="section-header">
                <h2>Order History</h2>
              </div>

              {ordersLoading ? (
                <p className="loading-text">Loading orders…</p>
              ) : orders.length > 0 ? (
                <div className="order-history">
                  {orders.map(order => (
                    <div className="order-item" key={order.order_id}>
                      <div className="order-header" onClick={() => toggleOrder(order.order_id)}>
                        <div className="order-summary-row">
                          <div className="order-id">
                            <span>Order ID:</span> {order.order_id}
                          </div>
                          <div className="order-date">
                            <span>Date:</span> {formatDate(order.created_at)}
                          </div>
                        </div>
                        <div className="order-info">
                          <div className="order-total">
                            <span>Total:</span> ₹{Number(order.total_amount).toLocaleString('en-IN')}
                          </div>
                          <div className="order-payment">
                            <span className="status-badge">{order.payment_method}</span>
                          </div>
                          <FontAwesomeIcon icon={expandedOrder === order.order_id ? faChevronUp : faChevronDown} />
                        </div>
                      </div>

                      {expandedOrder === order.order_id && (
                        <div className="order-details">
                          <h4>Items</h4>
                          <div className="order-items">
                            {(order.product_cart || []).map((item, idx) => (
                              <div className="order-product" key={idx}>
                                <div className="product-info">
                                  <p className="product-name">Product #{item.product_id}</p>
                                  <p className="product-price">₹{Number(item.price).toLocaleString('en-IN')} × {item.quantity}</p>
                                </div>
                                <div className="product-total">
                                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ))}
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
