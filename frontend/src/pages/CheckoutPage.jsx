import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './CheckoutPage.module.css';

const CheckoutPage = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const [formData, setFormData] = useState({
    delivery_address: user?.address || '',
    delivery_date: '',
    delivery_time: '',
    phone: user?.phone || '',
    comment: '',
    payment_method: 'card'
  });

  // Загрузка корзины
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const data = await api.cart.get();
      if (data.length === 0) {
        navigate('/cart');
      }
      setCartItems(data);
    } catch (error) {
      showNotification('Ошибка загрузки корзины', 'error');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.delivery_address) {
      showNotification('Введите адрес доставки', 'error');
      return;
    }
    if (!formData.phone) {
      showNotification('Введите номер телефона', 'error');
      return;
    }
    if (!formData.delivery_date) {
      showNotification('Выберите дату доставки', 'error');
      return;
    }
    if (!formData.delivery_time) {
      showNotification('Выберите время доставки', 'error');
      return;
    }

    setSubmitting(true);
    
    try {
      const orderData = {
        delivery_address: formData.delivery_address,
        delivery_date: formData.delivery_date,
        delivery_time: formData.delivery_time,
        phone: formData.phone,
        comment: formData.comment,
        payment_method: formData.payment_method
      };
      
      await api.orders.create(orderData);
      showNotification('Заказ успешно оформлен!', 'success');
      
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
      
    } catch (error) {
      showNotification(error.message || 'Ошибка при оформлении заказа', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 3000 ? 0 : 299;
  const total = subtotal + deliveryFee;

  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loader}>Загрузка...</div>
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

      {/* Основной контент */}
      <main className={styles.checkoutContent}>
        <div className={styles.checkoutContainer}>
          <h1 className={styles.checkoutTitle}>Оформление заказа</h1>
          
          <div className={styles.checkoutGrid}>
            {/* Левая колонка - Форма */}
            <div className={styles.checkoutLeft}>
              <form onSubmit={handleSubmit} className={styles.orderForm}>
                <div className={styles.formSection}>
                  <h2>Данные для доставки</h2>
                  
                  <div className={styles.formGroup}>
                    <label>Адрес доставки *</label>
                    <input
                      type="text"
                      name="delivery_address"
                      value={formData.delivery_address}
                      onChange={handleChange}
                      placeholder="Улица, дом, квартира"
                      required
                    />
                  </div>
                  
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Телефон *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+7 (XXX) XXX-XX-XX"
                        required
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Дата доставки *</label>
                      <input
                        type="date"
                        name="delivery_date"
                        value={formData.delivery_date}
                        onChange={handleChange}
                        min={getMinDate()}
                        max={getMaxDate()}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Время доставки *</label>
                      <select
                        name="delivery_time"
                        value={formData.delivery_time}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Выберите время</option>
                        <option value="10:00-12:00">10:00 - 12:00</option>
                        <option value="12:00-14:00">12:00 - 14:00</option>
                        <option value="14:00-16:00">14:00 - 16:00</option>
                        <option value="16:00-18:00">16:00 - 18:00</option>
                        <option value="18:00-20:00">18:00 - 20:00</option>
                        <option value="20:00-22:00">20:00 - 22:00</option>
                      </select>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Способ оплаты</label>
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleChange}
                      >
                        <option value="card">Картой онлайн</option>
                        <option value="cash">Наличными при получении</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Комментарий к заказу</label>
                    <textarea
                      name="comment"
                      value={formData.comment}
                      onChange={handleChange}
                      placeholder="Пожелания по доставке, особые инструкции..."
                      rows="3"
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? 'Оформляем...' : 'Подтвердить заказ'}
                </button>
              </form>
            </div>

            {/* Правая колонка - Итоги заказа */}
            <div className={styles.checkoutRight}>
              <div className={styles.orderSummary}>
                <h2>Ваш заказ</h2>
                
                <div className={styles.summaryItems}>
                  {cartItems.map((item) => (
                    <div key={item.id} className={styles.summaryItem}>
                      <div className={styles.summaryItemInfo}>
                        <span className={styles.summaryItemName}>{item.name}</span>
                        <span className={styles.summaryItemQty}>x{item.quantity}</span>
                      </div>
                      <span className={styles.summaryItemPrice}>
                        {(item.price * item.quantity).toFixed(2)} ₽
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className={styles.summaryDivider}></div>
                
                <div className={styles.summaryRow}>
                  <span>Промежуточный итог</span>
                  <span>{subtotal.toFixed(2)} ₽</span>
                </div>
                
                <div className={styles.summaryRow}>
                  <span>Доставка</span>
                  <span>{deliveryFee === 0 ? 'Бесплатно' : `${deliveryFee.toFixed(2)} ₽`}</span>
                </div>
                
                <div className={styles.summaryTotal}>
                  <span>Итого</span>
                  <span>{total.toFixed(2)} ₽</span>
                </div>
                
                {deliveryFee > 0 && (
                  <div className={styles.freeDeliveryNote}>
                    * Бесплатная доставка при заказе от 3000 ₽
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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

export default CheckoutPage;