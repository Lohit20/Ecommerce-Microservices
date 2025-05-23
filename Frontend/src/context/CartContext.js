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
      const productId = product.product_id || product.id;
      const itemKey = `${productId}-${size || 'default'}-${color || 'default'}`;

      // Check if item exists
      const existingItemIndex = state.items.findIndex(item =>
        (item.product_id === productId || item.id === productId) &&
        item.size === size &&
        item.color === color
      );

      let updatedItems;

      if (existingItemIndex >= 0) {
        updatedItems = state.items.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + quantity;
            return {
              ...item,
              quantity: newQuantity,
              totalPrice: newQuantity * item.price,
            };
          }
          return item;
        });
      } else {
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
        totalPrice,
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
        totalPrice,
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
            totalPrice: quantity * item.price,
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
        totalPrice,
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
  const userId = user?.id;

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  // Fetch user's cart from backend when authenticated
  useEffect(() => {
    const fetchUserCart = async () => {
      if (isAuthenticated && userId) {
        try {
          setLoading(true);
          setError(null);
          const response = await cartService.getUserTransactions(userId);

          if (response.data && response.data.length > 0) {
            const activeCart = response.data.find(transaction => !transaction.completed);

            if (activeCart && activeCart.product_cart) {
              const cartItems = activeCart.product_cart.map(item => ({
                product_id: item.product_id,
                id: item.product_id,
                key: `${item.product_id}-${item.size || 'default'}-${item.color || 'default'}`,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                totalPrice: item.price * item.quantity,
                size: item.size,
                color: item.color,
              }));

              const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
              const totalPrice = cartItems.reduce((total, item) => total + item.totalPrice, 0);

              dispatch({
                type: SET_CART,
                payload: {
                  items: cartItems,
                  totalItems,
                  totalPrice,
                },
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
  }, [isAuthenticated, userId]);

  // --- API synced actions ---

  const addToCart = async (product, quantity = 1, size = null, color = null) => {
    dispatch({ type: ADD_TO_CART, payload: { product, quantity, size, color } });

    if (isAuthenticated && userId) {
      try {
        const item = {
          product_id: product.product_id || product.id,
          quantity,
          size,
          color,
        };
        await cartService.addToCart(userId, item);
      } catch (err) {
        console.error('Failed to add item to cart API:', err);
        setError('Failed to sync add to cart with server.');
      }
    }
  };

  const removeFromCart = async (itemKey) => {
    dispatch({ type: REMOVE_FROM_CART, payload: { itemKey } });

    if (isAuthenticated && userId) {
      try {
        await cartService.removeFromCart(userId, itemKey);
      } catch (err) {
        console.error('Failed to remove item from cart API:', err);
        setError('Failed to sync remove from cart with server.');
      }
    }
  };

  const updateQuantity = async (itemKey, quantity) => {
    dispatch({ type: UPDATE_QUANTITY, payload: { itemKey, quantity } });

    if (isAuthenticated && userId) {
      try {
        await cartService.updateCartQuantity(userId, itemKey, quantity);
      } catch (err) {
        console.error('Failed to update cart quantity API:', err);
        setError('Failed to sync update quantity with server.');
      }
    }
  };

  const clearCart = async () => {
    dispatch({ type: CLEAR_CART });
    setOrderPlaced(false);
    setOrderId(null);

    if (isAuthenticated && userId) {
      try {
        await cartService.clearCart(userId);
      } catch (err) {
        console.error('Failed to clear cart API:', err);
        setError('Failed to sync clear cart with server.');
      }
    }
  };

  // Process checkout and create order
  const checkout = async (checkoutData) => {
    if (!isAuthenticated) {
      setError('You must be logged in to checkout');
      return { success: false, message: 'Authentication required' };
    }

    try {
      setLoading(true);
      setError(null);

      const productCart = state.items.map(item => ({
        product_id: item.product_id || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
        image: item.image,
      }));

      const orderData = {
        user_id: userId,
        product_cart: productCart,
        total_amount: state.totalPrice,
        payment_method: checkoutData.paymentMethod,
        shipping_address: {
          address: checkoutData.address,
          city: checkoutData.city,
          state: checkoutData.state,
          postal_code: checkoutData.postalCode,
          country: checkoutData.country,
        },
        created_at: new Date().toISOString(),
      };

      const response = await cartService.insertTransaction(orderData);

      if (response.data && response.data.order_id) {
        setOrderId(response.data.order_id);
        setOrderPlaced(true);
        clearCart();
        return { success: true, orderId: response.data.order_id };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Checkout failed');
      return { success: false, message: err.message };
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
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Hook for easy usage
export const useCart = () => useContext(CartContext);
