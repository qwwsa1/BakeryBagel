import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './CartPage.module.css';

const CartPage = () => {
  const { isAuth, api } = useAuth();
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [updatingId, setUpdatingId] = useState(null);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 2000);
  }, []);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.cart.get();
      setCartItems(data);
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error);
      showNotification('Ошибка загрузки корзины', 'error');
    } finally {
      setLoading(false);
    }
  }, [api.cart, showNotification]);

  // Загрузка корзины
  useEffect(() => {
    if (isAuth) {
      loadCart();
    } else {
      setLoading(false);
    }
  }, [isAuth, loadCart]);

  const updateQuantity = useCallback(async (id, change) => {
    const currentItem = cartItems.find(item => item.id === id);
    if (!currentItem) return;
    
    const newQuantity = currentItem.quantity + change;
    
    // Если новое количество меньше 1, удаляем товар
    if (newQuantity < 1) {
      if (!window.confirm('Удалить товар из корзины?')) return;
      setUpdatingId(id);
      try {
        await api.cart.remove(id);
        await loadCart();
        showNotification('Товар удален из корзины', 'success');
      } catch (error) {
        showNotification('Ошибка при удалении', 'error');
      } finally {
        setUpdatingId(null);
      }
      return;
    }
    
    setUpdatingId(id);
    try {
      await api.cart.update(id, newQuantity);
      await loadCart();
      showNotification('Количество обновлено', 'success');
    } catch (error) {
      showNotification('Ошибка при обновлении', 'error');
    } finally {
      setUpdatingId(null);
    }
  }, [cartItems, api.cart, loadCart, showNotification]);

  const removeItem = useCallback(async (id) => {
    if (!window.confirm('Удалить товар из корзины?')) return;
    
    setUpdatingId(id);
    try {
      await api.cart.remove(id);
      await loadCart();
      showNotification('Товар удален из корзины', 'success');
    } catch (error) {
      showNotification('Ошибка при удалении', 'error');
    } finally {
      setUpdatingId(null);
    }
  }, [api.cart, loadCart, showNotification]);

  const clearCart = useCallback(async () => {
    if (!window.confirm('Очистить всю корзину?')) return;
    
    try {
      await api.cart.clear();
      await loadCart();
      showNotification('Корзина очищена', 'success');
    } catch (error) {
      showNotification('Ошибка при очистке', 'error');
    }
  }, [api.cart, loadCart, showNotification]);

  const proceedToCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      showNotification('Корзина пуста', 'error');
      return;
    }
    navigate('/checkout');
  }, [cartItems.length, showNotification, navigate]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 3000 ? 0 : 299;
  const total = subtotal + deliveryFee;

  // Если пользователь не авторизован
  if (!isAuth) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.container}>
            <div className={styles.logo}>
              <Link to="/">
                <img src="/images/SmallLogo.svg" alt="Логотип" />
              </Link>
            </div>
            <nav className={styles.menu}>
              <ul>
                <li><Link to="/menu"><p><b>Меню</b></p></Link></li>
                <li><Link to="/info"><p><b>О нас</b></p></Link></li>
                <li><Link to="/contacts"><p><b>Контакты</b></p></Link></li>
                <li><Link to="/profile"><p><b>Профиль</b></p></Link></li>
              </ul>
            </nav>
            <div className={styles.cartIcon}>
              <Link to="/cart">
                <img src="/images/Egg Carton With Basket - iconSvg.co.svg" alt="Корзина" />
              </Link>
            </div>
          </div>
          <hr className={styles.line} />
        </header>

        <main className={styles.cartContent}>
          <div className={styles.emptyCart}>
            <h2>Корзина пуста</h2>
            <p>Войдите в аккаунт чтобы увидеть корзину</p>
            <Link to="/auth" className={styles.loginBtn}>Войти</Link>
          </div>
        </main>

        <hr className={styles.line} />
        <footer className={styles.footer}>
          <div className={styles.infoFooter}>
            <p><b>info@bagel.ru<br />ул. Выпечки, 10, Москва, Россия</b></p>
          </div>
          <div className={styles.mediumLogo}>
            <img src="/images/MediumLogo.svg" alt="Логотип" />
          </div>
          <div className={styles.iconSocial}>
            <img src="/images/Symbol.svg.svg" width="30" alt="Social" />
            <img src="/images/vk_symbol.svg.svg" width="30" alt="VK" />
          </div>
        </footer>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loader}>Загрузка корзины...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Уведомление */}
      {notification.show && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}

      {/* Хедер */}
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.logo}>
            <Link to="/">
              <img src="/images/SmallLogo.svg" alt="Логотип" />
            </Link>
          </div>
          
          <nav className={styles.menu}>
            <ul>
              <li><Link to="/menu"><p><b>Меню</b></p></Link></li>
              <li><Link to="/info"><p><b>О нас</b></p></Link></li>
              <li><Link to="/contacts"><p><b>Контакты</b></p></Link></li>
              <li><Link to="/profile"><p><b>Профиль</b></p></Link></li>
            </ul>
          </nav>
          
          <div className={styles.cartIcon}>
            <Link to="/cart">
              <img src="/images/Egg Carton With Basket - iconSvg.co.svg" alt="Корзина" />
            </Link>
          </div>
        </div>
        <hr className={styles.line} />
      </header>

      {/* Основной контент корзины */}
      <main className={styles.cartContent}>
        {cartItems.length === 0 ? (
          <div className={styles.emptyCart}>
            <h2>Ваша корзина пуста</h2>
            <p>Добавьте товары из меню</p>
            <Link to="/menu" className={styles.continueBtn}>Перейти в меню</Link>
          </div>
        ) : (
          <div className={styles.cartContainer}>
            {/* Левая колонка - Список товаров */}
            <div className={styles.cartLeft}>
              <div className={styles.cartHeader}>
                <h1 className={styles.cartTitle}>Ваша корзина</h1>
                <button onClick={clearCart} className={styles.clearCartBtn}>
                  Очистить корзину
                </button>
              </div>
              
              <div className={styles.itemsList}>
                {cartItems.map((item) => (
                  <div key={item.id} className={styles.cartItem}>
                    <div className={styles.itemImage}>
                      <img 
                        src={item.image || '/images/med.svg'} 
                        alt={item.name}
                        onError={(e) => { e.target.src = '/images/med.svg'; }}
                      />
                    </div>
                    
                    <div className={styles.itemDetails}>
                      <h3 className={styles.itemName}>{item.name}</h3>
                      <p className={styles.itemDescription}>{item.description}</p>
                      {item.is_on_sale && (
                        <span className={styles.saleBadge}>Скидка</span>
                      )}
                    </div>
                    
                    <div className={styles.itemControls}>
                      <button 
                        className={styles.quantityBtn}
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={updatingId === item.id}
                        aria-label="Уменьшить количество"
                      >
                        <span>−</span>
                      </button>
                      <span className={styles.quantity}>
                        {updatingId === item.id ? '...' : item.quantity}
                      </span>
                      <button 
                        className={styles.quantityBtn}
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={updatingId === item.id}
                        aria-label="Увеличить количество"
                      >
                        <span>+</span>
                      </button>
                    </div>
                    
                    <div className={styles.itemPrice}>
                      {(item.price * item.quantity).toFixed(2)} ₽
                    </div>
                    
                    <button 
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.id)}
                      disabled={updatingId === item.id}
                      aria-label="Удалить товар"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Правая колонка - Итоги */}
            <div className={styles.cartRight}>
              <div className={styles.cartTotals}>
                <h2 className={styles.totalsTitle}>Итого корзины</h2>
                
                <div className={styles.totalsList}>
                  {cartItems.map((item) => (
                    <div key={item.id} className={styles.totalRow}>
                      <span className={styles.totalName}>{item.name}</span>
                      <span className={styles.totalQty}>x{item.quantity}</span>
                      <span className={styles.totalPrice}>{(item.price * item.quantity).toFixed(2)} ₽</span>
                    </div>
                  ))}
                </div>
                
                <div className={styles.totalsDivider}></div>
                
                <div className={styles.totalRow}>
                  <span className={styles.totalName}>Промежуточный итог</span>
                  <span className={styles.totalPrice}>{subtotal.toFixed(2)} ₽</span>
                </div>
                
                <div className={styles.totalRow}>
                  <span className={styles.totalName}>Доставка</span>
                  <span className={styles.totalPrice}>
                    {deliveryFee === 0 ? 'Бесплатно' : `${deliveryFee.toFixed(2)} ₽`}
                  </span>
                </div>
                
                <div className={styles.totalRowFinal}>
                  <span className={styles.totalLabel}>Итого</span>
                  <span className={styles.totalAmount}>{total.toFixed(2)} ₽</span>
                </div>

                <div className={styles.freeDeliveryNote}>
                  {deliveryFee === 0 ? (
                    '🎉 Бесплатная доставка! Спасибо за заказ от 3000 ₽'
                  ) : (
                    '🚚 Добавьте товаров ещё на ' + (3000 - subtotal).toFixed(2) + ' ₽ для бесплатной доставки'
                  )}
                </div>
              </div>
              
              <button 
                className={styles.orderBtn}
                onClick={proceedToCheckout}
              >
                Оформить заказ
              </button>
            </div>
          </div>
        )}
      </main>

      <hr className={styles.line} />
      
      {/* Футер */}
      <footer className={styles.footer}>
        <div className={styles.infoFooter}>
          <p><b>info@bagel.ru<br />ул. Выпечки, 10, Москва, Россия</b></p>
        </div>
        <div className={styles.mediumLogo}>
          <img src="/images/MediumLogo.svg" alt="Логотип" />
        </div>
        <div className={styles.iconSocial}>
          <img src="/images/Symbol.svg.svg" width="30" alt="Social" />
          <img src="/images/vk_symbol.svg.svg" width="30" alt="VK" />
        </div>
      </footer>
    </div>
  );
};

export default CartPage;