import React, { useState, useEffect } from "react";
import "../style/register.css";
import { Link } from "react-router";
import Cookies from "js-cookie";
const Register = () => {
    useEffect(() => {
   const token = Cookies.get("token") 
  if (token) {
    window.location.href = "/"
  }
  }, []);


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    fatherPhone: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({ level: 0, text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^01[0-2,5]{1}[0-9]{8}$/.test(phone);

  const checkPasswordStrength = (password) => {
    if (password.length === 0) return { level: 0, text: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: strength, text: "ضعيفة ⚠️", color: "#fc8181", type: "weak" };
    if (strength <= 4) return { level: strength, text: "متوسطة ⚡", color: "#ed8936", type: "medium" };
    return { level: 4, text: "قوية ✓", color: "#48bb78", type: "strong" };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }

    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field, value) => {
    let error = "";

    switch (field) {
      case "name":
        if (value.trim().length < 3) error = "الاسم يجب أن يكون 3 أحرف على الأقل";
        break;
      case "email":
        if (!validateEmail(value)) error = "البريد الإلكتروني غير صحيح";
        break;
      case "password":
        if (value.length < 8) error = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
        break;
      case "phone":
        if (!validatePhone(value)) error = "رقم الهاتف غير صحيح";
        break;
      case "fatherPhone":
        if (value && !validatePhone(value)) error = "رقم الهاتف غير صحيح";
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    let isValid = true;
    Object.keys(formData).forEach((field) => {
      if (!validateField(field, formData[field])) isValid = false;
    });

    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5001/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setFormData({ name: "", email: "", password: "", phone: "", fatherPhone: "" });
        setTouched({});
        window.location.href = "/"
      } else {
        const errorField =
          data.error?.includes("بريد") ? "email" :
          data.error?.includes("كلمة") ? "password" :
          data.error?.includes("هاتف") ? "phone" : null;
        if (errorField) setErrors((prev) => ({ ...prev, [errorField]: data.error }));
        else alert(data.error || "حدث خطأ أثناء التسجيل");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("حدث خطأ في الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const particles = document.getElementById("register-particles");
    if (particles) {
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement("div");
        particle.className = "register-particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.width = particle.style.height = Math.random() * 10 + 5 + "px";
        particle.style.animationDuration = Math.random() * 10 + 10 + "s";
        particle.style.animationDelay = Math.random() * 5 + "s";
        particles.appendChild(particle);
      }
    }
  }, []);

  const getInputClass = (field) => {
    if (!touched[field]) return "";
    return errors[field] ? "register-error" : "register-success";
  };

  return (
    <div className="register-page">
      <div className="register-particles" id="register-particles"></div>
      <div className="register-grid-overlay"></div>

      {showSuccess && (
        <div className="register-success-notification">
          <div className="register-success-icon">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div className="register-success-text">
            <h4>تم التسجيل بنجاح!</h4>
            <p>جاري تحويلك إلى لوحة التحكم...</p>
          </div>
        </div>
      )}

      <div className="register-container">
        {/* Left Panel */}
        <div className="register-left-panel">
          <div className="register-left-content">
            <div className="register-brand">
              <div className="register-brand-logo">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <h1>EduBridge</h1>
              <p>انضم إلى آلاف الطلاب حول العالم واكتشف عالماً من المعرفة والفرص</p>
            </div>

            <div className="register-features">
              <div className="register-feature-item">
                <div className="register-feature-icon">
                  <i className="fa-solid fa-book-open-reader"></i>
                </div>
                <div className="register-feature-text">
                  <h3>محتوى غني ومتنوع</h3>
                  <p>أكثر من 500 دورة تعليمية</p>
                </div>
              </div>

              <div className="register-feature-item">
                <div className="register-feature-icon">
                  <i className="fa-solid fa-trophy"></i>
                </div>
                <div className="register-feature-text">
                  <h3>شهادات معتمدة</h3>
                  <p>احصل على شهادات موثقة</p>
                </div>
              </div>

              <div className="register-feature-item">
                <div className="register-feature-icon">
                  <i className="fa-solid fa-headset"></i>
                </div>
                <div className="register-feature-text">
                  <h3>دعم مستمر</h3>
                  <p>فريق متاح 24/7 لمساعدتك</p>
                </div>
              </div>
            </div>
          </div>
          <div className="register-decorative-shape"></div>
        </div>

        {/* Right Panel */}
        <div className="register-right-panel">
          <div className="register-form-header">
            <h2>
              <i className="fa-solid fa-user-plus"></i> إنشاء حساب جديد
            </h2>
            <p>ابدأ رحلتك التعليمية معنا اليوم</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="register-form-group">
              <label htmlFor="name" className="register-label">
                <i className="fa-solid fa-user"></i> الاسم الكامل
              </label>
              <div className="register-input-wrapper">
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="أدخل اسمك الكامل"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  className={`register-input ${getInputClass("name")}`}
                  required
                />
              </div>
              {errors.name && touched.name && (
                <div className="register-error-message">{errors.name}</div>
              )}
            </div>

            <div className="register-form-group">
              <label htmlFor="email" className="register-label">
                <i className="fa-solid fa-envelope"></i> البريد الإلكتروني
              </label>
              <div className="register-input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="example@domain.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur("email")}
                  className={`register-input ${getInputClass("email")}`}
                  required
                />
              </div>
              {errors.email && touched.email && (
                <div className="register-error-message">{errors.email}</div>
              )}
            </div>

            <div className="register-form-group">
              <label htmlFor="password" className="register-label">
                <i className="fa-solid fa-lock"></i> كلمة المرور
              </label>
              <div className="register-input-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="أدخل كلمة مرور قوية"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  className={`register-input ${getInputClass("password")}`}
                  required
                />
              </div>

              {formData.password && (
                <div className="register-password-strength">
                  <div className="register-strength-bars">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`register-strength-bar ${
                          i < Math.min(passwordStrength.level, 4)
                            ? `register-active register-${passwordStrength.type}`
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                  <div
                    className="register-strength-text"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.text}
                  </div>
                </div>
              )}
              {errors.password && touched.password && (
                <div className="register-error-message">{errors.password}</div>
              )}
            </div>

            <div className="register-form-group">
              <label htmlFor="phone" className="register-label">
                <i className="fa-solid fa-phone"></i> رقم الهاتف
              </label>
              <div className="register-input-wrapper">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="01xxxxxxxxx"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={() => handleBlur("phone")}
                  className={`register-input ${getInputClass("phone")}`}
                  required
                />
              </div>
              {errors.phone && touched.phone && (
                <div className="register-error-message">{errors.phone}</div>
              )}
            </div>

            <div className="register-form-group">
              <label htmlFor="fatherPhone" className="register-label">
                <i className="fa-solid fa-user-tie"></i> رقم هاتف ولي الأمر (اختياري)
              </label>
              <div className="register-input-wrapper">
                <input
                  type="tel"
                  id="fatherPhone"
                  name="fatherPhone"
                  placeholder="01xxxxxxxxx"
                  value={formData.fatherPhone}
                  onChange={handleChange}
                  onBlur={() => handleBlur("fatherPhone")}
                  className={`register-input ${getInputClass("fatherPhone")}`}
                />
              </div>
              {errors.fatherPhone && touched.fatherPhone && (
                <div className="register-error-message">{errors.fatherPhone}</div>
              )}
            </div>

            <button type="submit" className="register-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="register-loading-spinner"></span>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus"></i> إنشاء حساب
                </>
              )}
            </button>
          </form>

          <div className="register-divider">
            <span>أو</span>
          </div>

          <div className="register-login-link">
            لديك حساب بالفعل؟{" "}
             <Link to="/login">
              <i className="fa-solid fa-right-to-bracket"></i> تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
