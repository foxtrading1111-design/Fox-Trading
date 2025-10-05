# 📱 **QR Code Images Setup**

## 🎯 **Instructions:**

Please add your QR code images to the `public/qr-codes/` folder with these exact names:

### 📁 **File Structure:**
```
frontend/
└── public/
    └── qr-codes/
        ├── bep20-qr.png    ← Your BEP-20 QR code image
        ├── trc20-qr.png    ← Your TRC-20 QR code image
        ├── bep20-qr.svg    ← Placeholder (replace with your PNG)
        └── trc20-qr.svg    ← Placeholder (replace with your PNG)
```

### 🖼️ **File Requirements:**
- **Format**: PNG, JPG, or JPEG
- **Size**: 200x200px to 400x400px (recommended)
- **Names**: Exactly `bep20-qr.png` and `trc20-qr.png`
- **Quality**: High resolution for clear scanning

### 📝 **What to do:**
1. ✅ **Folder already created**: `frontend/public/qr-codes/`
2. ✅ **Placeholders added**: SVG placeholders are working for testing
3. **Replace with your images**:
   - Copy your BEP-20 QR code image as `bep20-qr.png`
   - Copy your TRC-20 QR code image as `trc20-qr.png`
   - Delete the SVG placeholders after adding PNG files

### 🔧 **Code Changes:**
The deposit dialog will automatically use your custom QR codes instead of generated ones once you add the images.

### ✅ **Verification:**
After adding the images, test by:
1. Going to Crypto Deposit page
2. Clicking "Start Deposit"
3. Selecting BEP20 or TRC20 network
4. Verifying your custom QR code appears

---
**Note**: The system will fall back to generated QR codes if your images are not found.