import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CategoryPage from './pages/CategoryPage';
import AccountPage from './pages/AccountPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/Typography.css';
import './styles/ProductStyles.css';
import './styles/Footer.css';
import './App.css';
import ScrollButton from './components/ScrollToTop';
// Import debug utilities with safe fallbacks
let logComponentMount, logError, logNavigation;
try {
  const debugUtils = require('./utils/debugUtils');
  logComponentMount = debugUtils.logComponentMount;
  logError = debugUtils.logError;
  logNavigation = debugUtils.logNavigation;
} catch (e) {
  // Provide fallback implementations if debug utils can't be loaded
  logComponentMount = (componentName) => console.log(`Component mounted: ${componentName}`);
  logError = (error, source) => console.error(`Error in ${source}:`, error);
  logNavigation = (path) => console.log(`Navigation to ${path}`);
  console.warn('Debug utilities could not be loaded, using fallbacks');
}

// ScrollToTopOnNav component to ensure page scrolls to top on route change
const ScrollToTopOnNav = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Log navigation for debugging
    try {
      logNavigation(pathname);
      console.log(`Navigation occurred to: ${pathname}`);
    } catch (e) {
      console.log(`Navigation occurred to: ${pathname}`);
    }
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  const auth = useAuth();
  
  if (!auth || !auth.isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  // Log component mount for debugging
  useEffect(() => {
    try {
      logComponentMount('App');
      console.log('App component mounted - checking for rendering issues');
    } catch (e) {
      console.log('App component mounted - checking for rendering issues');
    }
    
    // Log any unhandled errors
    const handleGlobalError = (event) => {
      event.preventDefault();
      try {
        logError(event.error, 'Global error handler', {
          message: event.message,
          source: event.filename,
          lineNumber: event.lineno,
          columnNumber: event.colno
        });
      } catch (e) {
        console.error('Global error:', event.error);
        console.error('Error details:', {
          message: event.message,
          source: event.filename,
          lineNumber: event.lineno,
          columnNumber: event.colno
        });
      }
    };
    
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app">
            <ScrollToTopOnNav />
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/category/:category" element={<CategoryPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/account" element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
            <Footer />
            <ScrollButton />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;