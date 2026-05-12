import React from 'react';
import { Link } from 'react-router-dom';
import styles from './InfoPage.module.css';

const InfoPage = () => {
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

      {/* Hero Section */}
      <section className={styles.hero} style={{ backgroundImage: `url('/images/hero-bagels.svg')` }}>
        <div className={styles.heroOverlay}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>О нашей пекарне</h1>
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className={styles.history}>
        <div className={styles.container}>
          <div className={styles.historyGrid}>
            <div className={styles.historyText}>
              <p className={styles.historyParagraph}>
                <span className={styles.accent}>Бейглы</span> появились в 17 веке в еврейских общинах Кракова, Польша. 
                Их уникальная особенность — варка теста перед выпечкой, что придает им плотную текстуру и хрустящую корочку. 
                Сегодня бейглы популярны во всем мире и символизируют традиции и домашний уют.
              </p>
              <p className={styles.historyParagraph}>
                Мы готовим наши бейглы по классическим рецептам и из натуральных ингредиентов, чтобы вы могли насладиться 
                аутентичным вкусом. Наши бейглы — отличный выбор для завтрака и перекуса в любое время дня.
              </p>
            </div>
            <div className={styles.historyImage}>
              <img src="/images/bagel-plate.svg" alt="Бейгл с кунжутом" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>выпекаем</p>
              <h3 className={styles.statNumber}>15 000</h3>
              <p className={styles.statText}>бейглов в месяц</p>
            </div>
            
            <div className={styles.statCard}>
              <p className={styles.statLabel}>обрабатываем до</p>
              <h3 className={styles.statNumber}>100</h3>
              <p className={styles.statText}>заказов в час</p>
            </div>
            
            <div className={styles.statCard}>
              <p className={styles.statLabel}>ежегодно обслуживаем</p>
              <h3 className={styles.statNumber}>100 000+</h3>
              <p className={styles.statText}>довольных гостей</p>
            </div>
            
            <div className={styles.statCard}>
              <p className={styles.statLabel}>средний чек составляет</p>
              <h3 className={styles.statNumber}>1 250 ₽</h3>
              <p className={styles.statText}></p>
            </div>
          </div>
        </div>
      </section>

      {/* Production Section */}
      <section className={styles.production}>
        <div className={styles.container}>
          <div className={styles.productionGrid}>
            <div className={styles.productionImage}>
              <img src="/images/baker.svg" alt="Пекарня, приготовление теста" />
            </div>
            <div className={styles.productionText}>
              <p className={styles.productionParagraph}>
                <span className={styles.accent}>Производство</span> бейглов в нашей пекарне основано на традиционных техниках 
                и ручном труде, что позволяет нам сохранять аутентичный вкус и исключительное качество каждого изделия. 
                Мы тщательно отбираем ингредиенты и следим за каждым этапом приготовления.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Atmosphere Section */}
      <section className={styles.atmosphere}>
        <div className={styles.container}>
          <div className={styles.atmosphereText}>
            <p>
              <span className={styles.accent}>Атмосфера</span> в наших пекарнях теплая и гостеприимная, что позволяет 
              каждому гостю чувствовать себя комфортно и непринужденно. Благодаря светлым интерьерам, натуральным 
              материалам и вниманию к деталям, наши пространства идеально подходят для быстрого перекуса или 
              спокойного отдыха за свежей выпечкой. Мы стремимся создать атмосферу, которая отражает нашу 
              преданность качеству и традициям, принося радость и вдохновение с каждым визитом.
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className={styles.gallery}>
        <div className={styles.galleryGrid}>
          <div className={styles.galleryItem}>
            <img src="/images/interior-1.svg" alt="Интерьер пекарни" />
          </div>
          <div className={styles.galleryItem}>
            <img src="/images/interior-2.svg" alt="Интерьер пекарни" />
          </div>
          <div className={styles.galleryItem}>
            <img src="/images/interior-3.svg" alt="Интерьер пекарни" />
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

export default InfoPage;