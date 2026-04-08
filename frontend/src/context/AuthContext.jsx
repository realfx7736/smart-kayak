import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth'
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore'

const AuthContext = createContext({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
})

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async (uid, email) => {
        try {
            const docRef = doc(db, 'users', uid)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
                setProfile(docSnap.data())
            } else {
                // If doc doesn't exist, create it (Auto Sync Step 5)
                const newProfile = {
                    uid,
                    email,
                    name: email?.split('@')[0],
                    role: email === 'admin@smartkuttanad.com' ? 'admin' : 'user',
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                }
                await setDoc(docRef, newProfile)
                setProfile(newProfile)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    useEffect(() => {
        if (!auth) {
            setLoading(false)
            return
        }
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser)
            if (currentUser) {
                await fetchProfile(currentUser.uid, currentUser.email)
            } else {
                setProfile(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const signOut = async () => {
        await firebaseSignOut(auth)
        setUser(null)
        setProfile(null)
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
