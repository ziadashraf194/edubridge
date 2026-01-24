import React from "react";
import { Link } from "react-router-dom";
import "../style/404.css"
export default function NotFound() {
  return (
    <section className="NotFound">
      <div className="hero-content">
        <div className="hero-text">
          <h1>404 - الصفحة غير موجودة</h1>
          <p>يبدو أنك وصلت إلى صفحة غير موجودة. ربما الرابط غير صحيح أو تم نقل الصفحة.</p>
          <div className="Section1-btn">
            <Link to="/" className="back-home">العودة إلى الصفحة الرئيسية</Link>
          </div>
        </div>
        <div className="image-404">
          {/* لاحظ هنا ↓↓↓ */}
          <img src="/404.svg" alt="Not Found" />
        </div>
      </div>
    </section>
  );
}
