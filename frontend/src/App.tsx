import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import { getStoredUser } from './lib/api'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import LearningPath from './pages/LearningPath'
import Login from './pages/Login'
import Progress from './pages/Progress'
import QuizPlay from './pages/QuizPlay'
import QuizResults from './pages/QuizResults'
import QuizSetup from './pages/QuizSetup'
import Register from './pages/Register'
import TopicExplain from './pages/TopicExplain'

function Home() {
  return getStoredUser() ? <Navigate to="/dashboard" replace /> : <Landing />
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="quiz"
          element={
            <RequireAuth>
              <QuizSetup />
            </RequireAuth>
          }
        />
        <Route
          path="quiz/play"
          element={
            <RequireAuth>
              <QuizPlay />
            </RequireAuth>
          }
        />
        <Route
          path="quiz/results"
          element={
            <RequireAuth>
              <QuizResults />
            </RequireAuth>
          }
        />
        <Route
          path="topics"
          element={
            <RequireAuth>
              <TopicExplain />
            </RequireAuth>
          }
        />
        <Route
          path="learning-path"
          element={
            <RequireAuth>
              <LearningPath />
            </RequireAuth>
          }
        />
        <Route
          path="progress"
          element={
            <RequireAuth>
              <Progress />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
