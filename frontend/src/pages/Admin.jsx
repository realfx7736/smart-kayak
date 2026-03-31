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
    where,
    getDocs
} from 'firebase/firestore'
import {
    Users, Calendar, Ship, Star,
    Settings, CheckCircle, XCircle, Trash2,
    DollarSign, Loader2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Admin = () => {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('bookings')
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({ bookings: [], users: [], kayaks: [], reviews: [], payments: [] })
    const [stats, setStats] = useState({ revenue: 0, activeBookings: 0, totalUsers: 0 })
    const [newKayak, setNewKayak] = useState({ name: '', status: 'available' })

    useEffect(() => {
        if (profile && profile.role !== 'admin') {
            navigate('/')
        }
    }, [profile, navigate])

    useEffect(() => {
        setLoading(true)

        // Listeners for real-time updates
        const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
        const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
        const qKayaks = query(collection(db, 'kayaks'))
        const qReviews = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
        const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))

        const unsubB = onSnapshot(qBookings, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, bookings: list }))

            const rev = list.reduce((acc, curr) => acc + (curr.amount || 0), 0)
            const active = list.filter(b => b.status === 'paid').length
            setStats(prev => ({ ...prev, revenue: rev, activeBookings: active }))
            setLoading(false)
        })

        const unsubU = onSnapshot(qUsers, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, users: list }))
            setStats(prev => ({ ...prev, totalUsers: list.length }))
        })

        const unsubK = onSnapshot(qKayaks, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, kayaks: list }))
        })

        const unsubR = onSnapshot(qReviews, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, reviews: list }))
        })

        const unsubP = onSnapshot(qPayments, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setData(prev => ({ ...prev, payments: list }))
        })

        return () => {
            unsubB(); unsubU(); unsubK(); unsubR(); unsubP();
        }
    }, [])

    const updateStatus = async (coll, id, status) => {
        await updateDoc(doc(db, coll, id), { status })
    }

    const deleteItem = async (coll, id) => {
        if (confirm('Permanently delete record?')) {
            await deleteDoc(doc(db, coll, id))
        }
    }

    const registerKayak = async (e) => {
        e.preventDefault()
        await addDoc(collection(db, 'kayaks'), { ...newKayak, lastKnownLat: 9.498, lastKnownLng: 76.338 })
        setNewKayak({ name: '', status: 'available' })
    }

    const tabs = [
        { id: 'bookings', label: 'Bookings', icon: <Calendar className="w-5 h-5" /> },
        { id: 'payments', label: 'Payments History', icon: <DollarSign className="w-5 h-5" /> },
        { id: 'kayaks', label: 'Fleet Management', icon: <Ship className="w-5 h-5" /> },
        { id: 'users', label: 'User Directory', icon: <Users className="w-5 h-5" /> },
    ]

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
            <aside className="w-full md:w-80 shrink-0">
                <div className="glass p-8 rounded-[2.5rem] border-white/5 sticky top-32">
                    <h2 className="text-2xl font-black mb-8 px-4">Admin Hub</h2>
                    <nav className="space-y-4">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === tab.id ? 'bg-teal-500 text-white shadow-xl shadow-teal-500/20' : 'text-navy-400 hover:bg-white/5 hover:text-white'}`}>
                                {tab.icon} <span className="font-bold">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                <header className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-gradient-to-br from-teal-500/10 to-transparent">
                        <DollarSign className="text-teal-400 w-10 h-10 mb-4" />
                        <p className="text-navy-400 text-sm font-bold uppercase tracking-widest mb-1">Total Venue</p>
                        <h3 className="text-4xl font-extrabold">₹{stats.revenue}</h3>
                    </div>
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent">
                        <Calendar className="text-blue-400 w-10 h-10 mb-4" />
                        <p className="text-navy-400 text-sm font-bold uppercase tracking-widest mb-1">Active Bookings</p>
                        <h3 className="text-4xl font-extrabold">{stats.activeBookings}</h3>
                    </div>
                </header>

                <section className="glass rounded-[3rem] border-white/5 overflow-hidden">
                    <div className="bg-white/5 px-10 py-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-2xl font-bold capitalize">{activeTab}</h3>
                        {loading && <Loader2 className="animate-spin text-teal-400" />}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-navy-500 border-b border-white/5">
                                {activeTab === 'bookings' && (
                                    <tr><th className="px-10 py-6">Customer</th><th className="px-6 py-6">Package</th><th className="px-6 py-6">Status</th><th className="px-10 py-6 text-right">Actions</th></tr>
                                )}
                                {activeTab === 'users' && (
                                    <tr><th className="px-10 py-6">Name</th><th className="px-6 py-6">Role</th><th className="px-6 py-6">Email</th><th className="px-10 py-6 text-right">Registered</th></tr>
                                )}
                            </thead>
                            <tbody>
                                {activeTab === 'bookings' && data.bookings.map(b => (
                                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="px-10 py-8 font-bold text-white">{b.userName || 'Adventure Voyager'}</td>
                                        <td className="px-6 py-8 italic text-navy-300">{b.package}</td>
                                        <td className="px-6 py-8">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${b.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>{b.status}</span>
                                        </td>
                                        <td className="px-10 py-8 text-right space-x-2">
                                            <button onClick={() => updateStatus('bookings', b.id, 'completed')} className="p-3 bg-green-500/10 text-green-400 rounded-2xl hover:bg-green-500 hover:text-white transition-all"><CheckCircle className="w-5 h-5" /></button>
                                            <button onClick={() => deleteItem('bookings', b.id)} className="p-3 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><XCircle className="w-5 h-5" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'users' && data.users.map(u => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="px-10 py-8 font-bold">{u.name}</td>
                                        <td className="px-6 py-8"><span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">{u.role}</span></td>
                                        <td className="px-6 py-8 text-navy-400">{u.email}</td>
                                        <td className="px-10 py-8 text-right">{u.createdAt?.toDate().toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {activeTab === 'kayaks' && (
                        <div className="p-10 bg-white/5">
                            <h4 className="text-sm font-black uppercase text-navy-400 mb-6">Register New Boat</h4>
                            <form onSubmit={registerKayak} className="flex gap-4">
                                <input type="text" placeholder="Kayak Name" value={newKayak.name} onChange={e => setNewKayak({ ...newKayak, name: e.target.value })} className="bg-navy-950 border border-white/10 rounded-2xl p-4 flex-1 outline-none" required />
                                <button type="submit" className="btn-primary px-10">Add Fleet</button>
                            </form>
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

export default Admin
