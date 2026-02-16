# 🔐 Authentication Setup Guide - Supabase + Prisma + NextAuth.js

## ✅ What's Been Set Up

Your authentication system is now ready with:
- ✅ Prisma ORM with complete database schema
- ✅ NextAuth.js for authentication
- ✅ Supabase PostgreSQL database integration
- ✅ Beautiful login & register pages
- ✅ Password hashing with bcrypt
- ✅ Session management
- ✅ OAuth support (Google & GitHub)

---

## 🚀 STEP-BY-STEP SETUP

### **Step 1: Create Supabase Project**

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** (sign up if needed)
3. Click **"New Project"**
4. Fill in:
   - **Name**: `code-zone` (or any name)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
   - **Plan**: Free tier is perfect
5. Click **"Create new project"** (takes ~2 minutes)

---

### **Step 2: Get Database Connection String**

1. In your Supabase dashboard, go to:
   - **Project Settings** (⚙️ icon bottom left)
   - **Database** (left sidebar)
   - Scroll to **Connection String**
   - Select **URI** tab
   - Copy the connection string (looks like this):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

## 🤖 AI Mentor (Groq - free)

The app includes an event-based DSA mentor that **never sees your code** and uses an LLM **only to rephrase** preset coaching questions.

Set these env vars in `.env.local`:

```env
LLM_PROVIDER="groq"
GROQ_API_KEY="your_groq_key_here"
# Optional overrides
# GROQ_MODEL="llama-3.1-8b-instant"
# GROQ_BASE_URL="https://api.groq.com/openai/v1"
```

If you prefer OpenAI instead:

```env
LLM_PROVIDER="openai"
OPENAI_API_KEY="your_openai_key_here"
# Optional overrides
# OPENAI_MODEL="gpt-4o-mini"
# OPENAI_BASE_URL="https://api.openai.com/v1"
```

2. **Important**: Replace `[YOUR-PASSWORD]` with the database password you created!

---

### **Step 3: Update Environment Variables**

1. Open `.env.local` in your project root
2. Replace the `DATABASE_URL` with your Supabase connection string:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
   ```

3. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   # Run this command in your terminal:
   openssl rand -base64 32
   ```
   Or use an online generator: https://generate-secret.vercel.app/32

4. Update `.env.local`:
   ```env
   NEXTAUTH_SECRET="your-generated-secret-here"
   ```

---

### **Step 4: Run Prisma Migrations**

This creates all the database tables:

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma db push
```

You should see output like:
```
✔ Generated Prisma Client
✔ Database synchronized with Prisma schema
```

---

### **Step 5: Verify Database Setup**

Open Prisma Studio to see your database:
```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables (users, sessions, problems, etc.)
- Add/edit data manually
- Verify everything is working

---

## 🧪 **Step 6: Test Authentication**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to register page:**
   ```
   http://localhost:3000/auth/register
   ```

3. **Create a test account:**
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123`
   - Click **"Create Account"**

4. **Login:**
   - Go to: `http://localhost:3000/auth/login`
   - Enter your credentials
   - Click **"Sign In"**

5. **Check Prisma Studio:**
   - You should see your user in the database!

---

## 📁 **Project Structure**

```
your-project/
├── prisma/
│   └── schema.prisma          # Complete database schema
├── lib/
│   ├── prisma.ts              # Prisma client instance
│   └── auth.ts                # NextAuth configuration
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts   # NextAuth API handler
│   │   │   └── register/
│   │   │       └── route.ts   # Registration endpoint
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx       # Login page
│   │   └── register/
│   │       └── page.tsx       # Register page
└── .env.local                 # Environment variables
```

---

## 🎨 **Database Schema Overview**

Your database includes these tables:

### **Authentication Tables:**
- `users` - User accounts with stats, XP, streaks
- `accounts` - OAuth account connections
- `sessions` - Active user sessions
- `verification_tokens` - Email verification

### **Problem Tables:**
- `problems` - Coding problems
- `problem_patterns` - Problem categories (Two Pointers, etc.)
- `problem_examples` - Example inputs/outputs
- `test_cases` - Test cases for problems
- `starter_code` - Code templates per language

