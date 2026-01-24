import React from "react";
import "../style/section3.css";

const Section3 = () => {
const features = [
  {
    icon: "fa-solid fa-graduation-cap",
    title: "تعلم من الخبراء",
    description: "دورات تدريبية من أفضل المعلمين المتخصصين في مجالاتهم"
  },
  {
    icon: "fa-solid fa-clock",
    title: "مرن في الوقت",
    description: "تعلم في أي وقت ومن أي مكان مع دروس مسجلة ومباشرة"
  },
  {
    icon: "fa-solid fa-mobile-screen-button",
    title: "منصة متعددة الأجهزة",
    description: "تواصل مع دروسك من هاتفك، تابلتك أو حاسوبك"
  },
  {
    icon: "fa-solid fa-book-open",
    title: "محتوى متنوع",
    description: "آلاف الدورات في مختلف المجالات والتخصصات"
  },
  {
    icon: "fa-solid fa-users",
    title: "مجتمع تفاعلي",
    description: "تواصل مع زملائك والمعلمين من خلال المنتديات والمجموعات"
  },
  {
    icon: "fa-solid fa-chart-line",
    title: "تتبع التقدم",
    description: "راقب تقدمك وتحصيلك العلمي من خلال لوحة التحكم الشخصية"
  }
];


  return (
    <section className="section3">
      <div className="section3-container">
        <div className="section3-header">
          <h2 className="section3-title">لماذا تختار منصتنا؟</h2>
          <p className="section3-subtitle">
            نقدم لك تجربة تعلم استثنائية تجمع بين الجودة والمرونة والدعم المستمر
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">
                <span><i className={feature.icon}></i></span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Section3;