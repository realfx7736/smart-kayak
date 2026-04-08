import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db, storage } from '../lib/firebase'
import {
    collection, query, orderBy, onSnapshot,
    addDoc, deleteDoc, doc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { useAuth } from '../context/AuthContext'
import {
    Upload, X, Loader2, Camera, Heart, ZoomIn,
    ChevronLeft, ChevronRight, Trash2, CheckCircle,
    ImageIcon, CloudUpload, AlertCircle
} from 'lucide-react'

// ── Demo images (shown when Firebase is not connected) ────────────────────────
const DEMO_IMAGES = [
    { id: 'd1', imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80', caption: 'Morning Paddle', userName: 'Arjun K', approved: true },
    { id: 'd2', imageUrl: 'https://images.unsplash.com/photo-1519744346361-7a029b427a59?w=800&q=80', caption: 'Backwater Sunrise', userName: 'Meera R', approved: true },
    { id: 'd3', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', caption: 'Kuttanad Canals', userName: 'Ravi M', approved: true },
    { id: 'd4', imageUrl: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80', caption: 'Green Waterways', userName: 'Priya S', approved: true },
    { id: 'd5', imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80', caption: 'Team Kayakers', userName: 'Sam T', approved: true },
    { id: 'd6', imageUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800&q=80', caption: 'Sunset Row', userName: 'Divya P', approved: true },
]

// ── Upload Modal ──────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onUploaded, user, profile }) => {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [caption, setCaption] = useState('')
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('idle')  // idle | uploading | done | error
    const [errMsg, setErrMsg] = useState('')
    const [category, setCategory] = useState('General')
    const fileRef = useRef()

    const categories = ['General', 'Sunrise & Sunset', 'Wildlife', 'Adventure', 'Group Trips', 'Landscape']

    const handleFile = (e) => {
        const f = e.target.files[0]
        if (!f) return
        if (!f.type.startsWith('image/')) { setErrMsg('Only image files are allowed.'); return }
        if (f.size > 10 * 1024 * 1024) { setErrMsg('File too large (max 10 MB).'); return }
        setFile(f)
        setPreview(URL.createObjectURL(f))
        setErrMsg('')
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) handleFile({ target: { files: [f] } })
    }

    const handleUpload = async () => {
        if (!file) return

        if (!storage || !db) {
            setErrMsg('Firebase Storage is not configured yet. Please add your Firebase API keys to the .env file.')
            return
        }

        setStatus('uploading')
        setProgress(0)

        try {
            const path = `gallery/${user.uid}/${Date.now()}_${file.name}`
            const storageRef = ref(storage, path)
            const task = uploadBytesResumable(storageRef, file)

            task.on('state_changed',
                (snap) => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
                (err) => { setStatus('error'); setErrMsg(err.message) },
                async () => {
                    const url = await getDownloadURL(task.snapshot.ref)
                    await addDoc(collection(db, 'gallery'), {
                        userId: user.uid,
                        userName: profile?.name || 'Explorer',
                        imageUrl: url,
                        caption,
                        category,
                        approved: profile?.role === 'admin',
                        createdAt: serverTimestamp()
                    })
                    setStatus('done')
                    setTimeout(() => { onUploaded(); onClose() }, 1000)
                }
            )
        } catch (err) {
            setStatus('error')
            setErrMsg(err.message)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="glass w-full max-w-xl p-8 rounded-[2.5rem] relative shadow-2xl border border-white/10"
            >
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors">
                    <X size={22} />
                </button>

                <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                    <CloudUpload className="text-teal-400" size={24} /> Share Your Memory
                </h2>

                {/* Drop zone */}
                {!preview ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => fileRef.current.click()}
                        className="border-2 border-dashed border-white/10 hover:border-teal-500/50 rounded-3xl aspect-video flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-white/5 mb-6"
                    >
                        <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-400">
                            <ImageIcon size={32} />
                        </div>
                        <p className="font-bold text-sm text-white/70">Drop image here or <span className="text-teal-400">click to browse</span></p>
                        <p className="text-xs text-navy-500">JPG, PNG, WEBP — max 10 MB</p>
                    </div>
                ) : (
                    <div className="relative mb-6">
                        <img src={preview} alt="Preview" className="w-full aspect-video object-cover rounded-3xl shadow-2xl" />
                        <button onClick={() => { setFile(null); setPreview(null) }}
                            className="absolute top-3 right-3 p-2 bg-black/60 rounded-xl text-white hover:bg-red-500 transition-all">
                            <X size={16} />
                        </button>
                    </div>
                )}

                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

                {/* Caption + Category */}
                <div className="space-y-3 mb-6">
                    <input
                        type="text"
                        placeholder="Add a caption for this memory..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full bg-navy-950 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-teal-500/50 placeholder-navy-500"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-navy-950 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-teal-500/50"
                    >
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>

                {/* Progress bar */}
                {status === 'uploading' && (
                    <div className="mb-4">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-teal-500 rounded-full"
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <p className="text-xs text-navy-400 mt-2 text-center font-bold">{progress}% uploaded…</p>
                    </div>
                )}

                {/* Error */}
                {errMsg && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" /> {errMsg}
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || status === 'uploading' || status === 'done'}
                    className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {status === 'uploading' && <Loader2 className="animate-spin w-5 h-5" />}
                    {status === 'done' && <CheckCircle className="w-5 h-5" />}
                    {status === 'idle' && <Upload className="w-5 h-5" />}
                    {status === 'idle' ? 'Publish to Gallery' : status === 'uploading' ? 'Uploading…' : 'Published!'}
                </button>

                {!storage && (
                    <p className="text-center text-xs text-navy-500 mt-3">⚠️ Firebase not connected — configure .env to enable real uploads</p>
                )}
            </motion.div>
        </motion.div>
    )
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ images, index, onClose }) => {
    const [current, setCurrent] = useState(index)
    const img = images[current]

    const prev = () => setCurrent(c => (c - 1 + images.length) % images.length)
    const next = () => setCurrent(c => (c + 1) % images.length)

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft') prev()
            if (e.key === 'ArrowRight') next()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <button onClick={onClose} className="absolute top-6 right-6 p-3 text-white/60 hover:text-white bg-white/5 rounded-2xl transition-all">
                <X size={22} />
            </button>

            <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                <ChevronLeft size={28} />
            </button>
            <button onClick={next} className="absolute right-6 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                <ChevronRight size={28} />
            </button>

            <div className="max-w-4xl w-full text-center">
                <motion.img
                    key={current}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    src={img.imageUrl} alt={img.caption}
                    className="max-h-[75vh] w-full object-contain rounded-3xl shadow-2xl mx-auto"
                />
                <div className="mt-6">
                    <p className="text-xl font-bold text-white mb-1">{img.caption || 'Kuttanad Memory'}</p>
                    <p className="text-navy-400 text-sm font-bold uppercase tracking-widest">by {img.userName}</p>
                </div>
                <p className="text-navy-600 text-xs mt-4">{current + 1} / {images.length}</p>
            </div>
        </motion.div>
    )
}

// ── Main Gallery Component ────────────────────────────────────────────────────
const Gallery = () => {
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [showUpload, setShowUpload] = useState(false)
    const [lightbox, setLightbox] = useState(null)  // index
    const [filter, setFilter] = useState('All')
    const [liked, setLiked] = useState(new Set())
    const [usingDemo, setUsingDemo] = useState(false)
    const { user, profile } = useAuth()

    const categories = ['All', 'Sunrise & Sunset', 'Wildlife', 'Adventure', 'Group Trips', 'Landscape', 'General']

    useEffect(() => {
        if (!db) {
            setImages(DEMO_IMAGES)
            setUsingDemo(true)
            setLoading(false)
            return
        }
        const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'))
        const unsub = onSnapshot(q, (snap) => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            // Public: only approved. Admin: see all
            const visible = all.filter(img => img.approved === true || profile?.role === 'admin')
            setImages(visible.length > 0 ? visible : DEMO_IMAGES)
            setUsingDemo(visible.length === 0)
            setLoading(false)
        }, () => {
            setImages(DEMO_IMAGES)
            setUsingDemo(true)
            setLoading(false)
        })
        return () => unsub()
    }, [profile])

    const filtered = filter === 'All' ? images : images.filter(img => img.category === filter)

    const handleLike = (id) => {
        setLiked(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleDelete = async (id) => {
        if (!db || usingDemo) return
        if (window.confirm('Delete this photo?')) {
            await deleteDoc(doc(db, 'gallery', id))
        }
    }

    const handleApprove = async (id) => {
        if (!db) return
        await updateDoc(doc(db, 'gallery', id), { approved: true })
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            {/* ── Hero ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass p-12 md:p-16 rounded-[3rem] mb-16 flex flex-col md:flex-row justify-between items-center gap-10 border border-white/5"
            >
                <div>
                    <span className="text-[10px] font-black uppercase text-teal-400 mb-4 block tracking-widest">📸 Community Gallery</span>
                    <h1 className="text-5xl md:text-7xl font-black mb-4">
                        River <span className="text-teal-400">View</span>
                    </h1>
                    <p className="text-navy-400 text-lg max-w-lg">Stunning moments captured by our kayaking community across Kuttanad's backwaters.</p>
                </div>
                <div className="flex flex-col gap-3 items-center">
                    {user ? (
                        <button
                            onClick={() => setShowUpload(true)}
                            className="btn-primary px-10 py-5 flex items-center gap-3 text-lg"
                        >
                            <Camera size={22} /> Share Your View
                        </button>
                    ) : (
                        <div className="text-center">
                            <p className="text-navy-400 text-sm mb-3">Login to share your photos</p>
                            <a href="/login" className="btn-primary px-8 py-4 flex items-center gap-3">
                                <Camera size={18} /> Login & Share
                            </a>
                        </div>
                    )}
                    <p className="text-navy-600 text-xs">{images.length} photos so far</p>
                </div>
            </motion.div>

            {/* ── Demo Banner ── */}
            {usingDemo && (
                <div className="mb-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-4">
                    <AlertCircle className="text-orange-400 shrink-0" size={20} />
                    <p className="text-sm text-orange-300">
                        <span className="font-bold">Demo Mode:</span> Showing sample images. Connect Firebase to display real uploads.
                    </p>
                </div>
            )}

            {/* ── Category Filter ── */}
            <div className="flex flex-wrap gap-3 mb-10">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filter === cat
                                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                                : 'glass border border-white/10 text-navy-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ── Loading ── */}
            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-teal-400 mx-auto mb-4" />
                        <p className="text-navy-400 font-bold text-sm">Loading gallery…</p>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-32">
                    <div className="p-6 bg-white/5 rounded-3xl inline-flex mb-6 text-navy-500"><ImageIcon size={40} /></div>
                    <p className="text-navy-400 font-bold text-lg">No photos in this category yet</p>
                    <p className="text-navy-600 text-sm mt-2">Be the first to share a memory!</p>
                </div>
            ) : (
                /* ── Masonry Grid ── */
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                    {filtered.map((img, i) => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative group rounded-3xl overflow-hidden bg-navy-900 border border-white/5 break-inside-avoid cursor-pointer"
                        >
                            {/* Lazy-loaded image */}
                            <img
                                src={img.imageUrl}
                                alt={img.caption || 'Gallery photo'}
                                loading="lazy"
                                className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onClick={() => setLightbox(filtered.indexOf(img))}
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-end">
                                {/* Zoom button */}
                                <button
                                    onClick={() => setLightbox(filtered.indexOf(img))}
                                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all"
                                >
                                    <ZoomIn size={16} className="text-white" />
                                </button>

                                <p className="text-white font-bold text-sm mb-2 line-clamp-2">{img.caption || 'Kuttanad Memory'}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">{img.userName}</span>
                                    <div className="flex items-center gap-3">
                                        {/* Like */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleLike(img.id) }}
                                            className="flex items-center gap-1 text-white/60 hover:text-red-400 transition-colors"
                                        >
                                            <Heart size={15} fill={liked.has(img.id) ? 'currentColor' : 'none'}
                                                className={liked.has(img.id) ? 'text-red-400' : ''} />
                                        </button>

                                        {/* Admin controls */}
                                        {profile?.role === 'admin' && !usingDemo && (
                                            <>
                                                {!img.approved && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApprove(img.id) }}
                                                        className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(img.id) }}
                                                    className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pending badge */}
                            {img.approved === false && profile?.role === 'admin' && (
                                <div className="absolute top-3 left-3 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg uppercase tracking-widest">
                                    Pending
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Upload Modal ── */}
            <AnimatePresence>
                {showUpload && (
                    <UploadModal
                        onClose={() => setShowUpload(false)}
                        onUploaded={() => { }}
                        user={user}
                        profile={profile}
                    />
                )}
            </AnimatePresence>

            {/* ── Lightbox ── */}
            <AnimatePresence>
                {lightbox !== null && (
                    <Lightbox
                        images={filtered}
                        index={lightbox}
                        onClose={() => setLightbox(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default Gallery
