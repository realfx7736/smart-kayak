import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MapPin, Navigation, ToggleLeft, ToggleRight, Loader2, Ship, AlertCircle } from 'lucide-react'

const DriverMode = () => {
    const { user, profile } = useAuth()
    const [isTracking, setIsTracking] = useState(false)
    const [kayakId, setKayakId] = useState('')
    const [kayaks, setKayaks] = useState([])
    const [location, setLocation] = useState({ lat: 0, lng: 0 })
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchMyKayaks = async () => {
            const { data } = await supabase.from('kayaks').select('*')
            if (data) setKayaks(data)
        }
        fetchMyKayaks()
    }, [])

    useEffect(() => {
        let watchId;
        if (isTracking && kayakId) {
            watchId = navigator.geolocation.watchPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords
                    setLocation({ lat: latitude, lng: longitude })

                    // Update Kayak Location
                    await supabase
                        .from('kayaks')
                        .update({
                            last_known_lat: latitude,
                            last_known_lng: longitude,
                            status: 'in-use',
                            updated_at: new Date()
                        })
                        .eq('id', kayakId)

                    // Optional: Historical tracking
                    await supabase
                        .from('tracking')
                        .insert({
                            kayak_id: kayakId,
                            latitude,
                            longitude
                        })
                },
                (err) => setError(err.message),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            )
        }
        return () => { if (watchId) navigator.geolocation.clearWatch(watchId) }
    }, [isTracking, kayakId])

    if (profile?.role !== 'admin' && !user) return <div className="p-20 text-center font-bold">Unauthorized. Drivers only.</div>

    return (
        <div className="max-w-xl mx-auto px-6 py-12">
            <div className="glass p-10 rounded-[3rem] border-white/10 shadow-2xl">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-4 bg-teal-500/10 rounded-3xl text-teal-400">
                        <Navigation className={`w-8 h-8 ${isTracking ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black">Kayak <span className="text-teal-400">Beacon</span></h1>
                        <p className="text-navy-400 text-xs font-bold uppercase tracking-widest">Driver Navigation Unit</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="text-sm font-bold text-navy-400 uppercase tracking-widest mb-4 block">1. Select Your Vessel</label>
                        <select
                            value={kayakId}
                            onChange={(e) => setKayakId(e.target.value)}
                            disabled={isTracking}
                            className="w-full bg-navy-950/50 border border-white/10 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                        >
                            <option value="">Choose a Kayak...</option>
                            {kayaks.map(k => (
                                <option key={k.id} value={k.id}>{k.name} ({k.status})</option>
                            ))}
                        </select>
                    </div>

                    <div className="p-8 bg-navy-950/50 border border-white/5 rounded-[2rem] flex flex-col items-center gap-4">
                        <div className="text-center">
                            <p className="text-navy-400 text-xs font-bold uppercase tracking-widest mb-1">Current Coordinates</p>
                            <h3 className="text-xl font-mono text-teal-400">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</h3>
                        </div>

                        <div className="flex items-center gap-6 mt-4">
                            <div className="text-right">
                                <p className="text-sm font-bold text-white">{isTracking ? 'SIGNAL BROADCASTING' : 'OFFLINE'}</p>
                                <p className="text-[10px] text-navy-400 font-bold uppercase">{isTracking ? 'Publicly visible' : 'Hidden from map'}</p>
                            </div>
                            <button
                                onClick={() => setIsTracking(!isTracking)}
                                disabled={!kayakId}
                                className={`p-4 rounded-full transition-all ${isTracking ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'} disabled:opacity-30`}
                            >
                                {isTracking ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" /> {error}
                        </div>
                    )}

                    {isTracking && (
                        <div className="mt-12 text-center py-6 border-t border-white/5">
                            <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-4" />
                            <p className="text-white font-bold">Kayakers can now see you live.</p>
                            <p className="text-navy-400 text-sm">Keep this screen open for high-precision tracking.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DriverMode
