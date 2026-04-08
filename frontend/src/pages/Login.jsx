import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { auth, db } from '../lib/firebase'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updatePassword,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
    Lock, AtSign, Loader2, ArrowLeft,
    AlertTriangle, ShieldCheck, Eye, EyeOff,
    KeyRound, Compass, User
} from 'lucide-react'

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

function getRateLimitState() {
    try {
        return JSON.parse(sessionStorage.getItem('__auth_rl') || '{"count":0,"lockedUntil":0}')
    } catch { return { count: 0, lockedUntil: 0 } }
}
function setRateLimitState(state) {
    sessionStorage.setItem('__auth_rl', JSON.stringify(state))
}
function recordFailedAttempt() {
    const s = getRateLimitState()
    const count = s.count + 1
    const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : s.lockedUntil
    setRateLimitState({ count, lockedUntil })
    return { count, lockedUntil }
}
function clearAttempts() { sessionStorage.removeItem('__auth_rl') }

// ─── Audit Logger ─────────────────────────────────────────────────────────────
async function writeAuditLog(action, detail, uid = 'anonymous') {
    if (!db) return
    try {
        await addDoc(collection(db, 'audit_logs'), {
            action,
            detail,
            uid,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent,
        })
    } catch (_) { /* silent */ }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Login = () => {
    const [mode, setMode] = useState('login')   // login | signup | reset | change_password
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [newPass, setNewPass] = useState('')
    const [name, setName] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [info, setInfo] = useState(null)
    const [cooldown, setCooldown] = useState(0)

    const { user, profile } = useAuth()
    const navigate = useNavigate()

    // Redirect if already authenticated
    useEffect(() => {
        if (user && profile) {
            navigate(profile.role === 'admin' ? '/admin' : '/')
        }
    }, [user, profile, navigate])

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return
        const id = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(id); return 0 }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(id)
    }, [cooldown])

    const isLocked = useCallback(() => {
        const s = getRateLimitState()
        if (s.lockedUntil && Date.now() < s.lockedUntil) {
            const secs = Math.ceil((s.lockedUntil - Date.now()) / 1000)
            setCooldown(secs)
            return true
        }
        return false
    }, [])

    // ── Sync user profile to Firestore ────────────────────────────────────────
    const syncProfile = async (uid, emailAddr, displayName) => {
        const ref = doc(db, 'users', uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
            const isAdmin = emailAddr === 'admin@smartkayak.com'
            const data = {
                uid,
                email: emailAddr,
                name: displayName || emailAddr.split('@')[0],
                role: isAdmin ? 'admin' : 'user',
                mustChangePassword: isAdmin,   // force reset on first admin login
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            }
            await setDoc(ref, data)
            return data
        } else {
            await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true })
            return snap.data()
        }
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault()
        setError(null)

        if (isLocked()) return

        // ── DEV ADMIN BYPASS (works without Firebase keys) ────────────────────
        if (email === 'admin@smartkayak.com' && password === 'admin123') {
            console.warn('🛡️ Dev Admin Mode activated — connect Firebase for production.')
            sessionStorage.setItem('demoAdmin', 'true')
            navigate('/admin')
            return
        }

        if (!auth) {
            setError('Authentication service is offline. Please configure Firebase in .env')
            return
        }

        setLoading(true)
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password)
            const profile = await syncProfile(cred.user.uid, email, cred.user.displayName)
            clearAttempts()
            await writeAuditLog('LOGIN_SUCCESS', `User ${email} signed in`, cred.user.uid)

            // Redirect admins to change password if flagged
            if (profile?.mustChangePassword) {
                setMode('change_password')
                setLoading(false)
                return
            }
        } catch (err) {
            const { count, lockedUntil } = recordFailedAttempt()
            await writeAuditLog('LOGIN_FAILED', `Failed attempt for ${email} (${count}/${MAX_ATTEMPTS})`)

            if (count >= MAX_ATTEMPTS) {
                const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
                setCooldown(secs)
                setError(`Too many failed attempts. Account locked for ${Math.ceil(secs / 60)} minutes.`)
            } else {
                const remaining = MAX_ATTEMPTS - count
                setError(`Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`)
            }
        } finally {
            setLoading(false)
        }
    }

    // ── Sign up ───────────────────────────────────────────────────────────────
    const handleSignUp = async (e) => {
        e.preventDefault()
        setError(null)
        if (!auth || !db) { setError('Authentication service offline.'); return }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

        setLoading(true)
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password)
            await syncProfile(cred.user.uid, email, name)
            await writeAuditLog('SIGNUP', `New user ${email} registered`, cred.user.uid)
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''))
        } finally {
            setLoading(false)
        }
    }

    // ── Password reset email ──────────────────────────────────────────────────
    const handleReset = async (e) => {
        e.preventDefault()
        setError(null)
        if (!auth) { setError('Auth service offline.'); return }
        setLoading(true)
        try {
            await sendPasswordResetEmail(auth, email)
            setInfo('Password reset email sent! Check your inbox.')
            await writeAuditLog('PASSWORD_RESET_REQUEST', `Reset requested for ${email}`)
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''))
        } finally {
            setLoading(false)
        }
    }

    // ── Mandatory first-login password change ─────────────────────────────────
    const handleChangePassword = async (e) => {
        e.preventDefault()
        setError(null)
        if (newPass.length < 8) { setError('New password must be at least 8 characters.'); return }
        setLoading(true)
        try {
            await updatePassword(auth.currentUser, newPass)
            await setDoc(doc(db, 'users', auth.currentUser.uid), { mustChangePassword: false }, { merge: true })
            await writeAuditLog('PASSWORD_CHANGED', 'Admin completed mandatory password change', auth.currentUser.uid)
            navigate('/admin')
        } catch (err) {
            setError('Session expired. Please log in again.')
            setMode('login')
        } finally {
            setLoading(false)
        }
    }

    // ── Google login ──────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        if (!auth) { setError('Auth service offline.'); return }
        setLoading(true)
        try {
            const res = await signInWithPopup(auth, new GoogleAuthProvider())
            await syncProfile(res.user.uid, res.user.email, res.user.displayName)
            await writeAuditLog('GOOGLE_LOGIN', `${res.user.email} signed in via Google`, res.user.uid)
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''))
        } finally {
            setLoading(false)
        }
    }

    // ── Input helper ──────────────────────────────────────────────────────────
    const Field = ({ type = 'text', value, onChange, placeholder, Icon, id }) => (
        <div className="relative">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500 pointer-events-none" />
            <input
                id={id}
                type={showPass && type === 'password' ? 'text' : type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete={type === 'password' ? 'current-password' : 'email'}
                required
                className="w-full bg-navy-950/60 border border-white/10 pl-12 pr-12 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/50 text-white placeholder-navy-500 transition-all"
            />
            {type === 'password' && (
                <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-500 hover:text-white transition-colors">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            )}
        </div>
    )

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/5 shadow-2xl"
            >
                <AnimatePresence mode="wait">

                    {/* ── LOGIN ── */}
                    {mode === 'login' && (
                        <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400"><ShieldCheck size={22} /></div>
                                <div>
                                    <h1 className="text-2xl font-black">Secure Sign In</h1>
                                    <p className="text-[11px] text-navy-500 font-bold uppercase tracking-widest">Smart Kuttanad Platform</p>
                                </div>
                            </div>

                            {cooldown > 0 && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
                                    <AlertTriangle size={18} />
                                    <p className="text-sm font-bold">Account locked — try again in <span className="tabular-nums">{Math.ceil(cooldown / 60)}m {cooldown % 60}s</span></p>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-4">
                                <Field id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" Icon={AtSign} />
                                <Field id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" Icon={Lock} />

                                <button
                                    type="submit"
                                    disabled={loading || cooldown > 0}
                                    className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Lock size={18} /> Sign In Securely</>}
                                </button>
                            </form>

                            <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-3 text-navy-600">
                                    <div className="flex-1 h-px bg-white/5" />
                                    <span className="text-xs font-bold uppercase tracking-widest">or</span>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>
                                <button onClick={handleGoogle} disabled={loading} className="w-full py-4 glass border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-3 font-bold text-sm disabled:opacity-40">
                                    <Compass className="w-5 h-5 text-teal-400" /> Continue with Google
                                </button>
                            </div>

                            {/* Admin Quick Access */}
                            <div className="mt-6 p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20">
                                <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ShieldCheck size={12} /> Admin Access (Dev Mode)
                                </p>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-xs text-navy-400 space-y-1">
                                        <p>📧 admin@smartkayak.com</p>
                                        <p>🔑 admin123</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            sessionStorage.setItem('demoAdmin', 'true')
                                            navigate('/admin')
                                        }}
                                        className="shrink-0 px-4 py-2 bg-teal-500 text-white rounded-xl text-xs font-black hover:bg-teal-400 transition-all"
                                    >
                                        Enter Admin →
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-between text-sm">
                                <button onClick={() => { setMode('reset'); setError(null); setInfo(null) }} className="text-navy-500 hover:text-teal-400 transition-colors font-bold">Forgot password?</button>
                                <button onClick={() => { setMode('signup'); setError(null) }} className="text-teal-400 font-bold hover:text-teal-300 transition-colors">Create account</button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── SIGN UP ── */}
                    {mode === 'signup' && (
                        <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h1 className="text-2xl font-black mb-8">Create Account</h1>
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <Field id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" Icon={User} />
                                <Field id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" Icon={AtSign} />
                                <Field id="signup-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ characters)" Icon={Lock} />
                                <button type="submit" disabled={loading} className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-40">
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Join Now'}
                                </button>
                            </form>
                            <button onClick={() => { setMode('login'); setError(null) }} className="mt-6 text-navy-500 hover:text-white text-sm flex items-center gap-2 mx-auto transition-colors">
                                <ArrowLeft size={16} /> Back to Sign In
                            </button>
                        </motion.div>
                    )}

                    {/* ── RESET PASSWORD ── */}
                    {mode === 'reset' && (
                        <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h1 className="text-2xl font-black mb-2">Reset Password</h1>
                            <p className="text-navy-400 text-sm mb-8">Enter your email to receive a reset link.</p>
                            <form onSubmit={handleReset} className="space-y-4">
                                <Field id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" Icon={AtSign} />
                                <button type="submit" disabled={loading || !!info} className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-40">
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Reset Link'}
                                </button>
                            </form>
                            {info && <p className="mt-4 text-teal-400 text-sm text-center font-bold">{info}</p>}
                            <button onClick={() => { setMode('login'); setError(null); setInfo(null) }} className="mt-6 text-navy-500 hover:text-white text-sm flex items-center gap-2 mx-auto transition-colors">
                                <ArrowLeft size={16} /> Back
                            </button>
                        </motion.div>
                    )}

                    {/* ── MANDATORY PASSWORD CHANGE ── */}
                    {mode === 'change_password' && (
                        <motion.div key="change_pass" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-400">
                                    <KeyRound size={28} />
                                </div>
                                <h1 className="text-2xl font-black">Set New Password</h1>
                                <p className="text-navy-400 text-sm mt-2">For security, you must set a new password before continuing.</p>
                            </div>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <Field id="new-pass" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New secure password (8+ chars)" Icon={Lock} />
                                <button type="submit" disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-40">
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><ShieldCheck size={18} /> Update & Enter Dashboard</>}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Error / Info banners ── */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}

export default Login
