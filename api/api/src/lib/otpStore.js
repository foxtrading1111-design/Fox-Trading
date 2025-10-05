// Shared OTP store for deposit verification
// In production, this should use Redis or a database table

class OTPStore {
    constructor() {
        this.store = new Map();
    }

    set(userId, otpData) {
        this.store.set(userId, otpData);
    }

    get(userId) {
        return this.store.get(userId);
    }

    delete(userId) {
        this.store.delete(userId);
    }

    // Clean up expired OTPs
    cleanup() {
        const now = new Date();
        for (const [userId, otpData] of this.store.entries()) {
            if (now > otpData.expiresAt) {
                this.store.delete(userId);
            }
        }
    }
}

// Create a singleton instance
const otpStore = new OTPStore();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
    otpStore.cleanup();
}, 5 * 60 * 1000);

export default otpStore;