import React, { useState, useEffect } from "react";
import {   Link ,useNavigate } from "react-router-dom";
import "../style/dashboardCourses.css";
import axios from "axios";
import { showConfirm } from "../utils/popup";

export default function DashboardCourses() {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards"); 
const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentCourse, setCurrentCourse] = useState({
    name: "",
    price: 0,
    description: "",
    status: "نشط",
    file: null,
    _id: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:5001/course/dashboard", {
          withCredentials: true,
        });
        setCourses(res.data.courses || []);
        setStats(res.data.stats);
        setMonthlyData(res.data.monthlyData);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        alert("حدث خطأ أثناء تحميل البيانات.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCourseId = (course) => course._id || course.id;

  const handleDeleteCourse = async (course) => {
    const id = getCourseId(course);
    if (!id) return;
    const ok = await showConfirm("هل أنت متأكد من حذف هذا الكورس؟");
    if (!ok) return;

    try {
      await axios.delete(`http://localhost:5001/course/${id}`, {
        withCredentials: true,
      });
      setCourses(courses.filter((c) => getCourseId(c) !== id));
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("حدث خطأ أثناء حذف الكورس");
    }
  };

  const handleAddCourse = () => {
    setModalMode("add");
    setCurrentCourse({
      name: "",
      price: 0,
      description: "",
      status: "نشط",
      file: null,
      _id: null,
    });
    setShowModal(true);
  };

  const handleEditCourse = (course) => {
    setModalMode("edit");
    setCurrentCourse({
      ...course,
      file: null,
      status: course.status || "نشط",
      _id: getCourseId(course),
    });
    setShowModal(true);
  };

  const handleShowDetails = (course) => {
    setSelectedCourse(course);
    setShowDetailsModal(true);
  };

  const handleSaveCourse = async () => {
    if (!currentCourse.name.trim()) {
      alert("يرجى إدخال اسم الكورس!");
      return;
    }

    const formData = new FormData();
    formData.append("name", currentCourse.name);
    formData.append("price", currentCourse.price);
    formData.append("description", currentCourse.description);
    formData.append("active", currentCourse.status === "نشط");

    if (currentCourse.file) {
      formData.append("image", currentCourse.file);
    }

    try {
      if (modalMode === "add") {
        const res = await axios.post("http://localhost:5001/course", formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
        setCourses([...courses, res.data.course]);
      } else {
        const res = await axios.put(
          `http://localhost:5001/course/${currentCourse._id}`,
          formData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        setCourses(
          courses.map((c) =>
            getCourseId(c) === currentCourse._id ? res.data.course : c
          )
        );
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ الكورس");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          fontWeight: "600",
        }}
      >
        جاري تحميل البيانات...
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          padding: "30px",
          background: "#f4f5fa",
          minHeight: "100vh",
          fontFamily: "Cairo, sans-serif",
        }}
      >
 

        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "25px",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(102,126,234,0.3)",
              }}
            >
              <h4>إجمالي الطلاب</h4>
              <h3 style={{ fontSize: "26px", fontWeight: "700" }}>
                {stats.totalStudents}
              </h3>
            </div>
            <div
              style={{
                background:
                  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                padding: "25px",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(245,87,108,0.3)",
              }}
            >
              <h4>عدد الكورسات</h4>
              <h3 style={{ fontSize: "26px", fontWeight: "700" }}>
                {stats.totalCourses}
              </h3>
            </div>
            <div
              style={{
                background:
                  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
                padding: "25px",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(79,172,254,0.3)",
              }}
            >
              <h4>إجمالي الإيرادات</h4>
              <h3 style={{ fontSize: "26px", fontWeight: "700" }}>
                {stats.totalRevenue || 0} ج.م
              </h3>
            </div>
          </div>
        )}

        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "20px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            <h3 style={{ fontWeight: "700", fontSize: "20px" }}>كورساتي 📚</h3>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  background: "#f3f4f6",
                  borderRadius: "12px",
                  padding: "4px",
                  gap: "4px",
                }}
              >
                <button
                  onClick={() => setViewMode("cards")}
                  style={{
                    background: viewMode === "cards" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                    color: viewMode === "cards" ? "white" : "#6b7280",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <i className="fas fa-th-large"></i> بطاقات
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  style={{
                    background: viewMode === "table" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                    color: viewMode === "table" ? "white" : "#6b7280",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <i className="fas fa-table"></i> جدول
                </button>
              </div>
              <button
                onClick={handleAddCourse}
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <i className="fas fa-plus"></i> إضافة كورس
              </button>
            </div>
          </div>

          {viewMode === "cards" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
              }}
            >
              {courses.map((course) => (
                <div key={getCourseId(course)} className="modern-card">
                  <div className="modern-card-image">
                    <img
                      src={course.image ? `http://localhost:5001${course.image}` : "/placeholder.png"}
                      alt={course.name}
                      loading="lazy"
                    />
                    <span
                      className={`status-badge ${
                        course.status === "نشط" ? "active" : "inactive"
                      }`}
                    >
                      {course.status === "نشط" ? "🟢 نشط" : "🔴 غير نشط"}
                    </span>
                  </div>
                  <div className="modern-card-body">
                    <h3 className="course-title">{course.name}</h3>
                    <div className="course-details">
                      <p><i className="fas fa-money-bill-wave"></i> {course.price} ج.م</p>
                    </div>
                    <div className="modern-card-actions">
                      <button className="details" onClick={() => navigate(`/dashboard/course/${course._id || course.id}`)}>
                        <i className="fas fa-info-circle"></i> تفاصيل
                      </button>
                      <button className="edit" onClick={() => handleEditCourse(course)}>
                        <i className="fas fa-edit"></i> تعديل
                      </button>
                      <button className="delete" onClick={() => handleDeleteCourse(course)}>
                        <i className="fas fa-trash"></i> حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="courses-table">
                <thead>
                  <tr>
                    <th><i className="fas fa-image"></i> الصورة</th>
                    <th><i className="fas fa-book"></i> اسم الكورس</th>
                    <th><i className="fas fa-money-bill-wave"></i> السعر</th>
                    <th><i className="fas fa-toggle-on"></i> الحالة</th>
                    <th><i className="fas fa-cogs"></i> الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={getCourseId(course)}>
                      <td data-label="الصورة">
                        <img
                          src={course.image ? `http://localhost:5001${course.image}` : "/placeholder.png"}
                          alt={course.name}
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "10px",
                            objectFit: "cover",
                          }}
                        />
                      </td>
                      <td data-label="اسم الكورس" style={{ fontWeight: "600" }}>{course.name}</td>
                      <td data-label="السعر">
                        <span style={{ color: "#667eea", fontWeight: "600" }}>
                          <i className="fas fa-money-bill-wave"></i> {course.price} ج.م
                        </span>
                      </td>
                      <td data-label="الحالة">
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "white",
                            background: course.status === "نشط" ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {course.status === "نشط" ? "🟢 نشط" : "🔴 غير نشط"}
                        </span>
                      </td>
                      <td data-label="الإجراءات">
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                         
                          <button
                            onClick={() => handleEditCourse(course)}
                            style={{
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <i className="fas fa-edit"></i> تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <i className="fas fa-trash"></i> حذف
                          </button>
                           <button
                            onClick={() => handleShowDetails(course)}
                            style={{
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <i className="fas fa-info-circle"></i> تفاصيل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              <i className={`fas ${modalMode === "add" ? "fa-plus-circle" : "fa-edit"}`}></i>{" "}
              {modalMode === "add" ? "إضافة كورس جديد" : "تعديل الكورس"}
            </h3>
            <input
              type="text"
              className="form-input"
              placeholder="اسم الكورس"
              value={currentCourse.name}
              onChange={(e) => setCurrentCourse({ ...currentCourse, name: e.target.value })}
            />
            <input
              type="number"
              className="form-input"
              placeholder="السعر"
              value={currentCourse.price}
              onChange={(e) => setCurrentCourse({ ...currentCourse, price: parseInt(e.target.value) })}
            />
            <input
              type="text"
              className="form-input"
              placeholder="الوصف"
              value={currentCourse.description}
              onChange={(e) => setCurrentCourse({ ...currentCourse, description: e.target.value })}
            />
            <input
              type="file"
              className="form-input"
              onChange={(e) => setCurrentCourse({ ...currentCourse, file: e.target.files[0] })}
            />
            <select
              className="form-input"
              value={currentCourse.status}
              onChange={(e) => setCurrentCourse({ ...currentCourse, status: e.target.value })}
            >
              <option value="نشط">نشط</option>
              <option value="متوقف">متوقف</option>
            </select>
            <div className="modal-actions">
              <button className="save-btn" onClick={handleSaveCourse}>
                <i className="fas fa-save"></i> حفظ
              </button>
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
}


