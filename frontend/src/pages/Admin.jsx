import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../lib/firebase'
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    addDoc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore'
import {
    Users, Calendar, Ship, Star,
    Settings, CheckCircle, XCircle, Trash2,
    DollarSign, Loader2, Package, Image,
    TrendingUp, BarChart3, Shield, Menu,
    ArrowRight, Save, Plus, Edit3, ToggleLeft, ToggleRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const S = {
    card: "glass p-8 rounded-[2.5rem] border-white/5",
    btn: "p-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-bold",
    input: "w-full bg-navy-950 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-teal-500",
    th: "px-10 py-6 text-[10px] font-black uppercase tracking-widest text-navy-500 border-b border-white/5 text-left",
    td: "px-10 py-8 border-b border-white/5"
}

const Admin = () => {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        bookings: [],
        users: [],
        kayaks: [],
        reviews: [],
        packages: [],
        settings: {}
    })
    const [stats, setStats] = useState({ revenue: 0, activeBookings: 0, totalUsers: 0, avgRating: 0 })

    // Forms
    const [pkgForm, setPkgForm] = useState({ name: '', price: '', duration: '', description: '', emoji: '🚣', active: true })
    const [editingPkg, setEditingPkg] = useState(null)

    useEffect(() => {
        if (profile && profile.role !== 'admin') {
            navigate('/')
        }
    }, [profile, navigate])

    useEffect(() => {
        if (!db) {
            setLoading(false)
            return
        }
        setLoading(true)

        // Real-time Listeners
        const unsubB = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, bookings: list }))
            const rev = list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
            setStats(prev => ({ ...prev, revenue: rev, activeBookings: list.filter(b => b.status === 'paid').length }))
            setLoading(false)
        })

        const unsubU = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, users: list }))
            setStats(prev => ({ ...prev, totalUsers: list.length }))
        })

        const unsubP = onSnapshot(query(collection(db, 'packages'), orderBy('price', 'asc')), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, packages: list }))
        })

        const unsubK = onSnapshot(collection(db, 'kayaks'), (snap) => {
            setData(prev => ({ ...prev, kayaks: snap.docs.map(d => ({ id: d.id, ...d.data() })) }))
        })

        const unsubR = onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, reviews: list }))
            if (list.length > 0) {
                const avg = list.reduce((acc, c) => acc + c.rating, 0) / list.length
                setStats(prev => ({ ...prev, avgRating: avg.toFixed(1) }))
            }
        })

        const unsubS = onSnapshot(doc(db, 'settings', 'platform'), (snap) => {
            if (snap.exists()) setData(prev => ({ ...prev, settings: snap.data() }))
        })

        return () => {
            unsubB(); unsubU(); unsubP(); unsubK(); unsubR(); unsubS();
        }
    }, [])

    // CRUD Handlers
    const handleUpdateStatus = async (coll, id, status) => {
        await updateDoc(doc(db, coll, id), { status, updatedAt: serverTimestamp() })
    }

    const handleDelete = async (coll, id) => {
        if (window.confirm('Are you sure you want to delete this?')) {
            await deleteDoc(doc(db, coll, id))
        }
    }

    const handleUpdateSettings = async (updates) => {
        try {
            const ref = doc(db, 'settings', 'platform')
            await setDoc(ref, { ...data.settings, ...updates, updatedAt: serverTimestamp() }, { merge: true })
        } catch (err) { alert(err.message) }
    }

    const handleSavePackage = async (e) => {
        e.preventDefault()
        try {
            if (editingPkg) {
                await updateDoc(doc(db, 'packages', editingPkg), { ...pkgForm, price: Number(pkgForm.price) })
                setEditingPkg(null)
            } else {
                await addDoc(collection(db, 'packages'), { ...pkgForm, price: Number(pkgForm.price), createdAt: serverTimestamp() })
            }
            setPkgForm({ name: '', price: '', duration: '', description: '', emoji: '🚣', active: true })
        } catch (err) {
            alert(err.message)
        }
    }

    const editPackage = (pkg) => {
        setPkgForm(pkg)
        setEditingPkg(pkg.id)
        setActiveTab('packages')
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-5 h-5" /> },
        { id: 'bookings', label: 'Bookings', icon: <Calendar className="w-5 h-5" /> },
        { id: 'packages', label: 'Packages', icon: <Package className="w-5 h-5" /> },
        { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
        { id: 'fleet', label: 'Fleet', icon: <Ship className="w-5 h-5" /> },
        { id: 'reviews', label: 'Reviews', icon: <Star className="w-5 h-5" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    ]

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-10">
            {/* Sidebar */}
            <aside className="w-full lg:w-72 shrink-0">
                <div className={`${S.card} sticky top-28`}>
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                            <Shield size={20} />
                        </div>
                        <h2 className="text-xl font-black">Admin Suite</h2>
                    </div>
                    <nav className="space-y-3">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === tab.id ? 'bg-teal-500 text-white shadow-xl shadow-teal-500/20' : 'text-navy-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {tab.icon} <span className="font-bold text-sm">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Metrics */}
                <header className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: 'Revenue', val: `₹${stats.revenue}`, icon: <DollarSign />, color: 'from-green-500/20' },
                        { label: 'Bookings', val: stats.activeBookings, icon: <Calendar />, color: 'from-blue-500/20' },
                        { label: 'Users', val: stats.totalUsers, icon: <Users />, color: 'from-purple-500/20' },
                        { label: 'Rating', val: `${stats.avgRating}/5`, icon: <Star />, color: 'from-orange-500/20' }
                    ].map((m, i) => (
                        <div key={i} className={`${S.card} bg-gradient-to-br ${m.color} to-transparent border-white/5 p-6`}>
                            <div className="p-3 bg-white/5 w-fit rounded-xl mb-4 text-white/70">{m.icon}</div>
                            <p className="text-navy-500 text-xs font-black uppercase tracking-tighter mb-1">{m.label}</p>
                            <h3 className="text-3xl font-black">{m.val}</h3>
                        </div>
                    ))}
                </header>

                <AnimatePresence mode="wait">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                            <div className={S.card}>
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold flex items-center gap-3"><BarChart3 className="text-teal-400" /> Live Performance</h3>
                                    <span className="text-xs bg-teal-500/10 text-teal-400 px-3 py-1 rounded-full font-bold">Real-time</span>
                                </div>
                                <div className="h-64 flex items-end gap-2 px-2 pb-4 border-b border-white/5">
                                    {/* Mock Chart representation */}
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="flex-1 bg-teal-500/20 rounded-t-xl relative group hover:bg-teal-500/40 transition-all" style={{ height: `${Math.random() * 80 + 20}%` }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-navy-900 border border-white/10 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">₹{Math.floor(Math.random() * 5000)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between pt-4 text-[10px] font-bold text-navy-500 uppercase tracking-widest">
                                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className={S.card}>
                                    <h4 className="text-lg font-bold mb-6">Recent Bookings</h4>
                                    <div className="space-y-4">
                                        {data.bookings.slice(0, 4).map(b => (
                                            <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-navy-950 rounded-full flex items-center justify-center text-teal-400 font-bold">{b.userName?.[0] || 'A'}</div>
                                                    <div>
                                                        <p className="font-bold text-sm">{b.userName || 'Adventure Guest'}</p>
                                                        <p className="text-[10px] text-navy-400 uppercase font-black">{b.package}</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-teal-400">₹{b.amount}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className={S.card}>
                                    <h4 className="text-lg font-bold mb-6">Popular Packages</h4>
                                    <div className="space-y-4">
                                        {data.packages.slice(0, 4).map(p => (
                                            <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{p.emoji}</span>
                                                    <p className="font-bold text-sm">{p.name}</p>
                                                </div>
                                                <span className="text-[10px] px-2 py-1 bg-teal-500/10 text-teal-400 rounded-lg font-black tracking-widest uppercase">₹{p.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Bookings Tab */}
                    {activeTab === 'bookings' && (
                        <motion.div key="bookings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={S.card}>
                            <h3 className="text-2xl font-bold mb-8">Booking Ledger</h3>
                            <div className="overflow-x-auto rounded-[2rem] border border-white/5">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className={S.th}>Client</th>
                                            <th className={S.th}>Package</th>
                                            <th className={S.th}>Date/Slot</th>
                                            <th className={S.th}>Status</th>
                                            <th className={`${S.th} text-right`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.bookings.map(b => (
                                            <tr key={b.id} className="hover:bg-white/5 group transition-colors">
                                                <td className={S.td}>
                                                    <p className="font-bold text-white">{b.userName || 'Voyager'}</p>
                                                    <p className="text-[10px] text-navy-500 font-bold">{b.userId}</p>
                                                </td>
                                                <td className={S.td}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">🛶</span>
                                                        <span className="font-bold text-sm text-teal-400">{b.package}</span>
                                                    </div>
                                                </td>
                                                <td className={S.td}>
                                                    <p className="text-sm font-bold">{b.date}</p>
                                                    <p className="text-xs text-navy-400">{b.slot || 'Morning'}</p>
                                                </td>
                                                <td className={S.td}>
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${b.status === 'paid' ? 'bg-green-500/20 text-green-400' : b.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className={`${S.td} text-right`}>
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleUpdateStatus('bookings', b.id, 'completed')} className="p-3 bg-green-500/10 text-green-400 rounded-2xl hover:bg-green-500 hover:text-white transition-all"><CheckCircle size={16} /></button>
                                                        <button onClick={() => handleDelete('bookings', b.id)} className="p-3 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Packages Tab */}
                    {activeTab === 'packages' && (
                        <motion.div key="packages" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                            {/* Editor */}
                            <div className="xl:col-span-1">
                                <div className={S.card}>
                                    <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                                        {editingPkg ? <Edit3 className="text-teal-400" /> : <Plus className="text-teal-400" />}
                                        {editingPkg ? 'Update Package' : 'New Package'}
                                    </h3>
                                    <form onSubmit={handleSavePackage} className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-navy-500 mb-2 block tracking-widest">Name & Price</label>
                                            <div className="flex gap-4">
                                                <input type="text" placeholder="Package name" value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} className={S.input} required />
                                                <input type="number" placeholder="₹" value={pkgForm.price} onChange={e => setPkgForm({ ...pkgForm, price: e.target.value })} className={`${S.input} w-32`} required />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-navy-500 mb-2 block tracking-widest">Details</label>
                                            <div className="flex gap-4 mb-4">
                                                <input type="text" placeholder="Duration (e.g. 2 hrs)" value={pkgForm.duration} onChange={e => setPkgForm({ ...pkgForm, duration: e.target.value })} className={S.input} required />
                                                <input type="text" placeholder="Emoji" value={pkgForm.emoji} onChange={e => setPkgForm({ ...pkgForm, emoji: e.target.value })} className={`${S.input} w-24`} />
                                            </div>
                                            <textarea placeholder="Description" value={pkgForm.description} onChange={e => setPkgForm({ ...pkgForm, description: e.target.value })} className={`${S.input} h-32 resize-none`} required />
                                        </div>
                                        <button type="submit" className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg">
                                            <Save size={20} /> {editingPkg ? 'Save Changes' : 'Create Package'}
                                        </button>
                                        {editingPkg && (
                                            <button type="button" onClick={() => { setEditingPkg(null); setPkgForm({ name: '', price: '', duration: '', description: '', emoji: '🚣', active: true }) }} className="w-full text-navy-500 font-bold text-sm hover:text-white transition-colors">Cancel Editing</button>
                                        )}
                                    </form>
                                </div>
                            </div>

                            {/* List */}
                            <div className="xl:col-span-2">
                                <div className={S.card}>
                                    <h3 className="text-2xl font-bold mb-8">Service Catalog</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {data.packages.map(p => (
                                            <div key={p.id} className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 relative group hover:bg-white/10 transition-all">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-4xl">{p.emoji}</span>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => editPackage(p)} className="p-2 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white"><Edit3 size={16} /></button>
                                                        <button onClick={() => handleDelete('packages', p.id)} className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                                <h4 className="text-xl font-bold mb-2">{p.name}</h4>
                                                <p className="text-navy-400 text-sm mb-4 line-clamp-2">{p.description}</p>
                                                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                                    <span className="text-xs font-black text-navy-500 uppercase tracking-widest">{p.duration}</span>
                                                    <span className="text-2xl font-black text-teal-400">₹{p.price}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={S.card}>
                            <h3 className="text-2xl font-bold mb-8">Global User Index</h3>
                            <div className="overflow-x-auto rounded-[2rem] border border-white/5">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className={S.th}>Identity</th>
                                            <th className={S.th}>Role</th>
                                            <th className={S.th}>Email</th>
                                            <th className={S.th}>Member Since</th>
                                            <th className={`${S.th} text-right`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.users.map(u => (
                                            <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                <td className={S.td}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-navy-950 rounded-2xl flex items-center justify-center text-teal-400 border border-white/5"><Users size={18} /></div>
                                                        <span className="font-bold text-lg">{u.name || 'Anonymous'}</span>
                                                    </div>
                                                </td>
                                                <td className={S.td}><span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-lg tracking-widest">{u.role}</span></td>
                                                <td className={S.td}><span className="text-navy-400 font-mono text-sm">{u.email}</span></td>
                                                <td className={S.td}><span className="text-sm font-bold">{u.createdAt?.toDate().toLocaleDateString()}</span></td>
                                                <td className={`${S.td} text-right`}><button onClick={() => handleDelete('users', u.id)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><XCircle size={18} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Reviews Tab */}
                    {activeTab === 'reviews' && (
                        <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={S.card}>
                            <h3 className="text-2xl font-bold mb-8">Audience Feedback</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {data.reviews.map(r => (
                                    <div key={r.id} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 relative">
                                        <div className="flex gap-1 text-orange-400 mb-4">
                                            {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} />)}
                                        </div>
                                        <p className="text-lg font-medium italic mb-6">"{r.comment}"</p>
                                        <div className="flex items-center justify-between border-t border-white/5 pt-6">
                                            <div>
                                                <p className="font-bold text-sm">{r.userName}</p>
                                                <p className="text-[10px] text-navy-500 font-black uppercase">{r.createdAt?.toDate().toLocaleDateString()}</p>
                                            </div>
                                            <button onClick={() => handleDelete('reviews', r.id)} className="p-3 text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Fleet Tab */}
                    {activeTab === 'fleet' && (
                        <motion.div key="fleet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <div className={S.card}>
                                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3"><Ship className="text-teal-400" /> Fleet Management</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {data.kayaks.map(k => (
                                        <div key={k.id} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-navy-950 rounded-full flex items-center justify-center text-teal-400 mb-4 shadow-xl border border-white/5"><Ship size={32} /></div>
                                            <h4 className="text-xl font-bold mb-2">{k.name}</h4>
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-6 ${k.status === 'available' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{k.status}</span>
                                            <div className="flex gap-3 w-full">
                                                <button onClick={() => updateDoc(doc(db, 'kayaks', k.id), { status: k.status === 'available' ? 'maintenance' : 'available' })} className={`${S.btn} flex-1 bg-white/5 hover:bg-white/10 text-xs`}>Toggle Status</button>
                                                <button onClick={() => handleDelete('kayaks', k.id)} className={`${S.btn} aspect-square bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white`}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => { const name = prompt('Vessel Name?'); if (name) addDoc(collection(db, 'kayaks'), { name, status: 'available', lastKnownLat: 9.49, lastKnownLng: 76.33 }) }} className={`${S.card} border-dashed border-white/10 flex flex-col items-center justify-center p-8 gap-4 hover:bg-white/5 transition-all group`}>
                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-navy-500 flex items-center justify-center text-navy-500 group-hover:border-teal-400 group-hover:text-teal-400 transition-all"><Plus /></div>
                                        <span className="font-bold text-navy-500 group-hover:text-white transition-all">Add Vessel to Fleet</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <div className={S.card}>
                                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3"><Settings className="text-teal-400" /> Platform Controls</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-black text-navy-500 uppercase tracking-widest border-b border-white/5 pb-2">Website Banner</h4>
                                        <div>
                                            <label className="text-xs text-navy-400 mb-2 block">Promotional Text</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 20% Off for Summer!"
                                                className={S.input}
                                                value={data.settings?.bannerText || ''}
                                                onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, bannerText: e.target.value } }))}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleUpdateSettings({ bannerText: data.settings.bannerText })}
                                            className="btn-primary w-full py-4 text-sm"
                                        >
                                            Update Banner
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-black text-navy-500 uppercase tracking-widest border-b border-white/5 pb-2">Safety & Operations</h4>
                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                            <div>
                                                <p className="font-bold text-red-400">Global SOS Alerts</p>
                                                <p className="text-[10px] text-navy-500 font-bold uppercase">Toggle emergency banners site-wide</p>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateSettings({ sosEnabled: !data.settings?.sosEnabled })}
                                                className={`p-3 rounded-full transition-all ${data.settings?.sosEnabled ? 'bg-red-500 text-white' : 'bg-navy-800 text-navy-500'}`}
                                            >
                                                {data.settings?.sosEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                            <div>
                                                <p className="font-bold">Maintenance Mode</p>
                                                <p className="text-[10px] text-navy-500 font-bold uppercase">Restrict bookings for system updates</p>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateSettings({ maintenanceMode: !data.settings?.maintenanceMode })}
                                                className={`p-3 rounded-full transition-all ${data.settings?.maintenanceMode ? 'bg-teal-500 text-white' : 'bg-navy-800 text-navy-500'}`}
                                            >
                                                {data.settings?.maintenanceMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Global Loader Boundary */}
            {loading && (
                <div className="fixed inset-0 z-[100] bg-navy-950/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
                        <p className="text-teal-400/70 font-black text-xs uppercase tracking-widest">Syncing Fleet Data...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Admin
