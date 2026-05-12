import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './AdminProfilePage.module.css';

const AdminProfilePage = () => {
  const { user, logout, api, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Данные для админки
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Формы для добавления/редактирования
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', old_price: '', category_id: 1,
    weight: '', calories: '', is_available: true, is_on_sale: false, sale_percent: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);

  // Функция для получения правильного URL изображения
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Если путь уже содержит /uploads/ - добавляем http://localhost:5000
    if (imagePath.includes('/uploads/')) {
      return `http://localhost:5000${imagePath}`;
    }
    
    // Если путь содержит /images/ - используем как есть (статика из папки public)
    if (imagePath.includes('/images/')) {
      return imagePath;
    }
    
    // Если путь начинается с http - возвращаем как есть
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Fallback
    return null;
  };

  // Проверка прав доступа
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Загрузка данных
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [];
      
      if (activeTab === 'dashboard') {
        promises.push(api.admin.getStats());
      }
      if (activeTab === 'menu' || activeTab === 'dashboard') {
        promises.push(api.admin.getProducts());
        promises.push(api.products.getCategories());
      }
      if (activeTab === 'orders' || activeTab === 'dashboard') {
        promises.push(api.admin.getOrders());
      }
      if (activeTab === 'users') {
        promises.push(api.admin.getUsers());
      }
      
      const results = await Promise.all(promises);
      let resultIndex = 0;
      
      if (activeTab === 'dashboard') {
        setStats(results[resultIndex++]);
      }
      if (activeTab === 'menu' || activeTab === 'dashboard') {
        setProducts(results[resultIndex++] || []);
        setCategories(results[resultIndex++] || []);
      }
      if (activeTab === 'orders' || activeTab === 'dashboard') {
        setOrders(results[resultIndex++] || []);
      }
      if (activeTab === 'users') {
        setUsers(results[resultIndex++] || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
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

  // Управление товарами
  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '', description: '', price: '', old_price: '', category_id: categories[0]?.id || 1,
      weight: '', calories: '', is_available: true, is_on_sale: false, sale_percent: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowAddProduct(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      old_price: product.old_price || '',
      category_id: product.category_id || 1,
      weight: product.weight || '',
      calories: product.calories || '',
      is_available: product.is_available === 1,
      is_on_sale: product.is_on_sale === 1,
      sale_percent: product.sale_percent || ''
    });
    const imgUrl = getImageUrl(product.image);
    setImagePreview(imgUrl);
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowAddProduct(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Файл слишком большой. Максимум 5MB', 'error');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    
    if (!productForm.name.trim()) {
      showNotification('Введите название товара', 'error');
      return;
    }
    if (!productForm.price || parseFloat(productForm.price) <= 0) {
      showNotification('Введите корректную цену', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', productForm.name);
      formDataToSend.append('description', productForm.description || '');
      formDataToSend.append('price', productForm.price);
      formDataToSend.append('old_price', productForm.old_price || '');
      formDataToSend.append('category_id', productForm.category_id);
      formDataToSend.append('weight', productForm.weight || '');
      formDataToSend.append('calories', productForm.calories || '');
      formDataToSend.append('is_available', productForm.is_available ? '1' : '0');
      formDataToSend.append('is_on_sale', productForm.is_on_sale ? '1' : '0');
      formDataToSend.append('sale_percent', productForm.sale_percent || '');
      
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }
      
      if (editingProduct) {
        await api.admin.updateProduct(editingProduct.id, formDataToSend);
        showNotification('Товар обновлен', 'success');
      } else {
        await api.admin.addProduct(formDataToSend);
        showNotification('Товар добавлен', 'success');
      }
      setShowAddProduct(false);
      await loadData();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showNotification(error.message || 'Ошибка сохранения', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    try {
      await api.admin.deleteProduct(id);
      showNotification('Товар удален', 'success');
      await loadData();
    } catch (error) {
      showNotification('Ошибка удаления', 'error');
    }
  };

  // Управление заказами
  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await api.admin.updateOrderStatus(orderId, status);
      showNotification('Статус заказа обновлен', 'success');
      await loadData();
    } catch (error) {
      showNotification('Ошибка обновления статуса', 'error');
    }
  };

  const handleViewOrderDetails = async (order) => {
    setSelectedOrderDetails(order);
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

  const getStatusText = (status) => {
    const map = { pending: 'Ожидает', processing: 'Готовится', delivered: 'Доставлен', cancelled: 'Отменен' };
    return map[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'statusPending',
      'processing': 'statusProcessing',
      'delivered': 'statusDelivered',
      'cancelled': 'statusCancelled'
    };
    return styles[classMap[status]] || '';
  };

  if (loading && activeTab !== 'dashboard') {
    return <div className={styles.loader}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      {notification.show && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.logo}>
            <Link to="/"><img src="/images/SmallLogo.svg" alt="Логотип" /></Link>
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
            <Link to="/cart"><img src="/images/Egg Carton With Basket - iconSvg.co.svg" alt="Корзина" /></Link>
          </div>
        </div>
        <hr className={styles.line} />
      </header>

      <main className={styles.mainContent}>
        <div className={styles.adminContainer}>
          <div className={styles.adminHeader}>
            <h1>Панель администратора</h1>
            <div className={styles.adminUser}>
              <span>{user?.name}</span>
              <button onClick={handleLogout} className={styles.logoutBtn}>Выйти</button>
            </div>
          </div>

          {/* Статистика */}
          {stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3>Всего заказов</h3>
                <p>{stats.orders || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3>Пользователей</h3>
                <p>{stats.users || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3>Выручка</h3>
                <p>{stats.revenue || 0} ₽</p>
              </div>
              <div className={styles.statCard}>
                <h3>Товаров</h3>
                <p>{stats.products || 0}</p>
              </div>
            </div>
          )}

          {/* Табы */}
          <div className={styles.tabs}>
            <button className={activeTab === 'dashboard' ? styles.active : ''} onClick={() => setActiveTab('dashboard')}>Статистика</button>
            <button className={activeTab === 'menu' ? styles.active : ''} onClick={() => setActiveTab('menu')}>Товары</button>
            <button className={activeTab === 'orders' ? styles.active : ''} onClick={() => setActiveTab('orders')}>Заказы</button>
            <button className={activeTab === 'users' ? styles.active : ''} onClick={() => setActiveTab('users')}>Пользователи</button>
          </div>

          {/* Контент табов */}
          <div className={styles.tabContent}>
            {/* Статистика */}
            {activeTab === 'dashboard' && stats && (
              <div>
                <div className={styles.recentOrdersSection}>
                  <h2>Недавние заказы</h2>
                  {stats.recentOrders && stats.recentOrders.length > 0 ? (
                    stats.recentOrders.slice(0, 5).map(order => (
                      <div key={order.id} className={styles.recentOrder}>
                        <span className={styles.recentOrderNumber}>#{order.order_number}</span>
                        <span className={styles.recentOrderAmount}>{order.total_amount} ₽</span>
                        <span className={`${styles.recentOrderStatus} ${styles[order.status]}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptyText}>Нет заказов</p>
                  )}
                </div>
              </div>
            )}

            {/* Управление товарами */}
            {activeTab === 'menu' && (
              <div className={styles.managementSection}>
                <div className={styles.sectionHeader}>
                  <h2>Товары</h2>
                  <button onClick={handleAddProduct} className={styles.addBtn}>+ Добавить товар</button>
                </div>
                
                <div className={styles.itemsList}>
                  {products.length === 0 ? (
                    <p className={styles.emptyText}>Нет товаров</p>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Изображение</th>
                          <th>Название</th>
                          <th>Цена</th>
                          <th>Категория</th>
                          <th>Наличие</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(product => {
                          const imageUrl = getImageUrl(product.image);
                          return (
                            <tr key={product.id}>
                              <td>{product.id}</td>
                              <td>
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={product.name} 
                                    className={styles.productImage}
                                    onError={(e) => { 
                                      e.target.onerror = null;
                                      e.target.src = '/images/med.svg';
                                    }}
                                  />
                                ) : (
                                  <img 
                                    src="/images/med.svg" 
                                    alt={product.name} 
                                    className={styles.productImage}
                                  />
                                )}
                              </td>
                              <td>{product.name}</td>
                              <td>{product.price} ₽</td>
                              <td>{product.category_name || '-'}</td>
                              <td>{product.is_available ? 'В наличии' : 'Нет в наличии'}</td>
                              <td>
                                <button onClick={() => handleEditProduct(product)} className={styles.editBtn} title="Редактировать"><img src="/images/iconpen.svg" alt="Логотип" /></button>
                                <button onClick={() => handleDeleteProduct(product.id)} className={styles.deleteBtn} title="Удалить"><img src="/images/iconcart.svg" alt="Логотип" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Управление заказами */}
            {activeTab === 'orders' && (
              <div className={styles.managementSection}>
                <h2>Заказы</h2>
                <div className={styles.itemsList}>
                  {orders.length === 0 ? (
                    <p className={styles.emptyText}>Нет заказов</p>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>№ заказа</th>
                          <th>Клиент</th>
                          <th>Сумма</th>
                          <th>Статус</th>
                          <th>Дата</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id}>
                            <td>{order.order_number}</td>
                            <td>{order.user_name}</td>
                            <td>{order.total_amount} ₽</td>
                            <td>
                              <select 
                                value={order.status} 
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                className={styles.statusSelect}
                              >
                                <option value="pending">Ожидает</option>
                                <option value="processing">Готовится</option>
                                <option value="delivered">Доставлен</option>
                                <option value="cancelled">Отменен</option>
                              </select>
                            </td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td>
                              <button 
                                onClick={() => handleViewOrderDetails(order)} 
                                className={styles.viewBtn}
                              >
                                Детали
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Управление пользователями */}
            {activeTab === 'users' && (
              <div className={styles.managementSection}>
                <h2>Пользователи</h2>
                <div className={styles.itemsList}>
                  {users.length === 0 ? (
                    <p className={styles.emptyText}>Нет пользователей</p>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Имя</th>
                          <th>Email</th>
                          <th>Телефон</th>
                          <th>Роль</th>
                          <th>Регистрация</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.phone || '-'}</td>
                            <td>{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</td>
                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Модальное окно добавления/редактирования товара */}
      {showAddProduct && (
        <div className={styles.modal} onClick={() => setShowAddProduct(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{editingProduct ? 'Редактировать товар' : 'Добавить товар'}</h2>
            <form onSubmit={handleSaveProduct}>
              <input 
                type="text" 
                placeholder="Название *" 
                value={productForm.name} 
                onChange={(e) => setProductForm({...productForm, name: e.target.value})} 
                required 
              />
              <textarea 
                placeholder="Описание" 
                value={productForm.description} 
                onChange={(e) => setProductForm({...productForm, description: e.target.value})} 
                rows="3" 
              />
              <input 
                type="number" 
                placeholder="Цена (₽) *" 
                value={productForm.price} 
                onChange={(e) => setProductForm({...productForm, price: e.target.value})} 
                required 
              />
              <input 
                type="number" 
                placeholder="Старая цена (для скидки) (₽)" 
                value={productForm.old_price} 
                onChange={(e) => setProductForm({...productForm, old_price: e.target.value})} 
              />
              
              <select 
                value={productForm.category_id} 
                onChange={(e) => setProductForm({...productForm, category_id: e.target.value})}
              >
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              
              <input 
                type="text" 
                placeholder="Вес (например: 250г)" 
                value={productForm.weight} 
                onChange={(e) => setProductForm({...productForm, weight: e.target.value})} 
              />
              <input 
                type="number" 
                placeholder="Калории (ккал)" 
                value={productForm.calories} 
                onChange={(e) => setProductForm({...productForm, calories: e.target.value})} 
              />
              
              <div className={styles.imageUploadSection}>
                <label>Изображение товара</label>
                <div className={styles.imagePreviewContainer}>
                  {imagePreview ? (
                    <div className={styles.imagePreview}>
                      <img src={imagePreview} alt="Превью" />
                      <button 
                        type="button" 
                        className={styles.removeImageBtn}
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <span><img src="/images/iconphoto.svg" alt="Логотип" /></span>
                      <p>Нет изображения</p>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  onChange={handleImageChange}
                  className={styles.fileInput}
                />
                <small>Поддерживаются форматы: JPG, PNG, GIF. Максимум 5MB.</small>
              </div>
              
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={productForm.is_available} 
                  onChange={(e) => setProductForm({...productForm, is_available: e.target.checked})} 
                />
                В наличии
              </label>
              
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={productForm.is_on_sale} 
                  onChange={(e) => setProductForm({...productForm, is_on_sale: e.target.checked})} 
                />
                Скидка
              </label>
              
              {productForm.is_on_sale && (
                <input 
                  type="number" 
                  placeholder="Процент скидки" 
                  value={productForm.sale_percent} 
                  onChange={(e) => setProductForm({...productForm, sale_percent: e.target.value})} 
                />
              )}
              
              <div className={styles.modalButtons}>
                <button type="submit" className={styles.saveProductBtn} disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button type="button" onClick={() => setShowAddProduct(false)} className={styles.cancelProductBtn}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно деталей заказа */}
      {selectedOrderDetails && (
        <div className={styles.modal} onClick={() => setSelectedOrderDetails(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Детали заказа #{selectedOrderDetails.order_number}</h2>
            
            <div className={styles.orderDetails}>
              <div className={styles.orderInfoSection}>
                <h3>Информация о заказе</h3>
                <p><strong>Клиент:</strong> {selectedOrderDetails.user_name}</p>
                <p><strong>Сумма:</strong> {selectedOrderDetails.total_amount} ₽</p>
                <p><strong>Статус:</strong> <span className={getStatusClass(selectedOrderDetails.status)}>{getStatusText(selectedOrderDetails.status)}</span></p>
                <p><strong>Дата:</strong> {new Date(selectedOrderDetails.created_at).toLocaleString()}</p>
                <p><strong>Адрес доставки:</strong> {selectedOrderDetails.delivery_address}</p>
                <p><strong>Телефон:</strong> {selectedOrderDetails.phone}</p>
                {selectedOrderDetails.comment && <p><strong>Комментарий:</strong> {selectedOrderDetails.comment}</p>}
                <p><strong>Способ оплаты:</strong> {selectedOrderDetails.payment_method === 'card' ? 'Картой онлайн' : 'Наличными при получении'}</p>
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
                          <td>{item.price * item.quantity} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className={styles.totalLabel}>Итого:</td>
                        <td className={styles.totalAmount}>{selectedOrderDetails.total_amount} ₽</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className={styles.emptyText}>Нет позиций в заказе</p>
                )}
              </div>
            </div>
            
            <div className={styles.modalButtons}>
              <button onClick={() => setSelectedOrderDetails(null)} className={styles.closeDetailsBtn}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

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

export default AdminProfilePage;