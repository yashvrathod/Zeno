# 🚀 QUICK START - Get Authentication Running in 5 Minutes!

## ⚡ Super Fast Setup

### **1. Create Supabase Database (2 minutes)**

1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. Click **"New Project"**
3. Enter:
   - Name: `code-zone`
   - Password: (create & SAVE IT!) 
   - Region: Choose closest
4. Click **"Create project"** (wait ~2 min)

---

### **2. Get Database URL (30 seconds)**

1. In Supabase dashboard:
   - Click **Settings** (⚙️ icon) → **Database**
   - Find **"Connection String"** section
   - Click **"URI"** tab
   - Copy the URL (looks like: `postgresql://postgres:...`)

2. **IMPORTANT:** Replace `[YOUR-PASSWORD]` in the URL with your actual password!

---

### **3. Update .env.local (30 seconds)**

Add Groq (free) AI mentor config (optional but recommended):

```env
# Use Groq for the mentor rephrase-only LLM
LLM_PROVIDER="groq"
GROQ_API_KEY="your_groq_key_here"
# Optional overrides
# GROQ_MODEL="llama-3.1-8b-instant"
# GROQ_BASE_URL="https://api.groq.com/openai/v1"
```


Open `.env.local` and replace:

```env
DATABASE_URL="postgresql://postgres:YOUR_REAL_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

Generate a secret key:
```bash
# Run this in terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Update:
```env
NEXTAUTH_SECRET="paste-your-generated-secret-here"
```

---

### **4. Create Database Tables (1 minute)**

Run these commands:

```bash
# Install dependencies (if not done)
npm install

# Generate Prisma Client
npx prisma generate

# Create all tables
npx prisma db push
```

You should see: `✔ Database synchronized with Prisma schema`

---

### **5. Start & Test (1 minute)**

```bash
# Start the app
npm run dev
```

**Test it:**
1. Go to: `http://localhost:3000/auth/register`
2. Create account:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123`
3. Login at: `http://localhost:3000/auth/login`

🎉 **Done! Authentication is working!**

---

## 🔍 Verify Everything Works

```bash
# Open database viewer
npx prisma studio
```

Opens at `http://localhost:5555` - you'll see your user in the database!

---

## 🎯 What You Got

✅ **Complete Authentication System:**
- Login/Register pages
- Password hashing (bcrypt)
- Session management
- JWT tokens
- Protected routes

✅ **Complete Database:**
- 30+ tables ready to use
- Users, problems, submissions
- Social features (posts, follows)
- Leaderboard, badges, streaks

✅ **Production Ready:**
- Secure password storage
- SQL injection protection
- CSRF protection
- Type-safe queries

---

## ⚠️ Troubleshooting

**Can't connect to database?**
- Check your password in DATABASE_URL (no special characters need escaping)
- Verify Supabase project is active

**Prisma errors?**
```bash
npx prisma generate
npx prisma db push
```

**Port already in use?**
```bash
npm run dev -- -p 3001
```

---

## 📚 Full Documentation

See `AUTHENTICATION_SETUP.md` for:
- OAuth setup (Google/GitHub)
- API endpoints
- Security features
- Advanced configuration

---

## 🔥 Next: What to Build?

Now that auth is working, you can:
1. **Track user submissions** → Save code submissions to database
2. **Build leaderboard** → Show top users by XP
3. **Add social feed** → Let users post code snippets
4. **Implement streaks** → Track daily activity

**Ready to implement any of these!** Just ask! 🚀