### **Progress Tracking:**
- `submissions` - User code submissions
- `user_problem_status` - Solved/attempted problems
- `user_streaks` - Daily activity tracking
- `bookmarks` - Saved problems

### **Social Features:**
- `posts` - User posts with code snippets
- `comments` - Post comments
- `follows` - User follow relationships
- `discussions` - Problem discussions

### **Gamification:**
- `badges` - Achievement badges
- `user_badges` - Earned badges per user
- `study_plans` - Learning paths
- `notifications` - User notifications

---

## 🔒 **Security Features**

✅ **Password Security:**
- Passwords hashed with bcrypt (10 rounds)
- Never stored in plain text

✅ **Session Management:**
- JWT-based sessions
- Secure HTTP-only cookies
- Automatic expiration

✅ **CSRF Protection:**
- Built into NextAuth.js

✅ **SQL Injection Prevention:**
- Prisma ORM parameterizes all queries

---

## 🔌 **OAuth Setup (Optional)**

### **Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google+ API**
4. Create **OAuth 2.0 Client ID**:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID & Secret to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

### **GitHub OAuth:**

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - Application name: `code.zone`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click **"Register application"**
5. Generate a client secret
6. Copy to `.env.local`:
   ```env
   GITHUB_CLIENT_ID="your-client-id"
   GITHUB_CLIENT_SECRET="your-client-secret"
   ```

---

## 📡 **API Endpoints Available**

### **Authentication:**
```typescript
POST   /api/auth/register         // Create new user
POST   /api/auth/signin           // Login (handled by NextAuth)
POST   /api/auth/signout          // Logout
GET    /api/auth/session          // Get current session
```

### **Usage Example:**
```typescript
// In your components:
import { useSession, signIn, signOut } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  
  if (session) {
    return (
      <div>
        Logged in as {session.user.email}
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }
  
  return <button onClick={() => signIn()}>Sign in</button>;
}
```

---

## 🛡️ **Protected Routes**

Create middleware for protected pages:

```typescript
// middleware.ts (create in root)
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/profile/:path*', '/problems/:path*']
};
```

---

## 🎯 **Next Steps**

1. ✅ **Authentication is complete!**
2. 🔜 **Create user profile management API**
3. 🔜 **Add problem submission tracking**
4. 🔜 **Implement leaderboard system**
5. 🔜 **Build social feed features**

---

## 🐛 **Troubleshooting**

### **Error: "Prisma Client not found"**
```bash
npx prisma generate
```

### **Error: "Can't connect to database"**
- Check your `DATABASE_URL` in `.env.local`
- Verify password is correct (no special characters need escaping)
- Ensure Supabase project is running

### **Error: "NEXTAUTH_SECRET is not set"**
- Generate a secret: `openssl rand -base64 32`
- Add to `.env.local`

### **Error: "Module not found: @prisma/client"**
```bash
npm install @prisma/client
npx prisma generate
```

### **Tables not created:**
```bash
npx prisma db push --force-reset
```
⚠️ Warning: This deletes all data!

---

## 📚 **Useful Commands**

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name init

# Open Prisma Studio
npx prisma studio

# Reset database (careful!)
npx prisma db push --force-reset

# View database in browser
npx prisma studio
```

---

## 🎉 **You're All Set!**

Your authentication system is production-ready with:
- ✅ Secure password hashing
- ✅ Session management
- ✅ OAuth support (Google/GitHub)
- ✅ Beautiful UI
- ✅ Complete database schema
- ✅ Type-safe queries with Prisma

**Test the authentication:**
1. Go to `http://localhost:3000/auth/register`
2. Create an account
3. Login at `http://localhost:3000/auth/login`
4. Start building features! 🚀

---

## 📞 **Need Help?**

- Supabase Docs: https://supabase.com/docs
- Prisma Docs: https://www.prisma.io/docs
- NextAuth.js Docs: https://next-auth.js.org/getting-started/introduction

---

## 🔥 **What to Build Next?**

1. **User Profile Management** - Edit profile, upload avatar
2. **Problem Submission System** - Save user submissions
3. **Progress Tracking** - Track solved problems, streaks
4. **Leaderboard** - Real-time rankings
5. **Social Feed** - Posts, comments, likes
6. **Notifications** - Real-time updates

Ready to implement any of these! Just let me know! 🚀
