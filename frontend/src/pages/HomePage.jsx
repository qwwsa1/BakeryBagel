import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './HomePage.module.css';

const HomePage = () => {
  const { api } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHomeData = useCallback(async () => {
    try {
      const promosData = await api.promotions.getAll().catch(() => []);
      setPromotions(promosData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  }, [api.promotions]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loader}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
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
              <li>
                <Link to="/menu"><p><b>Меню</b></p></Link>
              </li>
              <li>
                <Link to="/info"><p><b>О нас</b></p></Link>
              </li>
              <li>
                <Link to="/contacts"><p><b>Контакты</b></p></Link>
              </li>
              <li><Link to="/profile"><p><b>Профиль</b></p></Link>
              </li>
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

      {/* Hero секция */}
      <section 
        className={styles.hero} 
        style={{ backgroundImage: `url('/images/bakeryinterior.png')` }}
      >
        <div className={styles.heroOverlay}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Bagel'</h1>
            <p className={styles.heroText}>
              Ваша любимая пекарня, где мы создаем идеальные бейглы с разными начинками!
            </p>
            <Link to="/menu" className={styles.heroBtn}>Смотреть меню</Link>
          </div>
        </div>
      </section>

      {/* Три категории */}
      <div className={styles.threeItemContainer}>
        <div className={styles.photoItem1}>
          <Link to="/menu#classic">
            <img src="/images/firstitemnone.svg" alt="Классические" />
            <p className={styles.shinyText}>КЛАССИЧЕСКИЕ</p>
          </Link>
        </div>
        
        <div className={styles.photoItem2}>
          <Link to="/menu#new">
            <img src="/images/seconditemnone.svg" alt="Новинки" />
            <p className={styles.shinyText}>НОВИНКИ</p>
          </Link>
        </div>
        
        <div className={styles.photoItem3}>
          <Link to="/menu#sweet">
            <img src="/images/Thirditemnone.svg" alt="Сладкие" />
            <p className={styles.shinyText}>СЛАДКИЕ</p>
          </Link>
        </div>
      </div>

      {/* Акции */}
      {promotions.length > 0 && (
        <section className={styles.promotions}>
          <div className={styles.promotionsContainer}>
            <h2 className={styles.sectionTitle}>Акции и предложения</h2>
            <div className={styles.promotionsGrid}>
              {promotions.slice(0, 3).map(promo => (
                <div key={promo.id} className={styles.promoCard}>
                  <img src="/images/iconsale.svg" alt="Акция" />
                  <h3>{promo.title}</h3>
                  <p>{promo.description}</p>
                  {promo.discount_percent && (
                    <span className={styles.promoDiscount}>-{promo.discount_percent}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Преимущества */}
      <section className={styles.advantages}>
        <div className={styles.advantagesContainer}>
          <h2 className={styles.sectionTitle}>Почему выбирают нас?</h2>
          <div className={styles.advantagesGrid}>
            <div className={styles.advantageCard}>
              <img src="/images/iconbagel.svg" alt="Свежая выпечка" />
              <h3>Свежая выпечка</h3>
              <p>Каждый день с 8 утра мы печем свежие бейглы</p>
            </div>
            <div className={styles.advantageCard}>
              <img src="/images/iconnatural.svg" alt="Натуральные ингредиенты" />
              <h3>Натуральные ингредиенты</h3>
              <p>Используем только качественные продукты</p>
            </div>
            <div className={styles.advantageCard}>
              <img src="/images/icondelivery.svg" alt="Быстрая доставка" />
              <h3>Быстрая доставка</h3>
              <p>Доставим заказ в течение часа</p>
            </div>
            <div className={styles.advantageCard}>
              <img src="/images/iconcard.svg" alt="Удобная оплата" />
              <h3>Удобная оплата</h3>
              <p>Картой онлайн или наличными при получении</p>
            </div>
          </div>
        </div>
      </section>

      <hr className={styles.line} />
      
      {/* Футер */}
      <footer className={styles.footer}>
        <div className={styles.infoFooter}>
          <p>
            <b>info@bagel.ru<br />ул. Выпечки, 10, Москва, Россия</b>
          </p>
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

export default HomePage;