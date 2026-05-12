import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './UserProfilePage.module.css';

const UserProfilePage = () => {
  const { user, logout, updateProfile, api, isAuth, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  
  // Состояния для модального окна заказа
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);

  // Загрузка данных
  useEffect(() => {
    if (!isAuth) {
      navigate('/auth');
      return;
    }
    
    loadUserData();
  }, [isAuth]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [ordersData, favoritesData] = await Promise.all([
        api.orders.get(),
        api.favorites.get()
      ]);
      setOrders(ordersData);
      setFavorites(favoritesData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      showNotification('Ошибка загрузки данных', 'error');
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

  const handleLogout = () => {
    logout();
    navigate('/');
    showNotification('Вы вышли из аккаунта', 'success');
  };

  const handleEditProfile = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || ''
    });
  };

  const handleSaveProfile = async () => {
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        showNotification('Профиль успешно обновлен', 'success');
        setEditing(false);
      } else {
        showNotification(result.error || 'Ошибка обновления профиля', 'error');
      }
    } catch (error) {
      showNotification('Ошибка при сохранении', 'error');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const removeFromFavorites = async (productId) => {
    try {
      await api.favorites.remove(productId);
      await loadUserData();
      showNotification('Удалено из избранного', 'success');
    } catch (error) {
      showNotification('Ошибка при удалении', 'error');
    }
  };

  // Просмотр деталей заказа
  const viewOrderDetails = async (order) => {
  setSelectedOrder(order);
  setLoadingOrderItems(true);
  try {
    const items = await api.orders.getOne(order.id);
    setOrderItems(items || []);
  } catch (error) {
    console.error('Ошибка загрузки товаров заказа:', error);
    setOrderItems([]);
    showNotification('Ошибка загрузки деталей заказа', 'error');
  } finally {
    setLoadingOrderItems(false);
  }
};

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setOrderItems([]);
  };

  // Переход в админ-панель
  const goToAdmin = () => {
    navigate('/admin');
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Ожидает',
      'processing': 'Готовится',
      'delivered': 'Доставлен',
      'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': styles.statusPending,
      'processing': styles.statusProcessing,
      'delivered': styles.statusDelivered,
      'cancelled': styles.statusCancelled
    };
    return classMap[status] || '';
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loader}>Загрузка профиля...</div>
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

      <main className={styles.mainContent}>
        <div className={styles.profileContainer}>
          <div className={styles.profileHeader}>
            <h1>Мой профиль</h1>
            <div className={styles.headerButtons}>
              {isAdmin && (
                <button onClick={goToAdmin} className={styles.adminBtn}>
                  Админ-панель
                </button>
              )}
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Выйти
              </button>
            </div>
          </div>

          <div className={styles.profileInfo}>
            {/* Информация о пользователе */}
            <div className={styles.infoCard}>
              <h3>Личная информация</h3>
              {editing ? (
                <div className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label>Имя</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ваше имя"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Телефон</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+7 (XXX) XXX-XX-XX"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Адрес</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Ваш адрес доставки"
                      rows="2"
                    />
                  </div>
                  <div className={styles.editButtons}>
                    <button onClick={handleSaveProfile} className={styles.saveBtn}>
                      Сохранить
                    </button>
                    <button onClick={handleCancelEdit} className={styles.cancelBtn}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p><strong>Имя:</strong> {user?.name || 'Не указано'}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Телефон:</strong> {user?.phone || 'Не указан'}</p>
                  <p><strong>Адрес:</strong> {user?.address || 'Не указан'}</p>
                  <button onClick={handleEditProfile} className={styles.editBtn}>
                    Редактировать профиль
                  </button>
                </div>
              )}
            </div>

            {/* Мои заказы */}
            <div className={styles.infoCard}>
              <h3>Мои заказы</h3>
              {orders.length === 0 ? (
                <p className={styles.emptyText}>У вас пока нет заказов</p>
              ) : (
                <>
                  {orders.slice(0, 3).map(order => (
                    <div key={order.id} className={styles.orderItem}>
                      <div className={styles.orderInfo}>
                        <span className={styles.orderNumber}>Заказ #{order.order_number}</span>
                        <span className={styles.orderDate}>
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={styles.orderInfo}>
                        <span className={styles.orderTotal}>{order.total_amount.toFixed(2)} ₽</span>
                        <span className={getStatusClass(order.status)}>
                          {getStatusText(order.status)}
                        </span>
                        <button 
                          onClick={() => viewOrderDetails(order)} 
                          className={styles.detailsBtn}
                        >
                          Детали
                        </button>
                      </div>
                    </div>
                  ))}
                  {orders.length > 3 && (
                    <button className={styles.viewAll} onClick={() => navigate('/orders')}>
                      Все заказы ({orders.length})
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Избранное */}
            <div className={styles.infoCard}>
              <h3>Избранное</h3>
              {favorites.length === 0 ? (
                <p className={styles.emptyText}>Нет избранных товаров</p>
              ) : (
                <>
                  {favorites.map(item => (
                    <div key={item.id} className={styles.favoriteItem}>
                      <div className={styles.favoriteInfo}>
                        <span className={styles.favoriteName}>{item.name}</span>
                        <span className={styles.favoritePrice}>{item.price} ₽</span>
                      </div>
                      <div className={styles.favoriteActions}>
                        <Link to="/menu" className={styles.buyLink}>
                          Купить
                        </Link>
                        <button 
                          onClick={() => removeFromFavorites(item.product_id)}
                          className={styles.removeFavBtn}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                  <Link to="/menu" className={styles.viewAllLink}>
                    Перейти в меню
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Модальное окно деталей заказа */}
      {selectedOrder && (
        <div className={styles.modal} onClick={closeOrderDetails}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Детали заказа #{selectedOrder.order_number}</h2>
            
            <div className={styles.orderDetails}>
              <div className={styles.orderInfoSection}>
                <h3>Информация о заказе</h3>
                <p><strong>Статус:</strong> <span className={getStatusClass(selectedOrder.status)}>{getStatusText(selectedOrder.status)}</span></p>
                <p><strong>Дата:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                <p><strong>Сумма:</strong> {selectedOrder.total_amount.toFixed(2)} ₽</p>
                <p><strong>Адрес доставки:</strong> {selectedOrder.delivery_address}</p>
                <p><strong>Телефон:</strong> {selectedOrder.phone}</p>
                {selectedOrder.comment && <p><strong>Комментарий:</strong> {selectedOrder.comment}</p>}
                <p><strong>Способ оплаты:</strong> {selectedOrder.payment_method === 'card' ? 'Картой онлайн' : 'Наличными при получении'}</p>
              </div>

              <div className={styles.orderItemsSection}>
                <h3>Состав заказа</h3>
                {loadingOrderItems ? (
                  <p className={styles.loadingText}>Загрузка позиций...</p>
                ) : orderItems.length > 0 ? (
                  <table className={styles.orderItemsTable}>
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Количество</th>
                        <th>Цена</th>
                        <th>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity} шт.</td>
                          <td>{item.price} ₽</td>
                          <td>{(item.price * item.quantity).toFixed(2)} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className={styles.totalLabel}>Итого:</td>
                        <td className={styles.totalAmount}>{selectedOrder.total_amount.toFixed(2)} ₽</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className={styles.emptyText}>Нет позиций в заказе</p>
                )}
              </div>
            </div>
            
            <div className={styles.modalButtons}>
              <button onClick={closeOrderDetails} className={styles.closeDetailsBtn}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Футер */}
      <footer className={styles.footer}>
        <div className={styles.infoFooter}>
          <p><b>info@bagel.ru<br />ул. Выпечки, 10, Москва, Россия</b></p>
        </div>
        <div className={styles.mediumLogo}>
          <img src="/images/MediumLogo.svg" alt="Логотип" />
        </div>
        <div className={styles.iconSocial}>
          <img src="/images/Symbol.svg.svg" width="30" alt="Instagram" />
          <img src="/images/vk_symbol.svg.svg" width="30" alt="VK" />
        </div>
      </footer>
    </div>
  );
};

export default UserProfilePage;