import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, ShieldCheck, Timer, Anchor, Wind, Sun } from 'lucide-react'

const COLORS = {
    bg: '#0b0e1b',
    surface: 'rgba(17, 22, 42, 0.6)',
    border: 'rgba(255,255,255,0.07)',
    teal: '#3d9e9e',
    tealLight: 'rgba(61,158,158,0.12)',
    text: '#f4f5f7',
    muted: '#a7abbd',
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const packages = [
    { name: 'Sunrise Kayaking', price: '₹699', duration: '2 Hours', emoji: '🌅' },
    { name: 'Sunset Kayaking', price: '₹799', duration: '2 Hours', emoji: '🌇' },
    { name: 'Quick Ride', price: '₹399', duration: '45 Mins', emoji: '⚡' },
    { name: 'Village Tour', price: '₹1,299', duration: '4 Hours', emoji: '🏘️' },
    { name: 'AI Smart Kayak', price: '₹1,799', duration: '3 Hours', emoji: '🤖' },
    { name: 'Night Kayaking', price: '₹1,999', duration: '2 Hours', emoji: '🌙' },
]

const features = [
    {
        icon: <MapPin size={28} color={COLORS.teal} />,
        title: 'Live GPS Tracking',
        desc: 'Watch your kayak move live on the map for ultimate peace of mind.',
    },
    {
        icon: <ShieldCheck size={28} color={COLORS.teal} />,
        title: 'Trusted & Safe',
        desc: 'Expert-guided trips with all safety gear included in every package.',
    },
    {
        icon: <Timer size={28} color={COLORS.teal} />,
        title: 'Flexible Slots',
        desc: 'Choose sunrise, sunset, or star-lit night rides through the backwaters.',
    },
]

const Home = () => {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}
        >
            {/* Hero */}
            <motion.section
                variants={itemVariants}
                style={{
                    position: 'relative',
                    minHeight: '80vh',
                    borderRadius: '2.5rem',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #0f1a35 0%, #0b2b2b 100%)',
                    border: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '3rem 2rem',
                }}
            >
                {/* Glow Orbs */}
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'rgba(61,158,158,0.06)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'rgba(17,22,42,0.3)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px' }}>
                    <motion.div variants={itemVariants} style={{ marginBottom: '1.5rem' }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '0.4rem 1.2rem',
                            borderRadius: '9999px',
                            background: 'rgba(61,158,158,0.1)',
                            border: '1px solid rgba(61,158,158,0.3)',
                            color: '#3d9e9e',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                        }}>
                            🚣 Explore Kuttanad Backwaters
                        </span>
                    </motion.div>

                    <motion.h1
                        variants={itemVariants}
                        style={{
                            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
                            fontWeight: 900,
                            lineHeight: 1.1,
                            marginBottom: '1.5rem',
                            color: '#f4f5f7',
                            fontFamily: 'Playfair Display, serif',
                        }}
                    >
                        The Smartest Way to{' '}
                        <span style={{ color: COLORS.teal }}>Discover</span>{' '}
                        Kerala Backwaters
                    </motion.h1>

                    <motion.p
                        variants={itemVariants}
                        style={{
                            color: '#a7abbd',
                            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                            marginBottom: '3rem',
                            lineHeight: 1.8,
                            maxWidth: '640px',
                            margin: '0 auto 3rem',
                        }}
                    >
                        Premium kayaking in the heart of Kuttanad. Real-time GPS tracking, secure UPI payments, and breathtaking scenery — all in one platform.
                    </motion.p>

                    <motion.div
                        variants={itemVariants}
                        style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
                    >
                        <Link
                            to="/booking"
                            className="btn-primary"
                            style={{ padding: '0.9rem 2.5rem', fontSize: '1rem', gap: '0.5rem' }}
                        >
                            Book Your Ride <ArrowRight size={18} />
                        </Link>
                        <Link
                            to="/gallery"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.9rem 2.5rem',
                                borderRadius: '9999px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: '#f4f5f7',
                                fontWeight: 600,
                                fontSize: '1rem',
                                transition: 'all 0.3s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            View Gallery
                        </Link>
                    </motion.div>
                </div>
            </motion.section>

            {/* Features */}
            <section style={{ marginTop: '6rem' }}>
                <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, fontFamily: 'Playfair Display, serif', color: '#f4f5f7', marginBottom: '0.75rem' }}>
                        Why Choose <span style={{ color: COLORS.teal }}>Smart Kuttanad</span>?
                    </h2>
                    <p style={{ color: '#a7abbd', fontSize: '1.1rem' }}>Everything you need for the perfect backwater adventure.</p>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            variants={itemVariants}
                            whileHover={{ y: -8, boxShadow: '0 24px 48px -16px rgba(61,158,158,0.2)' }}
                            style={{
                                padding: '2.5rem',
                                borderRadius: '2rem',
                                background: COLORS.surface,
                                border: `1px solid ${COLORS.border}`,
                                backdropFilter: 'blur(12px)',
                                transition: 'all 0.4s',
                            }}
                        >
                            <div style={{
                                width: '4rem',
                                height: '4rem',
                                borderRadius: '1.25rem',
                                background: COLORS.tealLight,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                border: '1px solid rgba(61,158,158,0.15)',
                            }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f4f5f7', marginBottom: '0.75rem', fontFamily: 'Playfair Display, serif' }}>{f.title}</h3>
                            <p style={{ color: '#a7abbd', lineHeight: 1.7, fontSize: '0.95rem' }}>{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Packages Preview */}
            <section style={{ marginTop: '7rem' }}>
                <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.4rem 1.2rem', borderRadius: '9999px', background: COLORS.tealLight, border: '1px solid rgba(61,158,158,0.2)', color: COLORS.teal, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                        Our Packages
                    </span>
                    <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, fontFamily: 'Playfair Display, serif', color: '#f4f5f7' }}>
                        Choose Your <span style={{ color: COLORS.teal }}>Adventure</span>
                    </h2>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                    {packages.map((pkg, i) => (
                        <motion.div
                            key={i}
                            variants={itemVariants}
                            whileHover={{ y: -6, boxShadow: '0 20px 40px -16px rgba(61,158,158,0.25)' }}
                            style={{
                                padding: '2rem',
                                borderRadius: '1.75rem',
                                background: COLORS.surface,
                                border: `1px solid ${COLORS.border}`,
                                backdropFilter: 'blur(12px)',
                                transition: 'all 0.4s',
                                cursor: 'default',
                            }}
                        >
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{pkg.emoji}</div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f4f5f7', marginBottom: '0.5rem', fontFamily: 'Playfair Display, serif' }}>{pkg.name}</h3>
                            <p style={{ color: '#656c8a', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{pkg.duration}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: COLORS.teal }}>{pkg.price}</span>
                                <Link
                                    to="/booking"
                                    className="btn-primary"
                                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                                >
                                    Book
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA Banner */}
            <motion.section
                variants={itemVariants}
                style={{
                    marginTop: '7rem',
                    borderRadius: '3rem',
                    background: 'linear-gradient(135deg, rgba(17,22,42,0.9) 0%, rgba(13,42,42,0.8) 100%)',
                    padding: 'clamp(3rem, 6vw, 5rem)',
                    border: '1px solid rgba(61,158,158,0.12)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.04 }}>
                    <Sun size={300} color="#3d9e9e" />
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 900, color: '#f4f5f7', marginBottom: '1.25rem', fontFamily: 'Playfair Display, serif' }}>
                        Ready for an <span style={{ color: COLORS.teal }}>Adventure</span>?
                    </h2>
                    <p style={{ color: '#a7abbd', marginBottom: '2.5rem', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                        Join 5,000+ happy kayakers who have experienced the magic of Kerala's backwaters with us.
                    </p>
                    <Link to="/booking" className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.05rem' }}>
                        Start Booking Now
                    </Link>
                </div>
            </motion.section>
        </motion.div>
    )
}

export default Home
