import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import { RequireAdmin, RequireAuth } from './components/ProtectedRoute'

import Home from './pages/Home'
import SearchCars from './pages/SearchCars'
import CarDetails from './pages/CarDetails'
import BookingPage from './pages/BookingPage'
import Payment from './pages/Payment'
import BookingConfirmation from './pages/BookingConfirmation'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import MyBookings from './pages/MyBookings'
import Profile from './pages/Profile'
import TripPlanner from './pages/TripPlanner'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageCars from './pages/admin/ManageCars'
import ManageBookings from './pages/admin/ManageBookings'
import ManageUsers from './pages/admin/ManageUsers'
import CarTracking from './pages/admin/CarTracking'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<SearchCars />} />
          <Route path="/cars/:id" element={<CarDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/trip-planner" element={<TripPlanner />} />

          <Route element={<RequireAuth />}>
            <Route path="/book/:carId" element={<BookingPage />} />
            <Route path="/payment/:bookingId" element={<Payment />} />
            <Route path="/confirmation/:bookingId" element={<BookingConfirmation />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/tracking" element={<CarTracking />} />
            <Route path="/admin/cars" element={<ManageCars />} />
            <Route path="/admin/bookings" element={<ManageBookings />} />
            <Route path="/admin/users" element={<ManageUsers />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="shell flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>CarGo — Your Journey. Your Car.</p>
          <p>Self-Drive Car Rentals Across India · 24/7 Roadside Assistance</p>
        </div>
      </footer>
    </div>
  )
}
