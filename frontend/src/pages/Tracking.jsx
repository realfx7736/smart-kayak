import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { db } from '../lib/firebase'
import {
    collection,
    query,
    where,
    onSnapshot
} from 'firebase/firestore'
import { Navigation, Map as MapIcon, Ship, Radio, AlertCircle, Compass, Target, Crosshair } from 'lucide-react'

// Replace with actual Mapbox Public Token if placeholder
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiYm9va2luZyIsImEiOiJja2x6bHh2ZTAwMDRqMm9wYmt3eXF4eXF4In0.1x1x1x1x1x1x1x1'

const Tracking = () => {
    const mapContainer = useRef(null)
    const map = useRef(null)
    const [kayaks, setKayaks] = useState([])
    const [selectedKayak, setSelectedKayak] = useState(null)
    const [loading, setLoading] = useState(true)
    const markers = useRef({})

    useEffect(() => {
        if (!db) {
            setLoading(false)
            return
        }

        // Real-time listener for active kayaks in Firestore
        const q = query(collection(db, 'kayaks'), where('status', '==', 'in-use'))
        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setKayaks(list)
            setLoading(false)

            // Sync markers
            list.forEach(updateMarker)
        })

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (!mapContainer.current) return

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [76.36, 9.49],
            zoom: 13,
            pitch: 45,
            bearing: -17
        })

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

        return () => map.current.remove()
    }, [])

    const updateMarker = (kayak) => {
        if (!map.current || !kayak.lastKnownLng || !kayak.lastKnownLat) return

        const el = document.createElement('div')
        el.className = 'marker'
        el.innerHTML = `
            <div class="relative flex items-center justify-center">
                <div class="absolute w-12 h-12 bg-teal-500/20 rounded-full animate-ping"></div>
                <div class="w-8 h-8 bg-teal-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-xl shadow-teal-500/40">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3h-6.75a4.5 4.5 0 0 0-4.5 4.5V21l3-2 3 2V7.5a1.5 1.5 0 1 1 3 0V11l3-2-3-2z"/></svg>
                </div>
            </div>
        `

        if (markers.current[kayak.id]) {
            markers.current[kayak.id].setLngLat([kayak.lastKnownLng, kayak.lastKnownLat])
        } else {
            const marker = new mapboxgl.Marker(el)
                .setLngLat([kayak.lastKnownLng, kayak.lastKnownLat])
                .addTo(map.current)

            markers.current[kayak.id] = marker
        }
    }

    const focusOnKayak = (k) => {
        if (!map.current) return
        map.current.flyTo({
            center: [k.lastKnownLng, k.lastKnownLat],
            zoom: 16,
            essential: true,
            pitch: 60
        })
        setSelectedKayak(k)
    }

    return (
        <div className="relative h-[calc(100vh-80px)] w-full overflow-hidden">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

            <div className="absolute top-6 left-6 z-10 w-full max-w-xs md:max-w-sm flex flex-col gap-4">
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 rounded-[2rem] border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400">
                            <Radio className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Kayaks Active</h2>
                            <p className="text-navy-400 text-xs font-bold uppercase tracking-widest uppercase">Live Telemetry</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {loading ? (
                            [1, 2].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
                        ) : kayaks.length === 0 ? (
                            <div className="text-center py-8">
                                <AlertCircle className="w-8 h-8 text-navy-400 mx-auto mb-2" />
                                <p className="text-navy-400 text-sm">No active kayaks right now.</p>
                            </div>
                        ) : (
                            kayaks.map(k => (
                                <button key={k.id} onClick={() => focusOnKayak(k)} className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedKayak?.id === k.id ? 'bg-teal-500 border-teal-500 text-white shadow-xl shadow-teal-500/20' : 'bg-navy-950/40 border-white/5 text-navy-300 hover:bg-navy-800'}`}>
                                    <div className="flex items-center gap-4">
                                        <Ship className={`w-6 h-6 ${selectedKayak?.id === k.id ? 'text-white' : 'text-teal-500'}`} />
                                        <div className="text-left">
                                            <p className="font-bold">{k.name}</p>
                                            <p className={`text-[10px] uppercase font-bold tracking-tighter ${selectedKayak?.id === k.id ? 'text-teal-100' : 'text-navy-400'}`}>Status: {k.status}</p>
                                        </div>
                                    </div>
                                    <Target className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))
                        )}
                    </div>
                </motion.div>

                <motion.button initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-red-600 hover:bg-red-700 text-white p-5 rounded-[2rem] font-bold text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                    <AlertCircle className="w-6 h-6" /> SOS EMERGENCY
                </motion.button>
            </div>

            <AnimatePresence>
                {selectedKayak && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-10">
                        <div className="glass p-8 rounded-[3rem] border-teal-500/20 shadow-2xl flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-teal-500/10 rounded-3xl text-teal-400 border border-teal-500/20">
                                    <Compass className="w-8 h-8 animate-spin-slow" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-2xl font-black text-white">{selectedKayak.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-teal-500 shadow-lg shadow-teal-500/50 animate-pulse" />
                                        <span className="text-xs text-navy-400 font-bold tracking-widest uppercase">Coordinates Synced</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedKayak(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                                <Crosshair className="w-5 h-5 text-navy-400" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default Tracking
