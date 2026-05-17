import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './AuthPage.module.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Валидация имени (только буквы и пробелы, без цифр)
  const validateName = useCallback((name) => {
    if (/\d/.test(name)) {
      return 'Имя не может содержать цифры';
    }
    return '';
  }, []);

  // Валидация email
  const validateEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(email)) {
      return 'Введите корректный email';
    }
    return '';
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Для поля имени - блокируем ввод цифр
    if (name === 'name') {
      if (/\d/.test(value)) {
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Валидация для регистрации
    if (!isLogin) {
      const nameError = validateName(formData.name);
      if (nameError) {
        setError(nameError);
        return;
      }
      
      if (!formData.name.trim()) {
        setError('Введите ваше имя');
        return;
      }
      
      const emailError = validateEmail(formData.email);
      if (emailError) {
        setError(emailError);
        return;
      }
      
      if (formData.password.length < 6) {
        setError('Пароль должен быть не менее 6 символов');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
    } else {
      const emailError = validateEmail(formData.email);
      if (emailError) {
        setError(emailError);
        return;
      }
      
      if (!formData.password) {
        setError('Введите пароль');
        return;
      }
    }
    
    setLoading(true);

    if (isLogin) {
      const result = await login(formData.email, formData.password);
      setLoading(false);
      
      if (result.success) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/profile');
          }
        } else {
          navigate('/profile');
        }
      } else {
        setError(result.error || 'Неверный email или пароль');
      }
    } else {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email,
        password: formData.password
      });
      setLoading(false);
      
      if (result.success) {
        navigate('/profile');
      } else {
        setError(result.error || 'Ошибка регистрации. Возможно, email уже используется.');
      }
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

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

      <main className={styles.mainContent}>
        <div className={styles.authContainer}>
          <h1 className={styles.title}>
            {isLogin ? 'С возвращением!' : 'Создать аккаунт'}
          </h1>
          <p className={styles.subtitle}>
            {isLogin ? 'Войдите в свой аккаунт' : 'Присоединяйтесь к нашей пекарне'}
          </p>
          
          <form className={styles.form} onSubmit={handleSubmit}>
            {!isLogin && (
              <div className={styles.formGroup}>
                <label>Ваше имя</label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Иван Иванов"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className={styles.formGroup}>
              <label>Email</label>
              <input 
                type="email" 
                name="email" 
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Пароль</label>
              <input 
                type="password" 
                name="password" 
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {!isLogin && (
                <small className={styles.hint}>Минимум 6 символов</small>
              )}
            </div>
            
            {!isLogin && (
              <div className={styles.formGroup}>
                <label>Подтвердите пароль</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            
            {error && <p className={styles.error}>{error}</p>}
            
            <button 
              type="submit" 
              className={styles.authBtn}
              disabled={loading}
            >
              {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </form>
          
          <div className={styles.links}>
            <p>
              {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
              <button 
                type="button" 
                onClick={toggleMode}
                className={styles.toggleBtn}
              >
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </p>
          </div>
        </div>
      </main>

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

export default AuthPage;