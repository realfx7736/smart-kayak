const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config({ path: '../.env' }); // Adjust if shared .env is in root

// --- 1. Initialize Firebase Admin ---
// Recommended: Download your serviceAccountKey.json from Firebase Console -> Project Settings -> Service accounts
// and set FIREBASE_SERVICE_ACCOUNT_PATH in your .env
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : null;

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    // Fallback for demo: use PROJECT_ID (limited functionality without full cert)
    admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'smart-kayak'
    });
}

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
    key_id: process.env.VITE_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- 2. Razorpay Order Creation ---
app.post('/api/create-order', async (req, res) => {
    try {
        const { packageId, amount } = req.body;
        const options = {
            amount: amount * 100, // INR in paise
            currency: 'INR',
            receipt: `receipt_${packageId}_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ error: 'Order failed' });
    }
});

// --- 3. Firebase Payment Verification ---
app.post('/api/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_details } = req.body;
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        try {
            // 1. Create Booking in Firestore
            const bookingRef = await db.collection('bookings').add({
                userId: booking_details.userId,
                userName: booking_details.userName,
                packageId: booking_details.packageId,
                package: booking_details.package,
                amount: booking_details.amount,
                date: booking_details.date,
                slot: booking_details.slot,
                status: 'paid',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. Create Payment Record
            await db.collection('payments').add({
                bookingId: bookingRef.id,
                userId: booking_details.userId,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                amount: booking_details.amount,
                status: 'captured',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            res.status(200).json({ status: 'success', bookingId: bookingRef.id });
        } catch (error) {
            console.error('Firebase DB Error:', error);
            res.status(500).json({ error: 'Payment verified but database sync failed.' });
        }
    } else {
        res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Secure Server running on port ${PORT}`));
