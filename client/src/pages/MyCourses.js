import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/mycourses.css';

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const response = await fetch('http://localhost:5001/course/my', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setCourses(data);
      } else if (response.status === 404) {
        setCourses([]);
        if (data.msg) {
          setError(data.msg);
        }
      } else {
        setError(data.msg || 'حدث خطأ في تحميل الكورسات');
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('ar-EG', options);
    } catch (error) {
      return 'تاريخ غير صالح';
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'مجاني';
    return `${price} ج.م`;
  };

  const filteredCourses = courses.filter(course => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        course.name?.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower) ||
        (course.teacher?.name?.toLowerCase() || '').includes(searchLower)
      );
    }
    return true;
  });

  const handleCourseDetails = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    fetchMyCourses();
  };

  if (loading) {
    return (
      <div className="mycourses-page">
        <div className="mycourses-loading">
          <div className="mycourses-loading-spinner">
            <i className="fas fa-spinner"></i>
          </div>
          <p>جاري تحميل الكورسات...</p>
        </div>
      </div>
    );
  }

  if (error && error !== '') {
    return (
      <div className="mycourses-page">
        <div className="mycourses-error">
          <i className="fas fa-exclamation-triangle mycourses-error-icon"></i>
          <h3>{error}</h3>
          <div className="mycourses-error-actions">
            <button onClick={handleRetry} className="mycourses-retry-btn">
              <i className="fas fa-redo"></i>
              المحاولة مرة أخرى
            </button>
            <button onClick={() => navigate('/courses')} className="mycourses-browse-btn">
              <i className="fas fa-search"></i>
              تصفح الكورسات المتاحة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mycourses-page">
        <div className="mycourses-empty">
          <div className="mycourses-empty-icon">
            <i className="fas fa-book-open"></i>
          </div>
          <h3>لم تسجل في أي كورسات بعد</h3>
          <p>ابدأ رحلة التعلم الخاصة بك مع كورساتنا المميزة</p>
          <div className="mycourses-empty-actions">
            <button onClick={() => navigate('/courses')} className="mycourses-explore-btn">
              <i className="fas fa-compass"></i>
              استكشاف الكورسات
            </button>
            <button onClick={handleRetry} className="mycourses-refresh-btn">
              <i className="fas fa-sync-alt"></i>
              تحديث
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mycourses-page">
      {/* الهيدر */}
      <header className="mycourses-header">
        <div className="mycourses-header-content">
          <h1 className="mycourses-page-title">
            <i className="fas fa-graduation-cap"></i>
            كورساتي
          </h1>
          <p className="mycourses-page-subtitle">
            الكورسات التي سجلت فيها
          </p>
        </div>
        
        <div className="mycourses-header-actions">
          <button onClick={handleRetry} className="mycourses-refresh-header-btn">
            <i className="fas fa-sync-alt"></i>
            تحديث القائمة
          </button>
        </div>

        <div className="mycourses-stats-cards">
          <div className="mycourses-stat-card">
            <div className="mycourses-stat-icon">
              <i className="fas fa-book"></i>
            </div>
            <div className="mycourses-stat-info">
              <h3>{courses.length}</h3>
              <p>إجمالي الكورسات</p>
            </div>
          </div>
          {/* <div className="mycourses-stat-card price">
            <div className="mycourses-stat-icon">
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="mycourses-stat-info">
              <h3>{courses.reduce((sum, course) => sum + (course.price || 0), 0)} ج.م</h3>
              <p>إجمالي القيمة</p>
            </div>
          </div> */}
        </div>
      </header>

      {/* أدوات التحكم */}
      <div className="mycourses-controls">
        <div className="mycourses-search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="ابحث عن كورس..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* عرض عدد النتائج */}
      {filteredCourses.length > 0 && (
        <div className="mycourses-results-count">
          <i className="fas fa-filter"></i>
          عرض {filteredCourses.length} كورس
        </div>
      )}

      {/* قائمة الكورسات */}
      <div className="mycourses-grid">
        {filteredCourses.map((course) => {
          const imageUrl = course.image 
            ? `http://localhost:5001${course.image}`
            : '/default-course.jpg';
          
          return (
            <div key={course._id} className="mycourses-card">
              <div className="mycourses-card-header">
                <div className="mycourses-card-thumbnail">
                  <img 
                    src={imageUrl}
                    alt={course.name}
                    onError={(e) => {
                      e.target.src = '/default-course.jpg';
                    }}
                  />
                </div>
                <div className="mycourses-card-meta">
                  <span className="mycourses-price-badge">
                    <i className="fas fa-tag"></i>
                    {formatPrice(course.price)}
                  </span>
                </div>
              </div>

              <div className="mycourses-card-content">
                <h3 className="mycourses-card-title">{course.name}</h3>
                <p className="mycourses-card-description">
                  {course.description || 'لا يوجد وصف متاح...'}
                </p>
                
                {course.teacher && (
                  <div className="mycourses-card-instructor">
                    <i className="fas fa-user-tie"></i>
                    <div className="mycourses-instructor-info">
                      <span className="mycourses-instructor-name">{course.teacher.name}</span>
                    </div>
                  </div>
                )}

                <div className="mycourses-card-details">
                  <div className="mycourses-detail-item">
                    <i className="fas fa-calendar-alt"></i>
                    <span>تاريخ الإنشاء: {formatDate(course.createdAt)}</span>
                  </div>
                  <div className="mycourses-detail-item">
                    <i className="fas fa-sync-alt"></i>
                    <span>آخر تحديث: {formatDate(course.updatedAt)}</span>
                  </div>
                </div>

                <div className="mycourses-card-actions">
                  <button 
                    className="mycourses-details-btn"
                    onClick={() => handleCourseDetails(course._id)}
                  >
                    <i className="fas fa-info-circle"></i>
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* رسالة إذا لم توجد نتائج */}
      {courses.length > 0 && filteredCourses.length === 0 && (
        <div className="mycourses-no-results">
          <i className="fas fa-search"></i>
          <h3>لا توجد كورسات تطابق معايير البحث</h3>
          <button 
            onClick={() => setSearchTerm('')} 
            className="mycourses-reset-btn"
          >
            <i className="fas fa-times-circle"></i>
            مسح البحث
          </button>
        </div>
      )}
    </div>
  );
};

export default MyCourses;