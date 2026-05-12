import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './MenuPage.module.css';

const MenuPage = () => {
  const { isAuth, api } = useAuth();
  
  // Состояния для товаров и фильтров
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  
  // Состояние видимости кнопки
  const [showButton, setShowButton] = useState(false);
  
  // Состояния для уведомлений
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Функция для получения правильного URL изображения
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/images/med.svg';
    
    // Если путь уже содержит /uploads/ - добавляем http://localhost:5000
    if (imagePath.includes('/uploads/')) {
      return `http://localhost:5000${imagePath}`;
    }
    
    // Если путь содержит /images/ - используем как есть (статика из папки public)
    if (imagePath.includes('/images/')) {
      return imagePath;
    }
    
    // Fallback
    return '/images/med.svg';
  };

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Загрузка товаров
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [selectedCategory, debouncedSearchTerm, sortBy]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (sortBy === 'price_asc') params.sort = 'price_asc';
      if (sortBy === 'price_desc') params.sort = 'price_desc';
      
      const data = await api.products.getAll(params);
      setProducts(data);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      showNotification('Ошибка загрузки меню', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.products.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 2000);
  };

  const addToCart = async (productId) => {
    if (!isAuth) {
      showNotification('Войдите в аккаунт чтобы добавить товар в корзину', 'error');
      return;
    }
    try {
      await api.cart.add(productId);
      showNotification('Товар добавлен в корзину!', 'success');
    } catch (error) {
      showNotification('Ошибка при добавлении в корзину', 'error');
    }
  };

  const addToFavorites = async (productId) => {
    if (!isAuth) {
      showNotification('Войдите в аккаунт чтобы добавить в избранное', 'error');
      return;
    }
    try {
      await api.favorites.add(productId);
      showNotification('Добавлено в избранное!', 'success');
    } catch (error) {
      showNotification('Ошибка при добавлении в избранное', 'error');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getProductsByCategory = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return [];
    return products.filter(p => p.category_id === category.id);
  };

  const availableCategories = [...new Set(products.map(p => {
    const cat = categories.find(c => c.id === p.category_id);
    return cat?.name;
  }).filter(Boolean))];

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loader}>Загрузка меню...</div>
      </div>
    );
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

      <div className={styles.filtersSection}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Поиск блюд..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterControls}>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.categorySelect}
          >
            <option value="">Все категории</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="default">По умолчанию</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
          </select>
        </div>
      </div>

      {selectedCategory ? (
        <div>
          <div className={styles.menuPosition}>
            <b>{categories.find(c => c.id === parseInt(selectedCategory))?.name || 'Товары'}</b>
          </div>
          <section className={styles.bagels}>
            {products.map(product => (
              <div key={product.id} className={styles.bagelItem}>
                <img 
                  src={getImageUrl(product.image)} 
                  alt={product.name} 
                  onError={(e) => { 
                    e.target.onerror = null;
                    e.target.src = '/images/med.svg';
                  }}
                />
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className={styles.productDetails}>
                  {product.weight && <span className={styles.weight}>{product.weight}</span>}
                  <div className={styles.priceBlock}>
                    {product.is_on_sale ? (
                      <>
                        <span className={styles.oldPrice}>{product.old_price || product.price} ₽</span>
                        <span className={styles.salePrice}>{product.price} ₽</span>
                        {product.sale_percent && <span className={styles.saleBadge}>-{product.sale_percent}%</span>}
                      </>
                    ) : (
                      <span className={styles.price}>{product.price} ₽</span>
                    )}
                  </div>
                </div>
                <div className={styles.buttonGroup}>
                  <button onClick={() => addToCart(product.id)} className={styles.cartBtn}>В корзину</button>
                  <button onClick={() => addToFavorites(product.id)} className={styles.favBtn}>♥</button>
                </div>
              </div>
            ))}
          </section>
        </div>
      ) : (
        availableCategories.map(categoryName => {
          const categoryProducts = getProductsByCategory(categoryName);
          if (categoryProducts.length === 0) return null;
          
          return (
            <div key={categoryName}>
              <div className={styles.menuPosition} id={categoryName.toLowerCase()}>
                <b>{categoryName}</b>
              </div>
              <section className={styles.bagels}>
                {categoryProducts.map(product => (
                  <div key={product.id} className={styles.bagelItem}>
                    <img 
                      src={getImageUrl(product.image)} 
                      alt={product.name}
                      onError={(e) => { 
                        e.target.onerror = null;
                        e.target.src = '/images/med.svg';
                      }}
                    />
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className={styles.productDetails}>
                      {product.weight && <span className={styles.weight}>{product.weight}</span>}
                      <div className={styles.priceBlock}>
                        {product.is_on_sale ? (
                          <>
                            <span className={styles.oldPrice}>{product.old_price || product.price} ₽</span>
                            <span className={styles.salePrice}>{product.price} ₽</span>
                            {product.sale_percent && <span className={styles.saleBadge}>-{product.sale_percent}%</span>}
                          </>
                        ) : (
                          <span className={styles.price}>{product.price} ₽</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.buttonGroup}>
                      <button onClick={() => addToCart(product.id)} className={styles.cartBtn}>В корзину</button>
                      <button onClick={() => addToFavorites(product.id)} className={styles.favBtn}>♥</button>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          );
        })
      )}

      {products.length === 0 && !loading && (
        <div className={styles.noProducts}>
          <p>Товары не найдены</p>
        </div>
      )}

      {showButton && (
        <button className={styles.toTopBtn} onClick={scrollToTop} title="Наверх">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="#FFFDF6" />
            <path d="M8 14l4-4 4 4" stroke="#672e13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      
      <hr className={styles.line} />
      
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

export default MenuPage;