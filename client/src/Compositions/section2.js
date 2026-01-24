import React, { useState, useEffect, useRef } from "react";
import "../style/section2.css";
import {   Link ,useNavigate } from "react-router-dom";

const Section2 = () => {
  const [courses, setCourses] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const slidesRef = useRef(null);

  useEffect(() => {
    fetchCourses();
  }, []);
let navigate = useNavigate()
  const fetchCourses = async () => {
    try {
      const res = await fetch("http://localhost:5001/course/recommended");
      const data = await res.json();
      if (data.msg && data.courses) setCourses(data.courses);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    if (!courses.length) return;
    setCurrentSlide((s) => (s + 1) % courses.length);
  };

  const prevSlide = () => {
    if (!courses.length) return;
    setCurrentSlide((s) => (s - 1 + courses.length) % courses.length);
  };

  const goToSlide = (i) => setCurrentSlide(i);

  // auto slide every 5s
  useEffect(() => {
    if (courses.length <= 1) return;
    const id = setInterval(nextSlide, 5000);
    return () => clearInterval(id);
  }, [courses.length]);

  const formatDate = (d) => {
    if (!d) return "قريباً";
    return new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) return <div className="section2"><div className="loading">جاري التحميل...</div></div>;

  return (
    <section className="section2">
      <div className="section2-container">
        <div className="section2-text">
          <h1 className="main-title">
            <span className="title-normal">كورسات  </span>
            <span className="title-highlight">مقترحة</span>
          </h1>
          <p className="description"> تقدر تختار كورسات مقترحة من افضل كورسات المنصة</p>
        </div>

        <div className="slider-wrapper" aria-roledescription="carousel">
          <div className="slider">
            {/* slides: apply transform only here on .slides */}
            <div
              className="slides"
              ref={slidesRef}
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {courses.map((course, idx) => (
                <article className="slide" key={course._id || idx} aria-hidden={idx !== currentSlide}>
                  <div className="image-wrapper">
                    <img src={`http://localhost:5001${course.image}`} alt={course.name} />
                    <div className="overlay" />
                    <div className="slide-info">
                      <h3>{course.name}</h3>
                      <p className="short-desc">{course.description}</p>
                      {/* <div className="dates">
                        <span>📅 {formatDate(course.startDate)}</span>
                        <span>⏰ {formatDate(course.endDate)}</span>
                      </div> */}
                      {course.teacher && <p className="teacher"><i class="fa-solid fa-chalkboard-user"></i>  {course.teacher.name} </p>}
                      <div className="price">{course.price} جنيه</div>
                      <div className="buttons">
                        <button className="btn-secondary" onClick={() => navigate(`/course/${course._id}`)}>تفاصيل</button>
                        <button className="btn-primary" onClick={() => navigate(`/subscription/${course._id}`)} >اشترك الآن</button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {courses.length > 1 && (
              <>
                <button className="nav-btn prev" onClick={prevSlide} aria-label="Previous">‹</button>
                <button className="nav-btn next" onClick={nextSlide} aria-label="Next">›</button>
              </>
            )}
          </div>

          {courses.length > 1 && (
            <div className="slider-dots" role="tablist" aria-label="Slides navigation">
              {courses.map((_, i) => (
                <button
                  key={i}
                  className={`dot ${i === currentSlide ? "active" : ""}`}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Section2;
