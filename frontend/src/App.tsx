import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Landing from './pages/Landing'
import Login from './pages/Login'
import QuizPlay from './pages/QuizPlay'
import QuizResults from './pages/QuizResults'
import QuizSetup from './pages/QuizSetup'
import Register from './pages/Register'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
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
      </Route>
    </Routes>
  )
}

export default App
