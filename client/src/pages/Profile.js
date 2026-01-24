import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    fatherPhone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:5001/auth/profile', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
        const user = result.data.user;
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          fatherPhone: user.fatherPhone || '',
          password: '',
          confirmPassword: ''
        });
      } else {
        setError(result.msg || 'حدث خطأ في تحميل البيانات');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        fatherPhone: formData.fatherPhone
      };

      // إذا تم إدخال كلمة مرور جديدة
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch('http://localhost:5001/api/dashboard/update', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (data.success) {
        // تحديث البيانات المحلية
        setDashboardData(prev => ({
          ...prev,
          user: {
            ...prev.user,
            ...updateData
          }
        }));
        setEditMode(false);
        setError('');
        alert('تم تحديث البيانات بنجاح');
        
        // إعادة تعيين حقول كلمة المرور
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      } else {
        setError(data.msg || 'حدث خطأ أثناء تحديث البيانات');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/dashboard/logout', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        // مسح الكوكيز محلياً
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        navigate('/login');
      }
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('http://localhost:5001/api/dashboard/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // تحديث الصورة في البيانات المحلية
        setDashboardData(prev => ({
          ...prev,
          user: {
            ...prev.user,
            image: result.imageUrl
          }
        }));
        alert('تم تحديث الصورة الشخصية بنجاح');
      } else {
        setError(result.msg || 'حدث خطأ أثناء تحميل الصورة');
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('حدث خطأ في تحميل الصورة');
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="profile-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>{error}</h3>
        <button onClick={fetchDashboardData} className="profile-retry-btn">
          <i className="fas fa-redo"></i>
          المحاولة مرة أخرى
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="profile-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>لا توجد بيانات لعرضها</h3>
        <button onClick={fetchDashboardData} className="profile-retry-btn">
          <i className="fas fa-redo"></i>
          إعادة التحميل
        </button>
      </div>
    );
  }

  const { user, statistics, myCourses = [], quizResults = [], popularCourses = [] } = dashboardData;

  const isStudent = user.role === 'student';
  const isTeacher = user.role === 'teacher';

  return (
    <div className="profile-page">
      {/* الهيدر */}
      <header className="profile-header">
        <div className="profile-hero">
          <div className="profile-avatar">
            <div className="profile-avatar-circle">
              {user.image ? (
                <img src={`http://localhost:5001${user.image}`} alt={user.name} />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
            {!editMode && (
              <button 
                className="profile-edit-avatar-btn"
                onClick={() => document.getElementById('avatarInput')?.click()}
              >
                <i className="fas fa-camera"></i>
              </button>
            )}
            <input 
              type="file" 
              id="avatarInput" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleUploadAvatar}
            />
          </div>
          
          <div className="profile-info">
            <h1 className="profile-name">{user.name}</h1>
            <div className="profile-badges">
              <span className="profile-role-badge">
                <i className="fas fa-user-tag"></i>
                {user.roleText}
              </span>
              <span className="profile-id-badge">
                <i className="fas fa-id-card"></i>
                ID: {user.id || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          {isStudent ? (
            <>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-book"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.totalCourses || 0}</h3>
                  <p>الكورسات</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.passedQuizzes || 0}</h3>
                  <p>اختبارات ناجحة</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.averageScore || 0}</h3>
                  <p>المتوسط</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-percentage"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.successRate || 0}%</h3>
                  <p>معدل النجاح</p>
                </div>
              </div>
            </>
          ) : isTeacher ? (
            <>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-book"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.totalCourses || 0}</h3>
                  <p>الكورسات</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.totalStudents || 0}</h3>
                  <p>الطلاب</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.totalRevenue || 0} ج.م</h3>
                  <p>الإيرادات</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>{statistics?.activeCourses || 0}</h3>
                  <p>الكورسات النشطة</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-book"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>0</h3>
                  <p>الكورسات</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-medal"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>0</h3>
                  <p>الإنجازات</p>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="profile-stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="profile-stat-info">
                  <h3>0</h3>
                  <p>ساعات التعلم</p>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <div className="profile-content">
        {/* التنقل بين التبويبات */}
        <div className="profile-tabs">
          <button 
            className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <i className="fas fa-user-circle"></i>
            المعلومات الشخصية
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            <i className="fas fa-book-open"></i>
            {isTeacher ? 'كورساتي' : 'الكورسات'}
          </button>
          {isStudent && (
            <button 
              className={`profile-tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              <i className="fas fa-clipboard-check"></i>
              نتائج الاختبارات
            </button>
          )}
          <button 
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <i className="fas fa-shield-alt"></i>
            الأمان
          </button>
        </div>

        {/* محتوى التبويب النشط */}
        <div className="profile-tab-content">
          {activeTab === 'info' && (
            <div className="profile-info-tab">
              <div className="profile-tab-header">
                <h2>
                  <i className="fas fa-user"></i>
                  المعلومات الشخصية
                </h2>
                {/* {!editMode ? (
                  <button 
                    className="profile-edit-btn"
                    onClick={() => setEditMode(true)}
                  >
                    <i className="fas fa-edit"></i>
                    تعديل البيانات
                  </button>
                ) : (
                  <div className="profile-edit-actions">
                    <button 
                      className="profile-save-btn"
                      onClick={handleSubmit}
                    >
                      <i className="fas fa-save"></i>
                      حفظ التغييرات
                    </button>
                    <button 
                      className="profile-cancel-btn"
                      onClick={() => {
                        setEditMode(false);
                        setFormData({
                          name: user.name || '',
                          email: user.email || '',
                          phone: user.phone || '',
                          fatherPhone: user.fatherPhone || '',
                          password: '',
                          confirmPassword: ''
                        });
                      }}
                    >
                      <i className="fas fa-times"></i>
                      إلغاء
                    </button>
                  </div>
                )} */}
              </div>

              {error && (
                <div className="profile-form-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <form className="profile-form">
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label>
                      <i className="fas fa-user"></i>
                      الاسم الكامل
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="أدخل الاسم الكامل"
                        required
                      />
                    ) : (
                      <div className="profile-read-only-value">{user.name}</div>
                    )}
                  </div>

                  <div className="profile-form-group">
                    <label>
                      <i className="fas fa-envelope"></i>
                      البريد الإلكتروني
                    </label>
                    <div className="profile-read-only-value">
                      {user.email}
                      <span className="profile-verified-badge">
                        <i className="fas fa-check-circle"></i>
                        مفعل
                      </span>
                    </div>
                  </div>
                </div>

                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label>
                      <i className="fas fa-phone"></i>
                      رقم الهاتف
                    </label>
                    {editMode ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="رقم الهاتف"
                      />
                    ) : (
                      <div className="profile-read-only-value">{user.phone || 'غير متوفر'}</div>
                    )}
                  </div>

                  <div className="profile-form-group">
                    <label>
                      <i className="fas fa-user-friends"></i>
                      رقم هاتف ولي الأمر
                    </label>
                    {editMode ? (
                      <input
                        type="tel"
                        name="fatherPhone"
                        value={formData.fatherPhone}
                        onChange={handleChange}
                        placeholder="رقم هاتف ولي الأمر"
                      />
                    ) : (
                      <div className="profile-read-only-value">{user.fatherPhone || 'غير متوفر'}</div>
                    )}
                  </div>
                </div>

                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label>
                      <i className="fas fa-calendar"></i>
                      تاريخ التسجيل
                    </label>
                    <div className="profile-read-only-value">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : 'غير معروف'}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="profile-courses-tab">
              <div className="profile-tab-header">
                <h2>
                  <i className="fas fa-book-open"></i>
                  {isTeacher ? 'كورساتي' : 'الكورسات الخاصة بي'}
                </h2>
                <button 
                  className="profile-explore-btn"
                  onClick={() => navigate('/courses')}
                >
                  <i className="fas fa-compass"></i>
                  {isTeacher ? 'إنشاء كورس جديد' : 'استكشاف كورسات جديدة'}
                </button>
              </div>

              {myCourses.length === 0 ? (
                <div className="profile-courses-list">
                  <p className="profile-empty-message">
                    <i className="fas fa-book"></i>
                    {isTeacher ? 'لم تنشئ أي كورسات بعد' : 'لم تسجل في أي كورسات بعد'}
                  </p>
                  <button 
                    className="profile-browse-btn"
                    onClick={() => navigate('/courses')}
                  >
                    <i className="fas fa-search"></i>
                    {isTeacher ? 'إنشاء أول كورس' : 'تصفح الكورسات المتاحة'}
                  </button>
                </div>
              ) : (
                <div className="profile-courses-grid">
                  {myCourses.map((course) => (
                    <div key={course._id} className="profile-course-card">
                      <div className="profile-course-image">
                        <img 
                          src={course.image ? `http://localhost:5001${course.image}` : '/default-course.jpg'} 
                          alt={course.name}
                          onError={(e) => {
                            e.target.src = '/default-course.jpg';
                          }}
                        />
                      </div>
                      <div className="profile-course-content">
                        <h3>{course.name}</h3>
                        <p className="profile-course-description">
                          {course.description || 'لا يوجد وصف متاح...'}
                        </p>
                        
                        <div className="profile-course-meta">
                          <span className="profile-price-badge">
                            <i className="fas fa-tag"></i>
                            {course.price ? `${course.price} ج.م` : 'مجاني'}
                          </span>
                          
                          {isTeacher ? (
                            <>
                              <span className="profile-students-badge">
                                <i className="fas fa-users"></i>
                                {course.studentsCount} طالب
                              </span>
                              <span className={`profile-course-status-badge ${course.active ? 'active' : 'inactive'}`}>
                                {course.active ? 'نشط' : 'متوقف'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="profile-teacher-badge">
                                <i className="fas fa-chalkboard-teacher"></i>
                                {course.teacherName || 'غير معروف'}
                              </span>
                              <span className="profile-date-badge">
                                <i className="fas fa-calendar"></i>
                                {new Date(course.enrollmentDate).toLocaleDateString('ar-EG')}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <div className="profile-course-actions">
                          <button 
                            className="profile-view-btn"
                            onClick={() => navigate(`/course/${course._id}`)}
                          >
                            <i className="fas fa-eye"></i>
                            عرض التفاصيل
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'quizzes' && isStudent && (
            <div className="profile-quizzes-tab">
              <div className="profile-tab-header">
                <h2>
                  <i className="fas fa-clipboard-check"></i>
                  نتائج الاختبارات
                </h2>
              </div>

              {quizResults.length === 0 ? (
                <div className="profile-empty-quizzes">
                  <i className="fas fa-clipboard-list"></i>
                  <h3>لا توجد نتائج اختبارات</h3>
                  <p>لم تقم بأداء أي اختبارات بعد</p>
                </div>
              ) : (
                <div className="profile-quiz-results">
                  <div className="profile-results-summary">
                    <div className="profile-summary-item">
                      <i className="fas fa-chart-pie"></i>
                      <div>
                        <h3>{statistics?.successRate || 0}%</h3>
                        <p>معدل النجاح</p>
                      </div>
                    </div>
                    <div className="profile-summary-item">
                      <i className="fas fa-check-circle"></i>
                      <div>
                        <h3>{statistics?.passedQuizzes || 0}</h3>
                        <p>اختبارات ناجحة</p>
                      </div>
                    </div>
                    <div className="profile-summary-item">
                      <i className="fas fa-times-circle"></i>
                      <div>
                        <h3>{statistics?.failedQuizzes || 0}</h3>
                        <p>اختبارات راسبة</p>
                      </div>
                    </div>
                    <div className="profile-summary-item">
                      <i className="fas fa-star"></i>
                      <div>
                        <h3>{statistics?.averageScore || 0}</h3>
                        <p>المتوسط</p>
                      </div>
                    </div>
                  </div>

                  <div className="profile-results-table-wrapper">
                    <div className="profile-results-table">
                      <table>
                        <thead>
                          <tr>
                            <th>الاختبار</th>
                            <th>الدرجة</th>
                            <th>النسبة</th>
                            <th>الحالة</th>
                            <th>التاريخ</th>
                            <th>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizResults.map((result) => (
                            <tr key={result._id} className={result.passed ? 'profile-passed' : 'profile-failed'}>
                              <td>{result.lessonName}</td>
                              
                              <td>
                                <strong>{result.score}/{result.totalMarks}</strong>
                              </td>
                              <td>
                                <div className="profile-percentage-bar">
                                  <div 
                                    className="profile-percentage-fill"
                                    style={{ width: `${result.percentage}%` }}
                                  ></div>
                                  <span>{result.percentage}%</span>
                                </div>
                              </td>
                              <td>
                                <span className={`profile-status-badge ${result.passed ? 'success' : 'danger'}`}>
                                  {result.passed ? 'ناجح' : 'راسب'}
                                </span>
                              </td>
                              <td>
                                {new Date(result.submittedAt).toLocaleDateString('ar-EG')}
                              </td>
                              <td>
                                <button 
                                  className="profile-view-details-btn"
                                  onClick={() => navigate(`/quiz/results/${result._id}`)}
                                >
                                  <i className="fas fa-info-circle"></i>
                                  التفاصيل
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="profile-security-tab">
              <div className="profile-tab-header">
                <h2>
                  <i className="fas fa-shield-alt"></i>
                  إعدادات الأمان
                </h2>
              </div>

              <div className="profile-security-settings">
                <div className="profile-security-item">
                  <div className="profile-security-icon">
                    <i className="fas fa-key"></i>
                  </div>
                  <div className="profile-security-info">
                    <h3>تغيير كلمة المرور</h3>
                    <p>قم بتحديث كلمة المرور الخاصة بك بشكل دوري</p>
                  </div>
                  <button 
                    className="profile-change-password-btn"
                    onClick={() => setEditMode(true)}
                  >
                    <i className="fas fa-edit"></i>
                    تغيير
                  </button>
                </div>

                <div className="profile-security-item profile-danger">
                  <div className="profile-security-icon">
                    <i className="fas fa-sign-out-alt"></i>
                  </div>
                  <div className="profile-security-info">
                    <h3>تسجيل الخروج من جميع الأجهزة</h3>
                    <p>سجل الخروج من جميع الجلسات النشطة</p>
                  </div>
                  <button 
                    className="profile-logout-all-btn"
                    onClick={() => {
                      if (window.confirm('هل تريد تسجيل الخروج من جميع الأجهزة؟')) {
                        handleLogout();
                      }
                    }}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    تسجيل الخروج
                  </button>
                </div>
              </div>

              {/* <div className="profile-danger-zone">
                <h3>
                  <i className="fas fa-exclamation-triangle"></i>
                  منطقة الخطر
                </h3>
                <p>هذه الإجراءات لا يمكن التراجع عنها</p>
                <button 
                  className="profile-delete-account-btn"
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من حذف الحساب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
                      // تنفيذ حذف الحساب
                    }
                  }}
                >
                  <i className="fas fa-trash"></i>
                  حذف الحساب
                </button>
              </div> */}
            </div>
          )}
        </div>
      </div>

      {/* الأزرار السفلية */}
      <div className="profile-actions">
        <button 
          className="profile-logout-btn"
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i>
          تسجيل الخروج
        </button>
        
        <button 
          className="profile-home-btn"
          onClick={() => navigate('/')}
        >
          <i className="fas fa-home"></i>
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
};

export default Profile;