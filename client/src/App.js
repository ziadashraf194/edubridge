import { Routes, Route } from "react-router-dom";
import Header from "./Compositions/header";
import Footer from "./Compositions/footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./Compositions/404";
import AllCourses from "./pages/AllCourses";
import Dashboard from "./pages/Dashboard"; 
import CourseEnrollment from "./pages/subscription";
import CourseDetails from "./pages/CourseDetails";
import ContentPlayer from "./pages/ContentPlayer";
import StudentQuiz from "./pages/StudentQuiz";
import Contact from './pages/contact';
import MyCourses from "./pages/MyCourses";
import Profile from "./pages/Profile";


function App() {


  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<AllCourses />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/subscription/:courseId" element={<CourseEnrollment/>}/>
        <Route path="/course/:courseId" element={<CourseDetails />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/content/:lessonId" element={<ContentPlayer/>} />
        <Route path="/quiz/:quizId" element={<StudentQuiz />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/mycourses" element={<MyCourses />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      
      <Footer />
    </>
  );
}

export default App;
