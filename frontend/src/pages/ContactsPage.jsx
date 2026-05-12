import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './ContactsPage.module.css';

const ContactsPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Контактная информация
  const contacts = {
    address: 'ул. Выпечки, 10, Москва, Россия',
    phone: '+7 (999) 123-45-67',
    email: 'info@bagel.ru',
    workingHours: 'Пн-Вс: 8:00 - 22:00',
    coordinates: { lat: 55.751244, lng: 37.618423 }
  };

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  }, []);

  const handleChange = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      showNotification('Заполните все поля', 'error');
      return;
    }

    setSubmitting(true);
    
    // Здесь можно отправить сообщение на бэкенд
    setTimeout(() => {
      showNotification('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.', 'success');
      setFormData({ name: '', email: '', message: '' });
      setSubmitting(false);
    }, 1000);
  }, [formData.name, formData.email, formData.message, showNotification]);

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

      {/* Hero Section */}
      <section 
        className={styles.hero} 
        style={{ backgroundImage: `url('/images/bakeryinterior.png')` }}
      >
        <div className={styles.heroOverlay}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Добро пожаловать в Bagel'!</h1>
            
            <p className={styles.heroText}>
              Мы рады пригласить вас насладиться атмосферой уюта и премиального комфорта с 8:00 до 22:00. 
              Наш элегантный интерьер и свежая выпечка, приготовленная с любовью и вниманием к деталям, ждут вас.
            </p>

            <div className={styles.infoCard}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Адрес</span>
                <span className={styles.infoValue}>{contacts.address}</span>
              </div>
              <div className={styles.infoDivider}></div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Режим работы</span>
                <span className={styles.infoValue}>{contacts.workingHours}</span>
              </div>
            </div>

            <p className={styles.heroBottomText}>
              Приходите за приятными моментами и вкусными бейглами — мы всегда рады каждому гостю!
            </p>
          </div>
        </div>
      </section>

      {/* Контактная информация и карта */}
      <section className={styles.contactSection}>
        <div className={styles.contactContainer}>
          <div className={styles.contactInfo}>
            <h2>Свяжитесь с нами</h2>
            
            <div className={styles.contactDetails}>
              <div className={styles.contactItem}>
                <img src="/images/iconaddress.svg" alt="Адрес" />
                <div>
                  <h4>Адрес</h4>
                  <p>{contacts.address}</p>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <img src="/images/iconphone.svg" alt="Телефон" />
                <div>
                  <h4>Телефон</h4>
                  <p><a href={`tel:${contacts.phone}`}>{contacts.phone}</a></p>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <img src="/images/iconletter.svg" alt="Email" />
                <div>
                  <h4>Email</h4>
                  <p><a href={`mailto:${contacts.email}`}>{contacts.email}</a></p>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <img src="/images/iconclock.svg" alt="Режим работы" />
                <div>
                  <h4>Режим работы</h4>
                  <p>{contacts.workingHours}</p>
                </div>
              </div>
            </div>

            {/* Социальные сети */}
            <div className={styles.socialLinks}>
              <h4>Мы в соцсетях</h4>
              <div className={styles.socialIcons}>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <img src="/images/Symbol.svg.svg" width="40" alt="Instagram" />
                </a>
                <a 
                  href="https://vk.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="VK"
                >
                  <img src="/images/vk_symbol.svg.svg" width="40" alt="VK" />
                </a>
              </div>
            </div>
          </div>

          {/* Карта */}
          <div className={styles.mapContainer}>
            <iframe
              title="Карта расположения пекарни Bagel"
              src="https://yandex.ru/map-widget/v1/?ll=37.618423%2C55.751244&z=16"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              className={styles.map}
            ></iframe>
          </div>
        </div>
      </section>

      {/* Форма обратной связи */}
      <section className={styles.feedbackSection}>
        <div className={styles.feedbackContainer}>
          <h2>Есть вопросы? Напишите нам</h2>
          <form onSubmit={handleSubmit} className={styles.feedbackForm}>
            <div className={styles.formRow}>
              <input
                type="text"
                name="name"
                placeholder="Ваше имя"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Ваш Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <textarea
              name="message"
              placeholder="Ваше сообщение"
              rows="5"
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Отправка...' : 'Отправить сообщение'}
            </button>
          </form>
        </div>
      </section>

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
          <img src="/images/Symbol.svg.svg" width="30" alt="Instagram" />
          <img src="/images/vk_symbol.svg.svg" width="30" alt="VK" />
        </div>
      </footer>
    </div>
  );
};

export default ContactsPage;