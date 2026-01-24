import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../style/allCourses.css";
import { useNavigate } from 'react-router-dom';


export default function AllCourses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);
const navigate = useNavigate();

  // 🔍 البحث عن الكورسات بالاسم أو اسم المعلم
  const handleSearch = async (e) => {
    const value = e.target.value.trim();
    setSearch(value);
    setPage(1);

    try {
      let url = `http://localhost:5001/course?page=1`;
      if (value) url += `&search=${value}`;

      const res = await axios.get(url);
      setCourses(res.data.courses || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(" خطأ أثناء البحث:", err);
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      if (loading) return;
      if (search.trim() !== "" && page > 1) return; // لا نكمل عند وجود بحث
      setLoading(true);

      try {
        const res = await axios.get(
          `http://localhost:5001/course?page=${page}${
            search ? `&search=${search}` : ""
          }`
        );

        setCourses((prev) => {
          if (page === 1) return res.data.courses || [];
          const newCourses = res.data.courses.filter(
            (c) => !prev.some((pc) => pc._id === c._id)
          );
          return [...prev, ...newCourses];
        });

        setTotalPages(res.data.totalPages);
      } catch (err) {
        console.error( err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [page, search]);

  useEffect(() => {
    if (!loaderRef.current || page >= totalPages || search.trim() !== "") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loaderRef, totalPages, search]); 

  return (
    <div className="all-courses-container">
      {/* 🔹 العنوان وشريط البحث */}
      <div className="header-row">
        <h2 className="title">
          كل الكورسات <i className="fa-solid fa-book-open-reader"></i>
        </h2>

        <div className="search-bar">
          <input
            type="text"
            placeholder="ابحث باسم الكورس أو المعلم..."
            value={search}
            onChange={handleSearch}
          />
          <i className="fa-solid fa-magnifying-glass"></i>
        </div>
      </div>

     {/* 🔹 شبكة عرض الكورسات */}
      <div className="courses-grid">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div key={course._id} className="course-card">
              <div className="course-image-wrapper">
                <img
                  src={`http://localhost:5001${course.image}`}
                  alt={course.name}
                  className="course-image"
                />
                {course.sale > 0 && (
                  <div className="sale-badge">خصم {course.sale}%</div>
                )}
              </div>
              
              <div className="course-info">
                <h3>{course.name}</h3>
                <p className="course-description">
                  {course.description !== "undefined" && course.description 
                    ? course.description 
                    : "وصف الكورس غير متوفر"}
                </p>
                
                <div className="course-meta">
                  <span className="teacher">
                    <i className="fa-solid fa-chalkboard-user"></i>
                    {course.teacher?.name || "غير معروف"}
                  </span>
                  
                  
                  {/* <span className="lessons-count">
                    <i className="fa-solid fa-video"></i>
                    {course.lessons?.length || 0} درس
                  </span> */}
                </div>

                <div className="course-footer">
                  <div className="price-section">
                    {course.sale > 0 ? (
                      <>
                        <span className="original-price">{course.price} جنيه</span>
                        <span className="sale-price">
                          {course.price - (course.price * course.sale / 100)} جنيه
                        </span>
                      </>
                    ) : (
                      <span className="current-price">{course.price} جنيه</span>
                    )}
                  </div>
                  
                  <button onClick={() => navigate(`/course/${course._id}`)}
                    className="view-btn"
                    
                  >
                    {course ? "عرض التفاصيل" : "غير متاح"}
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results-container">
            <i className="fa-solid fa-magnifying-glass"></i>
            <p>لا توجد نتائج </p>
          </div>
        )}
      </div>

      {/* 🔹 تحميل إضافي */}
      {loading && (
        <p className="loading">
          <i className="fa-solid fa-spinner fa-spin"></i> جاري تحميل المزيد...
        </p>
      )}

      {/* 🔹 المراقب */}
      <div ref={loaderRef} style={{ height: "100px", marginTop: "30px" }}></div>
    </div>
  );
}
