import React, { createContext, useContext, useReducer, useEffect } from 'react';

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

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case ADD_TO_CART: {
      const { product, quantity = 1, size, color } = action.payload;
      const productId = product.id;
      const itemKey = `${productId}-${size || 'default'}-${color || 'default'}`;

      // Check if the item already exists in the cart
      const existingItemIndex = state.items.findIndex(item => 
        item.id === productId && item.size === size && item.color === color
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

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

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
  };

  return (
    <CartContext.Provider
      value={{
        cart: state,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart
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