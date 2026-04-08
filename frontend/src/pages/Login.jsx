import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { auth, db } from '../lib/firebase'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Phone, Compass, ArrowLeft, Loader2, Lock, User, AtSign, Shield } from 'lucide-react'

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false)
    const [method, setMethod] = useState(null)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: ''
    })
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1)
    const [error, setError] = useState(null)
    const [confirmationResult, setConfirmationResult] = useState(null)

    const { user, profile } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (user && profile) {
            if (profile?.role === 'admin') navigate('/admin')
            else navigate('/')
        }
    }, [user, profile, navigate])

    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            })
        }
    }

    const syncUserData = async (uid, email, displayName) => {
        const docRef = doc(db, 'users', uid)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) {
            await setDoc(docRef, {
                uid,
                email,
                name: displayName || email?.split('@')[0],
                role: email === 'admin@smartkuttanad.com' ? 'admin' : 'user',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            })
        } else {
            await setDoc(docRef, { lastLogin: serverTimestamp() }, { merge: true })
        }
    }

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!auth) {
                // FALLBACK: Demo Bypass for Master Admin (Local Dev only)
                if (formData.email === 'admin@smartkuttanad.com' && formData.password === 'admin123') {
                    console.warn('⚠️ Firebase not connected. Entering Demo Admin Mode.');
                    sessionStorage.setItem('demoAdmin', 'true');
                    navigate('/admin');
                    return;
                }
                throw new Error("Firebase not initialized. Please provide your API Key.");
            }

            if (method === 'password') {
                if (isSignUp) {
                    const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
                    await syncUserData(res.user.uid, formData.email, formData.fullName)
                } else {
                    await signInWithEmailAndPassword(auth, formData.email, formData.password)
                }
            } else if (method === 'phone') {
                setupRecaptcha()
                const phone = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`
                const confirm = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier)
                setConfirmationResult(confirm)
                setStep(2)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOTP = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await confirmationResult.confirm(otp)
            await syncUserData(res.user.uid, res.user.email || 'phone-user@noemail.com', formData.fullName)
        } catch (err) {
            setError('Invalid code')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider()
        try {
            const res = await signInWithPopup(auth, provider)
            await syncUserData(res.user.uid, res.user.email, res.user.displayName)
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
            <div id="recaptcha-container"></div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md glass p-10 rounded-[2.5rem]">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div key="1">
                            <h1 className="text-3xl font-black mb-8">Kayak <span className="text-teal-400">Firebase</span></h1>
                            {!method ? (
                                <div className="space-y-4">
                                    <button onClick={handleGoogleLogin} className="w-full py-4 glass border hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-bold">
                                        <Compass className="w-5 h-5 text-teal-400" /> Google Login
                                    </button>
                                    <button onClick={() => {
                                        setMethod('password');
                                        setFormData({ ...formData, email: 'admin@smartkuttanad.com', password: 'admin123' });
                                        setTimeout(() => document.getElementById('login-form').requestSubmit(), 100);
                                    }} className="w-full p-4 glass border border-teal-500/30 bg-teal-500/10 text-teal-400 text-sm font-black flex items-center justify-center gap-4 hover:bg-teal-500/20 transition-all">
                                        <Shield className="w-5 h-5" /> Magic Admin Access (Auto)
                                    </button>
                                </div>
                            ) : (
                                <form id="login-form" onSubmit={handleAuth} className="space-y-4">
                                    {isSignUp && method === 'password' && (
                                        <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                                            <input type="text" placeholder="Full Name" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full bg-navy-950/50 border border-white/10 pl-12 pr-4 py-4 rounded-2xl outline-none" required /></div>
                                    )}
                                    {method !== 'phone' && (
                                        <div className="relative"><AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                                            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-navy-950/50 border border-white/10 pl-12 pr-4 py-4 rounded-2xl outline-none" required /></div>
                                    )}
                                    {method === 'phone' && (
                                        <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                                            <input type="tel" placeholder="Phone (e.g. 9876543210)" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-navy-950/50 border border-white/10 pl-12 pr-4 py-4 rounded-2xl outline-none" required /></div>
                                    )}
                                    {method === 'password' && (
                                        <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                                            <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-navy-950/50 border border-white/10 pl-12 pr-4 py-4 rounded-2xl outline-none" required /></div>
                                    )}
                                    <button disabled={loading} type="submit" className="btn-primary w-full py-4 text-lg">
                                        {loading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : (isSignUp ? 'Join Now' : 'Enter Vessel')}
                                    </button>
                                    <button type="button" onClick={() => setMethod(null)} className="text-navy-400 text-xs flex items-center gap-2 mx-auto mt-4"><ArrowLeft className="w-4 h-4" /> Back</button>
                                </form>
                            )}
                            <div className="mt-8 text-center text-sm">
                                <button onClick={() => setIsSignUp(!isSignUp)} className="text-teal-400 font-bold">{isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}</button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="2" className="text-center">
                            <h2 className="text-2xl font-bold mb-6">Enter code sent to {formData.phone}</h2>
                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <input type="text" placeholder="6-digit code" maxLength="6" value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-navy-950/50 border border-white/10 p-4 text-center text-2xl tracking-[0.5em] rounded-2xl outline-none" required />
                                <button disabled={loading} type="submit" className="btn-primary w-full py-4">
                                    {loading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : 'Confirm Code'}
                                </button>
                                <button type="button" onClick={() => setStep(1)} className="text-navy-400 text-xs mt-4">Wrong number?</button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
                {error && <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
            </motion.div>
        </div>
    )
}

export default Login
