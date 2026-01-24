import React from "react";
import "../style/section4.css";

const Section4 = () => {
  const stats = [
    { number: "50,000+", label: "طالب مسجل" },
    { number: "1,000+", label: "دورة تدريبية" },
    { number: "200+", label: "معلم محترف" },
    { number: "98%", label: "رضا العملاء" }
  ];

  const testimonials = [
    {
      content: "المنصة غيرت حياتي المهنية تمامًا، تمكنت من تعلم مهارات جديدة ساعدتني في الحصول على ترقية.",
      name: "أحمد محمد",
      role: "مهندس برمجيات"
    },
    {
      content: "أفضل منصة عربية للتعلم عن بعد، المحتوى غني والشرح واضح جدًا.",
      name: "سارة عبدالله",
      role: "طالبة جامعية"
    },
    {
      content: "الدعم الفني ممتاز والمعلمون دائمًا متاحون للإجابة على أسئلتي.",
      name: "خالد السعيد",
      role: "رائد أعمال"
    }
  ];

  return (
    <section className="section4">
      <div className="section4-container">
        <div className="section4-header">
          <h2 className="section4-title">نجاحاتنا تتحدث عنا</h2>
          <p className="section4-subtitle">
            انضم إلى آلاف الناجحين الذين طوروا مهاراتهم معنا
          </p>
        </div>
        
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div className="stat-card" key={index}>
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
        
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div className="testimonial-card" key={index}>
              <p className="testimonial-content">"{testimonial.content}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="author-info">
                  <h4>{testimonial.name}</h4>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Section4;