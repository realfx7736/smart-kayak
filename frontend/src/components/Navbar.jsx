import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Anchor, User, Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { useState } from 'react'

const navLinks = [
    { title: 'Home', path: '/' },
    { title: 'Book Now', path: '/booking' },
    { title: 'Live Tracking', path: '/tracking' },
    { title: 'Gallery', path: '/gallery' },
]

const S = {
    nav: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 50,
        background: 'rgba(11, 14, 27, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem 1.5rem',
    },
    inner: {
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        textDecoration: 'none',
    },
    logoIcon: {
        width: '2.5rem',
        height: '2.5rem',
        background: '#3d9e9e',
        borderRadius: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px -8px rgba(61,158,158,0.4)',
    },
    logoText: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        fontFamily: 'Outfit, sans-serif',
    },
    desktopLinks: {
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
    },
    link: (active) => ({
        fontSize: '0.9rem',
        fontWeight: 500,
        color: active ? '#3d9e9e' : '#a7abbd',
        textDecoration: 'none',
        transition: 'color 0.2s',
        fontFamily: 'Outfit, sans-serif',
    }),
}

const Navbar = () => {
    const { user, profile, signOut } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const handleSignOut = async () => {
        await signOut()
        navigate('/')
        setIsOpen(false)
    }

    return (
        <nav style={S.nav}>
            <div style={S.inner}>
                {/* Logo */}
                <Link to="/" style={S.logo}>
                    <motion.div whileHover={{ rotate: 15 }} style={S.logoIcon}>
                        <Anchor color="white" size={20} />
                    </motion.div>
                    <span style={S.logoText}>Smart Kuttanad</span>
                </Link>

                {/* Desktop Links */}
                <div style={{ ...S.desktopLinks, display: 'none' }} className="md:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            style={S.link(location.pathname === link.path)}
                            onMouseEnter={e => e.target.style.color = '#3d9e9e'}
                            onMouseLeave={e => e.target.style.color = location.pathname === link.path ? '#3d9e9e' : '#a7abbd'}
                        >
                            {link.title}
                        </Link>
                    ))}
                </div>

                {/* Desktop Links (shown via JS for desktop) */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            style={S.link(location.pathname === link.path)}
                        >
                            {link.title}
                        </Link>
                    ))}
                    {profile?.role === 'admin' && (
                        <Link to="/admin" style={{ ...S.link(location.pathname === '/admin'), color: '#f39c12' }}>
                            Admin Hub
                        </Link>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '2rem' }}>
                        {user ? (
                            <>
                                {profile?.role === 'admin' && (
                                    <Link to="/admin" title="Admin Dashboard" style={{ color: '#a7abbd' }}>
                                        <LayoutDashboard size={20} />
                                    </Link>
                                )}
                                <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: '#151b34', border: '1px solid rgba(61,158,158,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={14} color="#3d9e9e" />
                                </div>
                                <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#656c8a', display: 'flex', alignItems: 'center' }}>
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="btn-primary" style={{ padding: '0.5rem 1.75rem', fontSize: '0.875rem' }}>
                                Login
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden"
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            background: 'rgba(11, 14, 27, 0.98)',
                            padding: '2rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                style={{ fontSize: '1.125rem', fontWeight: 500, color: '#e9ebef', textDecoration: 'none' }}
                            >
                                {link.title}
                            </Link>
                        ))}
                        {!user ? (
                            <Link to="/login" onClick={() => setIsOpen(false)} className="btn-primary" style={{ textAlign: 'center' }}>
                                Login
                            </Link>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
                                {profile?.role === 'admin' && (
                                    <Link to="/admin" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a7abbd' }}>
                                        <LayoutDashboard size={18} /> Admin Dashboard
                                    </Link>
                                )}
                                <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '1rem' }}>
                                    <LogOut size={18} /> Log Out
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}

export default Navbar
