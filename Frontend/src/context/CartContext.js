import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { cartService } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const initialState = { items: [], totalItems: 0, totalPrice: 0 };

const loadCartFromStorage = () => {
  try {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : initialState;
  } catch {
    return initialState;
  }
};

const ADD_TO_CART = 'ADD_TO_CART';
const REMOVE_FROM_CART = 'REMOVE_FROM_CART';
const UPDATE_QUANTITY = 'UPDATE_QUANTITY';
const CLEAR_CART = 'CLEAR_CART';
const SET_CART = 'SET_CART';

const recalc = (items) => ({
  items,
  totalItems: items.reduce((t, i) => t + i.quantity, 0),
  totalPrice: items.reduce((t, i) => t + i.quantity * i.price, 0),
});

const cartReducer = (state, action) => {
  switch (action.type) {
    case SET_CART:
      return action.payload;

    case ADD_TO_CART: {
      const { product, quantity = 1 } = action.payload;
      const productId = product.product_id;
      const existing = state.items.findIndex((i) => i.product_id === productId);
      let items;
      if (existing >= 0) {
        items = state.items.map((item, idx) =>
          idx === existing ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        items = [
          ...state.items,
          {
            product_id: productId,
            name: product.name,
            image: product.image,
            price: product.discount_price,
            actual_price: product.actual_price,
            quantity,
          },
        ];
      }
      return recalc(items);
    }

    case REMOVE_FROM_CART: {
      const items = state.items.filter((i) => i.product_id !== action.payload.productId);
      return recalc(items);
    }

    case UPDATE_QUANTITY: {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        return cartReducer(state, { type: REMOVE_FROM_CART, payload: { productId } });
      }
      const items = state.items.map((i) =>
        i.product_id === productId ? { ...i, quantity } : i
      );
      return recalc(items);
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

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  // Load cart from backend when user logs in
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const fetchCart = async () => {
      try {
        setLoading(true);
        const response = await cartService.getCart(userId);
        const backendCart = response.data;
        if (backendCart && backendCart.items && backendCart.items.length > 0) {
          const items = backendCart.items.map((item) => ({
            product_id: item.product_id,
            name: item.name || `Product #${item.product_id}`,
            image: item.image || null,
            price: item.price,
            actual_price: item.actual_price || item.price,
            quantity: item.quantity,
          }));
          dispatch({ type: SET_CART, payload: recalc(items) });
        }
      } catch (err) {
        console.error('Failed to load cart from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [isAuthenticated, userId]);

  const addToCart = async (product, quantity = 1) => {
    dispatch({ type: ADD_TO_CART, payload: { product, quantity } });

    if (isAuthenticated && userId) {
      try {
        await cartService.addToCart(userId, [{ product_id: product.product_id, quantity }]);
      } catch (err) {
        console.error('Failed to sync add to cart:', err);
      }
    }
  };

  const removeFromCart = async (productId) => {
    dispatch({ type: REMOVE_FROM_CART, payload: { productId } });

    if (isAuthenticated && userId) {
      try {
        await cartService.removeFromCart(userId, productId);
      } catch (err) {
        console.error('Failed to sync remove from cart:', err);
      }
    }
  };

  const updateQuantity = (productId, quantity) => {
    dispatch({ type: UPDATE_QUANTITY, payload: { productId, quantity } });
    // No backend endpoint for quantity update — backend state managed via add/remove
  };

  const clearCart = async () => {
    dispatch({ type: CLEAR_CART });
    setOrderPlaced(false);
    setOrderId(null);

    if (isAuthenticated && userId) {
      try {
        await cartService.clearCart(userId);
      } catch (err) {
        console.error('Failed to sync clear cart:', err);
      }
    }
  };

  const checkout = async (paymentMethod) => {
    if (!isAuthenticated) {
      setError('You must be logged in to checkout');
      return { success: false, message: 'Authentication required' };
    }

    try {
      setLoading(true);
      setError(null);

      // First sync local cart to backend if needed
      if (state.items.length === 0) {
        return { success: false, message: 'Cart is empty' };
      }

      // Sync cart items to backend before checkout
      await cartService.clearCart(userId);
      for (const item of state.items) {
        await cartService.addToCart(userId, [{ product_id: item.product_id, quantity: item.quantity }]);
      }

      const response = await cartService.checkoutCart(userId, `"${paymentMethod}"`);

      if (response.data && response.data.order_id) {
        setOrderId(response.data.order_id);
        setOrderPlaced(true);
        dispatch({ type: CLEAR_CART });
        return { success: true, orderId: response.data.order_id };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Checkout failed';
      setError(msg);
      return { success: false, message: msg };
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

export const useCart = () => useContext(CartContext);
