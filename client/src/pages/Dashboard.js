import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardCourses from "../Compositions/dashboardCourses";
import NotFound from "../Compositions/404";
import DashboardLessons from "../Compositions/dadhboardLessons";
import DashboardStudentsCodes from "../Compositions/dashboardCoursesDetails";
import QuizManagement from "../Compositions/dadhboardQuizs";

export default function Dashboard() {
  const [userInfo, setUserInfo] = useState(null); 
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get("http://localhost:5001/auth/me", {
          withCredentials: true,
        });
        setUserInfo(res.data);
      } catch (err) {
        console.error("❌ Error fetching user info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <p style={{ textAlign: "center" }}> Loading dashboard...</p>;

if (userInfo?.user?.role !== "teacher"){
  
    return <Navigate to="/404" replace />;
  }

  return (
    <div>
      <main>
        <Routes>
          <Route path="/course" element={<DashboardCourses />} />
          <Route path="/lesson" element={<DashboardLessons/>} />
          <Route path="/quiz" element={<QuizManagement/>} />
          <Route path="/course/:courseId" element={<DashboardStudentsCodes/>} />
          <Route path="*" element={<NotFound />}/>
        </Routes>
      </main>
    </div>
  );
}
