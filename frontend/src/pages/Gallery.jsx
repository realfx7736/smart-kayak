import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db, storage } from '../lib/firebase'
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp
} from 'firebase/firestore'
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage'
import { useAuth } from '../context/AuthContext'
import { Upload, X, Loader2, Camera, Heart, MessageSquare, Star } from 'lucide-react'

const Gallery = () => {
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [file, setFile] = useState(null)
    const [caption, setCaption] = useState('')
    const { user, profile } = useAuth()

    useEffect(() => {
        const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'))
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setImages(list)
            setLoading(false)
        })
        return () => unsub()
    }, [])

    const handleFileChange = (e) => {
        const selected = e.target.files[0]
        if (selected) {
            setFile(selected)
            setPreviewUrl(URL.createObjectURL(selected))
        }
    }

    const handleUpload = async () => {
        if (!file || !user) return
        setUploading(true)
        try {
            const filePath = `gallery/${user.uid}/${Date.now()}_${file.name}`
            const storageRef = ref(storage, filePath)

            // 1. Storage Upload
            await uploadBytes(storageRef, file)
            const downloadUrl = await getDownloadURL(storageRef)

            // 2. Firestore Sync
            await addDoc(collection(db, 'gallery'), {
                userId: user.uid,
                userName: profile?.name || 'Explorer',
                imageUrl: downloadUrl,
                caption,
                createdAt: serverTimestamp()
            })

            setFile(null); setPreviewUrl(null); setCaption('')
        } catch (err) {
            alert('Upload failed: ' + err.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20 glass p-16 rounded-[4rem]">
                <div className="max-w-2xl">
                    <span className="text-[10px] font-black uppercase text-teal-400 mb-4 block">Capturing Magic</span>
                    <h1 className="text-7xl font-black mb-6">River <span className="text-teal-400">View</span></h1>
                    <p className="text-navy-400 text-lg">Community gallery powered by your voyages in Kuttanad.</p>
                </div>
                {user && (
                    <button onClick={() => document.getElementById('file-upload').click()} className="btn-primary px-10 py-5 flex items-center justify-center gap-4 text-lg">
                        <Camera className="w-6 h-6" /> Share Your View
                    </button>
                )}
                <input id="file-upload" type="file" hidden accept="image/*" onChange={handleFileChange} />
            </div>

            <AnimatePresence>
                {previewUrl && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-navy-950/95 flex items-center justify-center p-6">
                        <div className="glass w-full max-w-lg p-10 rounded-[3rem] relative shadow-2xl">
                            <button onClick={() => setPreviewUrl(null)} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white"><X className="w-6 h-6" /></button>
                            <img src={previewUrl} className="w-full aspect-video object-cover rounded-3xl mb-8 shadow-2xl" alt="Preview" />
                            <input type="text" placeholder="Add a memory caption..." value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full bg-navy-900 border border-white/10 rounded-2xl p-4 text-white outline-none mb-8" />
                            <button onClick={handleUpload} disabled={uploading} className="w-full btn-primary py-5 text-xl flex items-center justify-center gap-4 disabled:opacity-50">
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Upload className="w-6 h-6" /> Publish Image</>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
                {images.map((img) => (
                    <motion.div key={img.id} whileHover={{ y: -5 }} className="relative group rounded-[2.5rem] overflow-hidden bg-navy-900 border border-white/5 break-inside-avoid">
                        <img src={img.imageUrl} alt={img.caption} className="w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                            <p className="text-white text-lg font-bold mb-4">{img.caption || 'Kuttanad Memory'}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-white/70 text-xs font-black uppercase tracking-widest">{img.userName}</span>
                                <div className="flex gap-4"><Heart className="w-5 h-5 text-white/50 hover:text-red-500" /><MessageSquare className="w-5 h-5 text-white/50 hover:text-teal-400" /></div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

export default Gallery
