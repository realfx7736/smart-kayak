import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Booking from './pages/Booking'
import Tracking from './pages/Tracking'
import Gallery from './pages/Gallery'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Driver from './pages/Driver'

// Error Boundary
class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }
    componentDidCatch(error, info) {
        console.error('App Error:', error, info)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', background: '#0b0e1b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ textAlign: 'center', maxWidth: '600px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚓</div>
                        <h1 style={{ color: '#3d9e9e', fontFamily: 'Playfair Display, serif', fontSize: '2rem', marginBottom: '1rem' }}>Something Went Adrift</h1>
                        <p style={{ color: '#a7abbd', marginBottom: '2rem', lineHeight: 1.6 }}>
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{ background: '#3d9e9e', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '9999px', cursor: 'pointer', fontWeight: '600' }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0e1b' }}>
                <div style={{ textAlign: 'center', color: '#3d9e9e' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚓</div>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Loading...</p>
                </div>
            </div>
        )
    }
    if (!user) return <Navigate to="/login" replace />
    if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" replace />
    return children
}

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <AuthProvider>
                    <div className="min-h-screen" style={{ background: 'oklch(11% 0.04 255)', color: 'oklch(96% 0.01 255)', fontFamily: 'Outfit, sans-serif', overflowX: 'hidden', paddingTop: '5rem' }}>
                        <Navbar />
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/gallery" element={<Gallery />} />
                            <Route path="/booking" element={
                                <ProtectedRoute>
                                    <Booking />
                                </ProtectedRoute>
                            } />
                            <Route path="/tracking" element={
                                <ProtectedRoute>
                                    <Tracking />
                                </ProtectedRoute>
                            } />
                            <Route path="/driver" element={
                                <ProtectedRoute adminOnly>
                                    <Driver />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin" element={
                                <ProtectedRoute adminOnly>
                                    <Admin />
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </div>
                </AuthProvider>
            </Router>
        </ErrorBoundary>
    )
}

export default App
