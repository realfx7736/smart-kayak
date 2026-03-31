import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const createRazorpayOrder = async (packageId, amount) => {
    const { data } = await axios.post(`${API_URL}/api/create-order`, {
        package_id: packageId,
        amount: amount
    })
    return data
}

export const verifyPayment = async (paymentData, bookingDetails) => {
    const { data } = await axios.post(`${API_URL}/api/verify-payment`, {
        ...paymentData,
        booking_details: bookingDetails
    })
    return data
}

export const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}
