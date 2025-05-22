import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { cartService } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();


// Initial state
const initialState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

// Load cart from localStorage if available
const loadCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : initialState;
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return initialState;
  }
};

// Safe API call wrapper
const safeApiCall = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return { data: null };
  }
};

// Actions
const ADD_TO_CART = 'ADD_TO_CART';
const REMOVE_FROM_CART = 'REMOVE_FROM_CART';
const UPDATE_QUANTITY = 'UPDATE_QUANTITY';
const CLEAR_CART = 'CLEAR_CART';
const SET_CART = 'SET_CART';

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case SET_CART: {
      return {
        ...action.payload
      };
    }
    
    case ADD_TO_CART: {
      const { product, quantity = 1, size, color } = action.payload;
      const productId = product.product_id || product.id; // Use product_id from backend or id from frontend
      const itemKey = `${productId}-${size || 'default'}-${color || 'default'}`;

      // Check if the item already exists in the cart
      const existingItemIndex = state.items.findIndex(item => 
        (item.product_id === productId || item.id === productId) && 
        item.size === size && 
        item.color === color
      );

      let updatedItems;

      if (existingItemIndex >= 0) {
        // Update existing item
        updatedItems = state.items.map((item, index) => {
          if (index === existingItemIndex) {
            return {
              ...item,
              quantity: item.quantity + quantity,
              totalPrice: (item.quantity + quantity) * item.price
            };
          }
          return item;
        });
      } else {
        // Add new item
        const newItem = {
          product_id: productId,
          id: productId,
          key: itemKey,
          name: product.name,
          image: product.image || product.images?.[0],
          price: product.price,
          quantity,
          totalPrice: quantity * product.price,
          size,
          color,
        };
        updatedItems = [...state.items, newItem];
      }

      const totalItems = updatedItems.reduce((total, item) => total + item.quantity, 0);
      const totalPrice = updatedItems.reduce((total, item) => total + item.totalPrice, 0);

      return {
        ...state,
        items: updatedItems,
        totalItems,
        totalPrice
      };
    }

    case REMOVE_FROM_CART: {
      const { itemKey } = action.payload;
      const updatedItems = state.items.filter(item => item.key !== itemKey);
      
      const totalItems = updatedItems.reduce((total, item) => total + item.quantity, 0);
      const totalPrice = updatedItems.reduce((total, item) => total + item.totalPrice, 0);
      
      return {
        ...state,
        items: updatedItems,
        totalItems,
        totalPrice
      };
    }

    case UPDATE_QUANTITY: {
      const { itemKey, quantity } = action.payload;
      if (quantity <= 0) {
        return cartReducer(state, { type: REMOVE_FROM_CART, payload: { itemKey } });
      }

      const updatedItems = state.items.map(item => {
        if (item.key === itemKey) {
          return {
            ...item,
            quantity,
            totalPrice: quantity * item.price
          };
        }
        return item;
      });

      const totalItems = updatedItems.reduce((total, item) => total + item.quantity, 0);
      const totalPrice = updatedItems.reduce((total, item) => total + item.totalPrice, 0);

      return {
        ...state,
        items: updatedItems,
        totalItems,
        totalPrice
      };
    }

    case CLEAR_CART:
      return initialState;

    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState, loadCartFromStorage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const auth = useAuth();
  const user = auth?.user;
  const isAuthenticated = auth?.isAuthenticated;

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  // Fetch user's cart from backend when authenticated
  useEffect(() => {
    const fetchUserCart = async () => {
      if (isAuthenticated && user?.id) {
        try {
          setLoading(true);
          setError(null);
          const response = await cartService.getCart(user.id);
          // If user has active cart/transaction, update local cart
          if (response.data) {
            // Find the most recent incomplete transaction (cart)
            const activeCart = response.data;
            
            if (activeCart) {
              // Transform backend cart format to frontend format
              const cartItems = activeCart.items.map(item => ({
                product_id: item.product_id,
                id: item.product_id,
                key: `${item.product_id}-${item.size || 'default'}-${item.color || 'default'}`,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                totalPrice: item.price * item.quantity,
                size: item.size,
                color: item.color
              }));
              
              const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
              const totalPrice = cartItems.reduce((total, item) => total + item.totalPrice, 0);
              
              dispatch({
                type: SET_CART,
                payload: {
                  items: cartItems,
                  totalItems,
                  totalPrice
                }
              });
            }
          }
        } catch (err) {
          setError('Failed to fetch cart. Please try again.');
          console.error('Error fetching user cart:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserCart();
  }, [isAuthenticated, user, dispatch]);

  const addToCart = (product, quantity = 1, size = null, color = null) => {
    dispatch({
      type: ADD_TO_CART,
      payload: { product, quantity, size, color }
    });
  };

  const removeFromCart = (itemKey) => {
    dispatch({
      type: REMOVE_FROM_CART,
      payload: { itemKey }
    });
  };

  const updateQuantity = (itemKey, quantity) => {
    dispatch({
      type: UPDATE_QUANTITY,
      payload: { itemKey, quantity }
    });
  };

  const clearCart = () => {
    dispatch({ type: CLEAR_CART });
    setOrderPlaced(false);
    setOrderId(null);
  };
  
  // Process checkout and create order
  const checkout = async (checkoutData) => {
    console.log(auth)
    if (!isAuthenticated) {
      setError('You must be logged in to checkout');
      return { success: false, message: 'Authentication required' };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Format cart items for backend
      const productCart = state.items.map(item => ({
        product_id: item.product_id || item.id,
        // name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
        // image: item.image
      }));
      console.log("hi", user)
      // Create order payload according to backend Order model
      const orderData = {
        user_id: user.id,
        product_cart: productCart,
        total_amount: state.totalPrice,
        payment_method: checkoutData.paymentMethod,
        shipping_address: {
          address: checkoutData.address,
          city: checkoutData.city,
          state: checkoutData.state,
          postal_code: checkoutData.postalCode,
          country: checkoutData.country
        },
        shipping_cost: checkoutData.shippingCost,
        total_cost: state.totalPrice + checkoutData.shippingCost,
        created_at: new Date().toISOString()
      };

      console.log(orderData)
      
      // Send order to backend
      const response = await cartService.insertTransaction(orderData);
      
      // Handle successful order
      if (response.data && response.data.order_id) {
        setOrderId(response.data.order_id);
        setOrderPlaced(true);
        clearCart();
        return { 
          success: true, 
          orderId: response.data.order_id 
        };
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process order. Please try again.');
      console.error('Checkout error:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to process order. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart: state,
        loading,
        error,
        orderPlaced,
        orderId,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        checkout
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;