import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ==================== ИМПОРТЫ СТРАНИЦ ====================
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import AuthPage from './pages/AuthPage';
import CheckoutPage from './pages/CheckoutPage';
import UserProfilePage from './pages/UserProfilePage';
import AdminProfilePage from './pages/AdminProfilePage';
import ContactsPage from './pages/ContactsPage';
import InfoPage from './pages/InfoPage';

// ==================== API СЕРВИС ====================
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://bakerybagel.up.railway.app/api' 
  : 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
    throw new Error('Не авторизован');
  }
  
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса');
  }
  
  return data;
};

const api = {
  auth: {
    login: (email, password) => apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    register: (userData) => apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    getProfile: () => apiRequest('/auth/profile'),
    updateProfile: (data) => apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  },
  
  products: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/products${query ? `?${query}` : ''}`);
    },
    getCategories: () => apiRequest('/categories'),
  },
  
  cart: {
    get: () => apiRequest('/cart'),
    add: (product_id, quantity = 1) => apiRequest('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity })
    }),
    update: (id, quantity) => apiRequest(`/cart/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    }),
    remove: (id) => apiRequest(`/cart/${id}`, { method: 'DELETE' }),
    clear: () => apiRequest('/cart', { method: 'DELETE' }),
  },
  
  favorites: {
    get: () => apiRequest('/favorites'),
    add: (product_id) => apiRequest('/favorites', {
      method: 'POST',
      body: JSON.stringify({ product_id })
    }),
    remove: (product_id) => apiRequest(`/favorites/${product_id}`, { method: 'DELETE' }),
  },
  
  orders: {
    get: () => apiRequest('/orders'),
    getOne: async (id) => {
      const items = await apiRequest(`/orders/${id}`);
      return items;
    },
    create: (data) => apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  },
  
  promotions: {
    getAll: () => apiRequest('/promotions'),
  },
  
  reviews: {
    getForProduct: (productId) => apiRequest(`/products/${productId}/reviews`),
    add: (product_id, rating, comment) => apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify({ product_id, rating, comment })
    }),
  },
  
  admin: {
    getProducts: () => apiRequest('/admin/products'),
    getOrders: () => apiRequest('/admin/orders'),
    getUsers: () => apiRequest('/admin/users'),
    getStats: () => apiRequest('/admin/stats'),
    updateOrderStatus: (id, status) => apiRequest(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    addProduct: async (formData) => {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      return response.json();
    },
    updateProduct: async (id, formData) => {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      return response.json();
    },
    deleteProduct: (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
    addPromotion: (data) => apiRequest('/admin/promotions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  },
};

// ==================== КОНТЕКСТ АВТОРИЗАЦИИ ====================
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);
  
  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };
  
  const register = async (userData) => {
    try {
      const data = await api.auth.register(userData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };
  
  const updateProfile = async (data) => {
    try {
      await api.auth.updateProfile(data);
      const newUser = { ...user, ...data };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuth: !!user,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      updateProfile,
      api
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ==================== ЗАЩИТА МАРШРУТОВ ====================
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuth, isAdmin, loading } = useAuth();
  if (loading) return <div style={{padding: 20, textAlign: 'center'}}>Загрузка...</div>;
  if (!isAuth) return <Navigate to="/auth" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
};

// ==================== КОМПОНЕНТ APP ====================
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/info" element={<InfoPage />} />
          
          {/* Редиректы со старых путей */}
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          
          {/* Защищенные маршруты (требуют авторизации) */}
          <Route path="/checkout" element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Админ маршруты (требуют прав администратора) */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly={true}>
              <AdminProfilePage />
            </ProtectedRoute>
          } />
          
          {/* 404 - страница не найдена */}
          <Route path="*" element={
            <div style={{padding: 50, textAlign: 'center'}}>
              <h1>404</h1>
              <p>Страница не найдена</p>
              <a href="/">Вернуться на главную</a>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;