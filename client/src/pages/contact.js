import React, { useState } from 'react';
import '../style/contact.css';
import { useNavigate } from 'react-router-dom';

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  // معلومات الاتصال
  const contactInfo = [
    {
      icon: 'fas fa-envelope',
      title: 'البريد الإلكتروني',
      details: 'info@edubridge.com',
      action: 'mailto:ziad1942007@gmail.com'
    },
    {
      icon: 'fas fa-phone-alt',
      title: 'رقم الهاتف',
      details: '+20 100 123 4567',
      action: 'tel:+201044332508'
    },
    // {
    //   icon: 'fas fa-map-marker-alt',
    //   title: 'العنوان',
    //   details: 'القاهرة، مصر',
    //   action: 'https://maps.google.com/?q=القاهرة'
    // },
    {
      icon: 'fas fa-clock',
      title: 'ساعات العمل',
      details: 'الأحد - الخميس: 9 ص - 5 م',
      action: null
    }
  ];

  // وسائل التواصل الاجتماعي
  const socialLinks = [
    { icon: 'fab fa-facebook-f', name: 'facebook', url: '#' },
    { icon: 'fab fa-twitter', name: 'twitter', url: '#' },
    { icon: 'fab fa-linkedin-in', name: 'linkedin', url: '#' },
    { icon: 'fab fa-instagram', name: 'instagram', url: '#' },
    { icon: 'fab fa-youtube', name: 'youtube', url: '#' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      const telegramBotToken = '8432497906:AAEJ1HeP_oKQ-8uaCFbHJcZBRZQQnicOBfA';
      const chatId = '7651215883';
      
      const messageText = `
        📩 رسالة اتصال جديدة من المنصة التعليمية:
        
        👤 الاسم: ${formData.name}
        📧 البريد: ${formData.email}
        📱 الهاتف: ${formData.phone}
        🎯 الموضوع: ${formData.subject}
        
        📝 الرسالة:
        ${formData.message}
        
        📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}
      `;

      const response = await fetch(
        `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(messageText)}`
      );

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'تم إرسال رسالتك بنجاح! سنتواصل معك قريبًا.'
        });
        
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
        
        setTimeout(() => {
          const confirmMessage = `✅ تم استلام رسالة من: ${formData.name} - ${formData.subject}`;
          fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(confirmMessage)}`);
        }, 1000);
        
      } else {
        throw new Error('فشل في إرسال الرسالة');
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus({
        type: 'error',
        message: 'حدث خطأ أثناء إرسال رسالتك. يرجى المحاولة مرة أخرى.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="contact-container">
        {/* العنوان الرئيسي */}
        <div className="contact-header">
          <h1 className="contact-title" style={{ fontFamily: "'Amiri Quran', serif" }}>
            <i className="fas fa-headset contact-title-icon"></i>
            تواصل معنا
          </h1>
          <p className="contact-subtitle">
            نحن هنا لمساعدتك! لا تتردد في التواصل معنا لأي استفسارات أو اقتراحات.
          </p>
        </div>

        <div className="contact-content">
          {/* معلومات الاتصال */}
          <div className="contact-info">
            <div className="info-card">
              <h3 style={{ fontFamily: "'Amiri Quran', serif" }}>
                <i className="fas fa-info-circle"></i>
                معلومات التواصل
              </h3>
              <p>يمكنك التواصل معنا عبر أي من الوسائل التالية:</p>
              
              <div className="contact-methods">
                {contactInfo.map((info, index) => (
                  <a 
                    key={index}
                    href={info.action}
                    className={`contact-method ${!info.action ? 'no-action' : ''}`}
                    target={info.action?.startsWith('http') ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                  >
                    <div className="method-icon">
                      <i className={info.icon}></i>
                    </div>
                    <div className="method-details">
                      <h4>{info.title}</h4>
                      <p>{info.details}</p>
                    </div>
                  </a>
                ))}
              </div>

              {/* وسائل التواصل الاجتماعي */}
              {/* <div className="social-section">
                <h4>
                  <i className="fas fa-share-alt"></i>
                  تابعنا على
                </h4>
                <div className="social-links">
                  {socialLinks.map((social, index) => (
                    <a 
                      key={index}
                      href={social.url}
                      className={`social-link ${social.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className={social.icon}></i>
                    </a>
                  ))}
                </div>
              </div> */}
            </div>
          </div>

          {/* نموذج الاتصال */}
          <div className="contact-form-section">
            <div className="form-card">
              <h3 style={{ fontFamily: "'Amiri Quran', serif" }}>
                <i className="fas fa-paper-plane"></i>
                أرسل رسالة
              </h3>
              <p>املأ النموذج وسنرد عليك في أقرب وقت ممكن</p>
              
              {submitStatus.message && (
                <div className={`submit-status ${submitStatus.type}`}>
                  <i className={`fas fa-${submitStatus.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                  {submitStatus.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">
                      <i className="fas fa-user"></i>
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="أدخل اسمك الكامل"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">
                      <i className="fas fa-envelope"></i>
                      البريد الإلكتروني *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="example@domain.com"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">
                      <i className="fas fa-phone"></i>
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+20 100 000 0000"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="subject">
                      <i className="fas fa-tag"></i>
                      موضوع الرسالة *
                    </label>
                    <div className="select-wrapper">
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="">اختر الموضوع</option>
                        <option value="استفسار عام">استفسار عام</option>
                        <option value="دعم فني">دعم فني</option>
                        <option value="اقتراح">اقتراح</option>
                        <option value="شراكة">شراكة</option>
                        <option value="شكوى">شكوى</option>
                        <option value="آخر">آخر</option>
                      </select>
                      <i className="fas fa-chevron-down select-arrow"></i>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">
                    <i className="fas fa-comment-dots"></i>
                    الرسالة *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="5"
                    placeholder="اكتب رسالتك هنا..."
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        إرسال 
                      </>
                    )}
                  </button>
                  
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => navigate('/')}
                  >
                    <i className="fas fa-home"></i>
                    العودة 
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="faq-preview">
          <h3>
            <i className="fas fa-question-circle"></i>
            أسئلة شائعة
          </h3>
          <div className="faq-items">
            <div className="faq-item">
              <h4>
                <i className="fas fa-headset"></i>
                ما هي أوقات الدعم الفني؟
              </h4>
              <p>الدعم الفني متاح من الأحد إلى الخميس، من 9 صباحًا حتى 5 مساءً.</p>
            </div>
            <div className="faq-item">
              <h4>
                <i className="fas fa-clock"></i>
                كم تستغرق مدة الرد على الاستفسارات؟
              </h4>
              <p>نرد على جميع الاستفسارات خلال 24 ساعة عمل.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;