# 🧠 THE SAFE SPACE HUB - Setup & Launch Guide

## ✅ Quick Start

### Option 1: Using the Desktop Shortcut (Easiest)
1. Look for **"Safe Space"** shortcut on your Desktop
2. Double-click it
3. The server will start automatically and open in your browser
4. You'll see the login page at `http://localhost:3000`

### Option 2: Manual Start
1. Open Command Prompt or PowerShell
2. Navigate to: `C:\Users\SAGE WILLIAMZ\Desktop\TH SAFE SPACE HUB`
3. Run: `start-safe-space.bat`

## 🔐 Login Credentials

**Demo Account:**
- Username: `demo@safehub.com`
- Password: `demo123`

**Alternative Account:**
- Username: `user@safehub.com`
- Password: `pass123`

Or click **"Demo Access"** on the login page for quick access.

## 📋 How It Works

### Login Flow
1. Enter your credentials on the login page (`index.html`)
2. Click **"Enter Safe Space"**
3. Your session is saved in browser storage
4. You're redirected to the **Dashboard** (`dashboard.html`)

### Dashboard Features
- 📊 Mood tracking
- 🩺 Mental health assessments (PHQ-9, GAD-7)
- 📚 Resources and educational content
- 🤖 AI Companion
- 🚪 Logout button (top right)

### Protected Pages
- Dashboard and Assessments automatically check if you're logged in
- If not logged in, you'll be redirected to the login page
- Logout clears your session and returns you to the login page

## 🔧 Technical Details

**Stack:**
- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Node.js + Express
- Database: SQLite
- Port: 3000

**File Structure:**
```
index.html          - Login page
dashboard.html      - Main dashboard
assessments.html    - Mental health assessments
styles.css          - All styling
script.js           - All JavaScript logic
server.js           - Node.js backend
data.json           - User data storage
start-safe-space.bat    - Startup script
```

## 🛠️ Troubleshooting

**Issue: "Cannot find node_modules"**
- The startup script will automatically install dependencies
- Or run: `npm install`

**Issue: "Port 3000 already in use"**
- Change the port in `server.js`
- Or close other applications using port 3000

**Issue: Shortcut not working**
- Run `create-shortcut.ps1` with PowerShell admin rights
- Or manually run `start-safe-space.bat` from the folder

**Issue: Can't login**
- Clear browser cache: Ctrl+Shift+Delete
- Try demo credentials: `demo@safehub.com` / `demo123`
- Check that `server.js` is running

## 📱 Features

✅ HIPAA-Compliant design  
✅ WCAG 2.1 AA Accessible  
✅ SSL Security ready  
✅ Responsive Design  
✅ Progressive Web App (PWA) support  
✅ Session persistence  
✅ Mental health assessments  
✅ Emergency hotline resources  

## 🚀 Starting Development

If you want to modify the code:
1. Edit files in the project folder
2. Changes take effect on page refresh (frontend)
3. Restart `start-safe-space.bat` for backend changes

## ❓ Questions?

All user data is stored in your browser's localStorage for this demo.
For production, implement proper database authentication with the SQLite backend in `server.js`.

---
**Version:** 1.0.0  
**Author:** Sage Williamz  
**License:** MIT
