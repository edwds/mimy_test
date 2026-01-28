# JWT Authentication Setup Guide

This guide covers the setup of JWT-based authentication for the Mimy project.

## 🔒 Security Improvements

The new JWT-based authentication system replaces the insecure localStorage-based authentication with:

- **HttpOnly Cookies**: Tokens stored in secure cookies, protected from XSS attacks
- **JWT Tokens**: Signed tokens with expiration (Access: 15min, Refresh: 7 days)
- **Email Restriction**: Only @catchtable.co.kr domain emails allowed
- **Fixed OTP**: Development OTP set to `260130` for testing convenience
- **CORS Protection**: Whitelisted origins with credentials support

---

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database (Neon)
- Redis (Upstash)
- Vercel Blob Storage account

---

## 🚀 Local Development Setup

### 1. Generate JWT Secrets

Generate two different secure random strings for JWT secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate JWT_REFRESH_SECRET (must be different)
openssl rand -base64 64
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

**Required JWT variables:**
```env
JWT_SECRET=<your-64-char-random-string>
JWT_REFRESH_SECRET=<different-64-char-random-string>
```

**Local development:**
```env
NODE_ENV=development
PORT=3001
VITE_API_BASE_URL=http://localhost:3001
CORS_ORIGIN_DEV=http://localhost:5173,http://localhost:3000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

### 5. Start Development Servers

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Test Authentication

1. Navigate to `http://localhost:5173`
2. Click "Sign in with Google"
3. Use a **@catchtable.co.kr** email address
4. For OTP verification during registration, use: **260130**

---

## 🌐 Production Deployment (Vercel)

### 1. Set Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these variables for Production AND Preview environments:**

```env
# JWT Secrets (CRITICAL - use different values than development!)
JWT_SECRET=<production-jwt-secret-64-chars>
JWT_REFRESH_SECRET=<production-refresh-secret-64-chars>

# Node Environment
NODE_ENV=production

# CORS
CORS_ORIGIN_PROD=https://your-domain.vercel.app,https://www.your-domain.vercel.app

# Database, Redis, Storage (copy from existing Vercel project)
DATABASE_URL=...
KV_REST_API_TOKEN=...
BLOB_READ_WRITE_TOKEN=...

# Google OAuth (same as development)
VITE_GOOGLE_CLIENT_ID=...
GOOGLE_MAPS_API_KEY=...
```

### 2. Deploy

```bash
git push origin main
# Vercel will automatically deploy
```

### 3. Verify Production

1. Visit your production URL
2. Test Google login with @catchtable.co.kr email
3. Check browser DevTools → Application → Cookies
   - Should see `access_token` and `refresh_token` cookies
   - Both should be marked as `HttpOnly` and `Secure`

---

## 🔍 Testing Checklist

### Authentication Flow
- [ ] Google login works with @catchtable.co.kr email
- [ ] Login fails with non-@catchtable.co.kr email (shows error)
- [ ] OTP verification accepts `260130`
- [ ] JWT cookies are set on successful login
- [ ] Page refresh maintains login state
- [ ] Logout clears cookies and redirects to `/start`

### Protected Endpoints
- [ ] Creating content requires authentication
- [ ] Liking/unliking requires authentication
- [ ] Following users requires authentication
- [ ] Saving shops requires authentication
- [ ] Ranking operations require authentication

### Security
- [ ] Cookies are HttpOnly (not accessible from JavaScript)
- [ ] Cookies are Secure in production (HTTPS only)
- [ ] CORS only allows whitelisted origins
- [ ] Cannot access protected endpoints without valid JWT
- [ ] Cannot impersonate other users

---

## 🛠️ Troubleshooting

### "Authentication required" errors

**Problem:** API returns 401 errors after login.

**Solution:**
- Check that cookies are being sent: DevTools → Network → Request Headers should show `Cookie: access_token=...`
- Verify `credentials: 'include'` is set in all fetch calls
- Ensure CORS origin matches your frontend URL

### Cookies not being set

**Problem:** No cookies appear after login.

**Solution:**
- Check JWT secrets are set in environment variables
- Verify server is not throwing JWT generation errors (check server logs)
- Ensure `res.cookie()` calls in `server/routes/auth.ts` are executed
- Check SameSite and Secure settings match your environment

### CORS errors

**Problem:** "CORS policy: Credentials flag is 'true', but the 'Access-Control-Allow-Credentials' header is ''..."

**Solution:**
- Verify `credentials: true` in CORS config (`server/index.ts`)
- Ensure frontend origin is in CORS whitelist
- Check that API requests include `credentials: 'include'`

### Email restriction not working

**Problem:** Non-@catchtable.co.kr emails can log in.

**Solution:**
- Check `server/routes/auth.ts` has email domain validation
- Verify validation happens BEFORE JWT token generation
- Test with curl: `curl -X POST http://localhost:3001/api/auth/google -H "Content-Type: application/json" -d '{"token":"test"}'`

### OTP not accepting 260130

**Problem:** Fixed OTP code doesn't work.

**Solution:**
- Check `src/screens/register/OtpStep.tsx` has `FIXED_OTP = "260130"`
- Verify string comparison (not numeric)
- Check for typos in the code

---

## 🔐 Security Best Practices

### For Development
- ✅ Use `.env` file for secrets (already in `.gitignore`)
- ✅ Fixed OTP is okay for development only
- ✅ Use different JWT secrets than production

### For Production
- 🔴 **NEVER** commit JWT secrets to git
- 🔴 **NEVER** use development secrets in production
- 🔴 **NEVER** skip the email domain check
- ✅ Use strong, unique JWT secrets (64+ chars)
- ✅ Enable HTTPS (automatic on Vercel)
- ✅ Monitor for suspicious login attempts
- ✅ Rotate JWT secrets periodically

---

## 📊 Monitoring

### Useful Logs

**Backend (server console):**
- `[DEPRECATED] x-user-id header used` - Old auth method still in use (dual-mode)
- JWT verification errors - Check token expiration

**Frontend (browser console):**
- Network errors (401/403) - Authentication failures
- Cookie warnings - SameSite/Secure issues

### Vercel Logs

Check Vercel Dashboard → Your Project → Logs for:
- Login failures
- JWT generation errors
- CORS rejections

---

## 🔄 Migration Strategy

The system currently supports **dual-mode authentication** for 2 weeks:

1. **Week 1-2:** Both JWT cookies AND x-user-id headers work
2. **Week 3:** Remove x-user-id support from middleware
3. **Week 4:** Force all users to re-login with JWT

To disable dual-mode early, remove the `x-user-id` fallback in:
- `server/middleware/auth.ts` (lines with `x-user-id`)

---

## 📚 Related Files

### Backend
- `server/utils/jwt.ts` - JWT generation/verification
- `server/middleware/auth.ts` - Authentication middleware
- `server/routes/auth.ts` - Login/register/logout endpoints
- `server/index.ts` - CORS and cookie-parser setup

### Frontend
- `src/context/UserContext.tsx` - User state management
- `src/services/UserService.ts` - User API calls
- `src/services/ContentService.ts` - Content API calls
- `src/services/ShopService.ts` - Shop API calls
- `src/services/RankingService.ts` - Ranking API calls
- `src/screens/auth/LoginPage.tsx` - Login UI
- `src/screens/register/OtpStep.tsx` - OTP verification

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs for errors
3. Test with curl to isolate frontend vs backend issues
4. Check Vercel deployment logs

---

**Last Updated:** 2026-01-28
**Version:** 1.0
**Author:** Claude Code (Sonnet 4.5)
