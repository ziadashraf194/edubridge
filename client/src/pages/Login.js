import { useState,useEffect } from "react";
import "../style/login.css";
import { Link } from "react-router";
import Cookies from "js-cookie";
export default function Login() {
      useEffect(() => {
     const token = Cookies.get("token") 
    if (token) {
      window.location.href = "/dashboard"
    }
    }, []);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // دوال التحقق
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) validateField(name, value);
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field, value) => {
    let error = "";
    if (field === "email" && !validateEmail(value)) {
      error = "البريد الإلكتروني غير صحيح";
    }
    if (field === "password" && value.length < 6) {
      error = "كلمة المرور يجب ألا تقل عن 6 أحرف";
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  const getInputClass = (field) => {
    if (!touched[field]) return "";
    return errors[field] ? "login-error" : "login-success";
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
      const response = await fetch("http://localhost:5001/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setFormData({ email: "", password: "" });
        setTouched({});
        setTimeout(() => (window.location.href = "/"), 0);
      } else {
        const errorField =
          data.error?.includes("بريد") ? "email" :
          data.error?.includes("كلمة") ? "password" : null;

        if (errorField) setErrors((prev) => ({ ...prev, [errorField]: data.error }));
        else alert(data.error || "حدث خطأ أثناء تسجيل الدخول");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("حدث خطأ في الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-grid-overlay"></div>

      {showSuccess && (
        <div className="login-success-notification">
          <div className="login-success-icon">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div className="login-success-text">
            <h4>تم تسجيل الدخول بنجاح!</h4>
            <p>جاري تحويلك إلى لوحة التحكم...</p>
          </div>
        </div>
      )}

      <div className="login-container">
        {/* Left Panel */}
        <div className="login-left-panel">
          <div className="login-left-content">
            <div className="login-brand">
              <div className="login-brand-logo">
                <i className="fa-solid fa-lock"></i>
              </div>
              <h1>مرحبًا بعودتك</h1>
              <p>قم بتسجيل الدخول للوصول إلى حسابك واستكشاف الكورسات.</p>
            </div>

            <div className="login-features">
              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div className="login-feature-text">
                  <h3>استخدام بسيط وآمن</h3>
                  <p>   </p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <i className="fa-solid fa-bullseye"></i>
                </div>
                <div className="login-feature-text">
                  <h3>تجربة سلسة</h3>
                  {/* <p>دخول فوري إلى لوحة التحكم</p> */}
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <i className="fa-regular fa-lightbulb"></i>
                </div>
                <div className="login-feature-text">
                  <h3>تعلم بلا حدود</h3>
                  {/* <p>اكتشف محتوى مميز يوميًا</p> */}
                </div>
              </div>
            </div>
          </div>
          <div className="login-decorative-shape"></div>
        </div>

        {/* Right Panel */}
        <div className="login-right-panel">
          <div className="login-form-header">
            <h2>
              <i className="fa-solid fa-right-to-bracket"></i> تسجيل الدخول
            </h2>
            <p>أدخل بيانات حسابك للمتابعة</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label>
                <i className="fa-solid fa-envelope"></i> البريد الإلكتروني
              </label>
              <input
                type="email"
                name="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur("email")}
                className={`login-input ${getInputClass("email")}`}
              />
              {errors.email && touched.email && (
                <div className="login-error-message">{errors.email}</div>
              )}
            </div>

            <div className="login-form-group">
              <label>
                <i className="fa-solid fa-lock"></i> كلمة المرور
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onBlur={() => handleBlur("password")}
                className={`login-input ${getInputClass("password")}`}
              />
              {errors.password && touched.password && (
                <div className="login-error-message">{errors.password}</div>
              )}
            </div>

            <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="login-loading-spinner"></span>
              ) : (
                <>
                  <i className="fa-solid fa-arrow-right-to-bracket"></i> تسجيل الدخول
                </>
              )}
            </button>

            <p className="login-switch">
              ليس لديك حساب؟{" "}
              <Link to="/register">
                <i className="fa-solid fa-user-plus"></i> إنشاء حساب جديد
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
