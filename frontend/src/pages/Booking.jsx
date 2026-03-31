import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../lib/firebase'
import {
    collection,
    getDocs,
    query,
    orderBy,
    addDoc,
    serverTimestamp
} from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { createRazorpayOrder, verifyPayment, loadRazorpay } from '../lib/api'
import { Calendar, Clock, CreditCard, ChevronRight, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

const Booking = () => {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPackage, setSelectedPackage] = useState(null)
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedSlot, setSelectedSlot] = useState('')
    const [step, setStep] = useState(1) // 1: Select Pkg, 2: Select Slot, 3: Success
    const [processing, setProcessing] = useState(false)
    const { user, profile } = useAuth()
    const navigate = useNavigate()

    const slots = ['06:00 AM', '08:00 AM', '10:00 AM', '02:00 PM', '04:00 PM', '05:30 PM']

    useEffect(() => {
        const fetchPackages = async () => {
            const q = query(collection(db, 'packages'), orderBy('price', 'asc'))
            const snap = await getDocs(q)
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))

            // If empty, initialize seed data (Step 4)
            if (list.length === 0) {
                const seed = [
                    { name: 'Sunrise Kayaking', price: 699, duration: '2 Hours', description: 'Serenity of the morning backwaters.' },
                    { name: 'Sunset Kayaking', price: 799, duration: '2 Hours', description: 'Golden hour romance on the water.' },
                    { name: 'Quick Ride', price: 399, duration: '45 Mins', description: 'Quick splash and dash.' }
                ]
                for (let p of seed) { await addDoc(collection(db, 'packages'), p) }
                setPackages(seed)
            } else {
                setPackages(list)
            }
            setLoading(false)
        }
        fetchPackages()
    }, [])

    const handleBooking = async () => {
        if (!user) return navigate('/login')
        setProcessing(true)

        try {
            await loadRazorpay()
            const order = await createRazorpayOrder(selectedPackage.id, selectedPackage.price)

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Smart Kuttanad Kayaking',
                description: `Booking for ${selectedPackage.name}`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        const result = await verifyPayment(response, {
                            userId: user.uid,
                            userName: profile?.name || user.email,
                            packageId: selectedPackage.id,
                            package: selectedPackage.name,
                            amount: selectedPackage.price,
                            date: selectedDate,
                            slot: selectedSlot
                        })
                        if (result.status === 'success') setStep(3)
                    } catch (err) {
                        alert('Payment failed to confirm. Database sync pending.')
                    }
                },
                prefill: {
                    name: profile?.name || 'Explorer',
                    email: user.email,
                },
                theme: { color: '#3d9e9e' }
            }

            const paymentObject = new window.Razorpay(options)
            paymentObject.open()
        } catch (err) {
            console.error(err)
            alert('Payment engine offline. Contact admin.')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return <div className="h-[80vh] flex items-center justify-center text-teal-400">Charting the Course...</div>

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="mb-12"><h1 className="text-4xl font-extrabold mb-4">Book Your <span className="text-teal-400">Experience</span></h1></div>

            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {packages.map((pkg) => (
                        <motion.div key={pkg.id} whileHover={{ y: -5 }} onClick={() => setSelectedPackage(pkg)} className={`p-8 glass rounded-[3rem] cursor-pointer relative ${selectedPackage?.id === pkg.id ? 'ring-2 ring-teal-400 bg-teal-500/10 shadow-2xl' : ''}`}>
                            <div className="flex justify-between items-start mb-6"><div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400"><Clock className="w-5 h-5" /></div><span className="text-3xl font-black">₹{pkg.price}</span></div>
                            <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                            <p className="text-navy-400 text-sm mb-6">{pkg.description}</p>
                            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest">{pkg.duration} ride <ChevronRight className="w-4 h-4" /></div>
                            {selectedPackage?.id === pkg.id && (
                                <button onClick={() => setStep(2)} className="absolute bottom-4 right-4 bg-teal-500 text-white p-3 rounded-full shadow-lg"><ChevronRight className="w-6 h-6" /></button>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto glass p-10 rounded-[3rem]">
                    <button onClick={() => setStep(1)} className="text-navy-400 hover:text-white mb-8 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Packages</button>
                    <h2 className="text-3xl font-bold mb-8">Schedule Your Voyage</h2>
                    <div className="space-y-8">
                        <div><label className="text-[10px] font-black uppercase text-navy-500 mb-4 block">Pick a Date</label><input type="date" min={new Date().toISOString().split('T')[0]} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-navy-950/50 border border-white/5 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-teal-500" /></div>
                        <div><label className="text-[10px] font-black uppercase text-navy-500 mb-4 block">Choose a Slot</label>
                            <div className="grid grid-cols-2 gap-3">
                                {slots.map(slot => (
                                    <button key={slot} onClick={() => setSelectedSlot(slot)} className={`p-4 rounded-2xl border transition-all text-xs font-bold ${selectedSlot === slot ? 'bg-teal-500 border-teal-500 text-white shadow-xl' : 'bg-navy-950/20 border-white/5 text-navy-400'}`}>{slot}</button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-10 border-t border-white/5 flex justify-between items-center mb-10"><div><p className="text-xs text-navy-500">PACKAGE</p><p className="font-bold">{selectedPackage.name}</p></div><div className="text-right"><p className="text-xs text-navy-500">TOTAL</p><p className="text-2xl font-black text-teal-400">₹{selectedPackage.price}</p></div></div>
                        <button disabled={!selectedDate || !selectedSlot || processing} onClick={handleBooking} className="w-full btn-primary py-5 text-lg flex items-center justify-center gap-4 disabled:opacity-50">
                            {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CreditCard className="w-6 h-6" /> Confirm Payment</>}
                        </button>
                    </div>
                </motion.div>
            )}

            {step === 3 && (
                <div className="max-w-xl mx-auto text-center glass p-12 rounded-[4rem]">
                    <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-teal-400"><CheckCircle2 className="w-10 h-10" /></div>
                    <h1 className="text-4xl font-black mb-4">Confirmed!</h1>
                    <p className="text-navy-400 mb-10 text-lg">Your voyage in {selectedPackage.name} is booked and secured.</p>
                    <div className="flex flex-col gap-4"><Link to="/tracking" className="btn-primary py-4">Live Radar</Link><Link to="/" className="text-navy-500 hover:text-white transition-colors">Return to Shore</Link></div>
                </div>
            )}
        </div>
    )
}

export default Booking
