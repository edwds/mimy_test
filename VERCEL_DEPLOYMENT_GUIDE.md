# Vercel 프로덕션 배포 가이드 (JWT 인증 시스템)

이 가이드는 JWT 인증 시스템이 적용된 Mimy 프로젝트를 Vercel에 배포하는 단계별 절차입니다.

---

## 📋 사전 준비

- Vercel 계정 (https://vercel.com)
- 프로젝트가 GitHub에 푸시되어 있어야 함
- 터미널 접근 권한 (키 생성용)

---

## 🔑 1단계: 프로덕션용 JWT 시크릿 키 생성

### 왜 새로운 키가 필요한가?

- 개발 환경과 프로덕션 환경의 키는 **반드시 달라야** 합니다
- 개발 키가 노출되어도 프로덕션 보안에 영향을 주지 않습니다
- `.env` 파일의 키는 절대 프로덕션에서 사용하면 안 됩니다

### 키 생성 방법

**macOS/Linux (현재 환경):**

터미널을 열고 다음 명령어를 **두 번** 실행하세요:

```bash
# 첫 번째 실행 - JWT_SECRET
openssl rand -base64 64

# 두 번째 실행 - JWT_REFRESH_SECRET (다른 값이어야 함)
openssl rand -base64 64
```

**Windows (Git Bash 또는 WSL):**

```bash
# 동일한 명령어 사용
openssl rand -base64 64
openssl rand -base64 64
```

**Node.js가 있는 경우 (모든 OS):**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**온라인 도구 (비추천 - 보안상 로컬 생성 권장):**

- https://generate-secret.vercel.app/64

### 생성된 키 저장하기

생성된 두 개의 키를 **안전한 곳에 복사**해두세요:

```
JWT_SECRET (예시):
V0ZVCk/y6Qn3Oe5QkGA2jMVZJLQdQ72Ion9PFYpMShyQzhxOmDuyrWcwoq7POh7tlNjIj67Z8SmByn3iFd3Mow==

JWT_REFRESH_SECRET (예시):
Pn1zt5v9/kQuSIa3KGtJzQl/HSuDrqFOsoF/JmO/snIVV98Z70fa1xChz6jG/9t28sGFp6j08yBkvdvRSXYMEQ==
```

⚠️ **중요:**
- 두 키는 반드시 **서로 달라야** 합니다
- 이 키는 **절대 Git에 커밋하지 마세요**
- 안전한 비밀번호 관리자 (1Password, LastPass 등)에 저장하세요

---

## 🌐 2단계: Vercel 환경 변수 설정

### 2-1. Vercel Dashboard 접속

1. https://vercel.com 접속
2. 로그인
3. **mimy_test** 프로젝트 선택
4. 상단 메뉴에서 **Settings** 클릭

### 2-2. Environment Variables 메뉴 이동

1. 왼쪽 사이드바에서 **Environment Variables** 클릭
2. "Add New" 버튼 클릭 준비

### 2-3. JWT 시크릿 키 추가

#### 첫 번째 변수: JWT_SECRET

**입력 필드:**
```
Name:  JWT_SECRET
Value: [1단계에서 생성한 첫 번째 키를 붙여넣기]
```

**Environment 선택:**
- ✅ Production (체크)
- ✅ Preview (체크)
- ⬜ Development (체크 해제 - 로컬에서만 사용)

**"Add" 버튼 클릭**

#### 두 번째 변수: JWT_REFRESH_SECRET

**입력 필드:**
```
Name:  JWT_REFRESH_SECRET
Value: [1단계에서 생성한 두 번째 키를 붙여넣기]
```

**Environment 선택:**
- ✅ Production (체크)
- ✅ Preview (체크)
- ⬜ Development (체크 해제)

**"Add" 버튼 클릭**

### 2-4. 기타 필수 환경 변수 추가/확인

다음 변수들이 이미 설정되어 있는지 확인하고, 없다면 추가하세요:

#### NODE_ENV
```
Name:  NODE_ENV
Value: production
Environments: Production, Preview
```

#### CORS 설정 (선택사항 - 필요시)
```
Name:  CORS_ORIGIN_PROD
Value: https://mimytest.vercel.app,https://www.mimytest.vercel.app
Environments: Production
```

#### Google OAuth (이미 있어야 함)
```
Name:  VITE_GOOGLE_CLIENT_ID
Value: [기존 값 확인]
Environments: Production, Preview, Development
```

#### Database (이미 있어야 함)
```
Name:  DATABASE_URL
Value: [기존 Neon PostgreSQL URL]
Environments: Production, Preview
```

#### Redis (이미 있어야 함)
```
Name:  KV_REST_API_TOKEN
Value: [기존 Upstash 토큰]
Environments: Production, Preview
```

### 2-5. 환경 변수 확인 스크린샷

설정 완료 후 Environment Variables 페이지에 다음 변수들이 보여야 합니다:

```
✅ JWT_SECRET                    (Production, Preview)
✅ JWT_REFRESH_SECRET            (Production, Preview)
✅ NODE_ENV                      (Production, Preview)
✅ DATABASE_URL                  (Production, Preview)
✅ KV_REST_API_TOKEN            (Production, Preview)
✅ KV_REST_API_URL              (Production, Preview)
✅ BLOB_READ_WRITE_TOKEN        (Production, Preview)
✅ VITE_GOOGLE_CLIENT_ID        (All)
✅ GOOGLE_MAPS_API_KEY          (All)
✅ VITE_MAPTILER_API_KEY        (All)
```

---

## 📦 3단계: 코드 커밋 및 배포

### 3-1. 변경사항 확인

터미널에서 변경된 파일 확인:

```bash
git status
```

다음 파일들이 변경/추가되었어야 합니다:
- `server/utils/jwt.ts` (신규)
- `server/middleware/auth.ts` (신규)
- `server/routes/auth.ts` (수정)
- `server/routes/content.ts` (수정)
- `server/routes/shops.ts` (수정)
- `server/routes/ranking.ts` (수정)
- `server/routes/users.ts` (수정)
- `server/index.ts` (수정)
- `src/context/UserContext.tsx` (수정)
- `src/services/*.ts` (수정)
- `src/screens/auth/LoginPage.tsx` (수정)
- `src/screens/register/OtpStep.tsx` (수정)
- `package.json` (수정 - 새 의존성)
- `package-lock.json` (수정)
- `.env.example` (신규)
- `JWT_AUTH_SETUP.md` (신규)
- `VERCEL_DEPLOYMENT_GUIDE.md` (신규)

### 3-2. .env 파일 제외 확인

⚠️ **중요:** `.env` 파일이 Git에 추가되지 않도록 확인:

```bash
# .gitignore 확인
cat .gitignore | grep .env
```

출력에 `.env`가 있어야 합니다. 없다면 추가:

```bash
echo ".env" >> .gitignore
```

### 3-3. 변경사항 스테이징

```bash
# 모든 변경사항 추가
git add .

# 또는 개별 파일 추가
git add server/ src/ package.json package-lock.json .env.example *.md
```

### 3-4. 커밋

```bash
git commit -m "feat: implement JWT-based authentication system with email restriction

- Add JWT token generation and verification utilities
- Implement requireAuth and optionalAuth middleware
- Update all protected routes to use JWT authentication
- Remove insecure x-user-id header pattern
- Add @catchtable.co.kr email domain restriction
- Fix OTP verification code to 260130 for development
- Update frontend to use HttpOnly cookies
- Add comprehensive setup documentation

Security improvements:
- HttpOnly cookies prevent XSS attacks
- JWT tokens with 15min access and 7day refresh
- CORS whitelist with credentials support
- Dual-mode support for smooth migration

Breaking changes:
- Users must re-login after deployment
- Only @catchtable.co.kr emails can register/login"
```

### 3-5. GitHub에 푸시

```bash
git push origin main
```

### 3-6. Vercel 자동 배포 확인

1. GitHub 푸시 후 Vercel이 자동으로 배포를 시작합니다
2. Vercel Dashboard에서 **Deployments** 탭 확인
3. 진행 상황 모니터링 (보통 2-3분 소요)

**배포 로그에서 확인할 것:**
- ✅ Build 성공
- ✅ 환경 변수 로드 확인
- ✅ TypeScript 컴파일 성공
- ✅ Deployment 성공

---

## ✅ 4단계: 배포 검증

### 4-1. 프로덕션 URL 접속

배포가 완료되면 Vercel이 제공하는 URL로 접속:
```
https://mimytest.vercel.app
```

### 4-2. JWT 인증 테스트

#### 테스트 1: 이메일 제한 확인

1. "Sign in with Google" 클릭
2. **@catchtable.co.kr가 아닌 이메일**로 시도
3. 예상 결과: ❌ "Only @catchtable.co.kr email addresses are allowed" 에러 메시지

#### 테스트 2: 정상 로그인

1. "Sign in with Google" 클릭
2. **@catchtable.co.kr 이메일**로 로그인
3. OTP 입력: **260130**
4. 예상 결과: ✅ 로그인 성공, /main으로 리다이렉트

#### 테스트 3: JWT 쿠키 확인

1. 브라우저 DevTools 열기 (F12 또는 Cmd+Opt+I)
2. **Application** 탭 → **Cookies** → https://mimytest.vercel.app
3. 확인할 쿠키:
   - ✅ `access_token` 존재
   - ✅ `refresh_token` 존재
   - ✅ HttpOnly: ✓ (체크되어 있어야 함)
   - ✅ Secure: ✓ (HTTPS에서 체크되어 있어야 함)
   - ✅ SameSite: Lax

#### 테스트 4: 인증이 필요한 기능 테스트

로그인 후 다음 기능들이 정상 작동하는지 확인:
- ✅ 리뷰 작성
- ✅ 콘텐츠 좋아요/좋아요 취소
- ✅ 댓글 작성
- ✅ 사용자 팔로우
- ✅ 맛집 저장

#### 테스트 5: 세션 지속성

1. 페이지 새로고침 (F5 또는 Cmd+R)
2. 예상 결과: ✅ 로그인 상태 유지

#### 테스트 6: 로그아웃

1. 프로필 → 로그아웃 클릭
2. 예상 결과:
   - ✅ /start 페이지로 리다이렉트
   - ✅ 쿠키 삭제 확인 (Application 탭에서)

---

## 🔍 5단계: 트러블슈팅

### 문제 1: "JWT_SECRET must be set" 에러

**원인:** Vercel 환경 변수가 설정되지 않음

**해결:**
1. Vercel Dashboard → Settings → Environment Variables
2. `JWT_SECRET`와 `JWT_REFRESH_SECRET`이 **Production**과 **Preview**에 체크되어 있는지 확인
3. 변경 후 재배포: Vercel Dashboard → Deployments → 최신 배포 → "Redeploy" 버튼

### 문제 2: CORS 에러

**원인:** CORS 설정이 프로덕션 URL과 맞지 않음

**해결:**
1. `server/index.ts` 파일의 CORS 설정 확인:
   ```typescript
   origin: process.env.NODE_ENV === 'production'
       ? ['https://mimytest.vercel.app', 'https://www.mimytest.vercel.app']
       : ['http://localhost:5173', 'http://localhost:3000']
   ```
2. URL이 실제 Vercel 도메인과 일치하는지 확인
3. 커밋 후 재배포

### 문제 3: 쿠키가 설정되지 않음

**원인:** SameSite 또는 Secure 설정 문제

**확인사항:**
1. HTTPS로 접속하는지 확인 (http:// X, https:// O)
2. 브라우저 콘솔에서 쿠키 관련 경고 확인
3. Vercel 배포 로그에서 에러 확인

**해결:**
```typescript
// server/routes/auth.ts에서
res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // 프로덕션에서 true
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
});
```

### 문제 4: 기존 사용자가 로그인할 수 없음

**원인:** localStorage에 저장된 이전 세션 데이터

**해결:**
사용자에게 안내:
1. 브라우저 쿠키 삭제
2. 또는 시크릿/프라이빗 모드에서 접속
3. 다시 로그인

### 문제 5: 배포는 성공했지만 런타임 에러

**확인:**
1. Vercel Dashboard → 프로젝트 → Logs
2. Runtime Logs에서 에러 메시지 확인
3. 일반적인 원인:
   - 환경 변수 오타
   - 데이터베이스 연결 실패
   - Redis 연결 실패

---

## 📊 6단계: 모니터링

### Vercel 대시보드에서 모니터링

**체크할 지표:**
- **Deployments**: 배포 성공률
- **Logs**: Runtime 에러 로그
- **Analytics**: 사용자 트래픽 (유료 플랜)

### 로그 확인 방법

```bash
# Vercel CLI 설치 (선택사항)
npm install -g vercel

# 로그인
vercel login

# 실시간 로그 확인
vercel logs --follow
```

### 일반적인 로그 패턴

**정상 로그:**
```
[POST] /api/auth/google - 200 OK
[GET] /api/auth/me - 200 OK
[POST] /api/content - 201 Created
```

**에러 로그:**
```
[ERROR] JWT_SECRET must be set
[401] Authentication required
[403] Only @catchtable.co.kr emails allowed
```

---

## 🔒 보안 체크리스트

배포 후 다음 항목들을 확인하세요:

- ✅ `.env` 파일이 Git에 커밋되지 않았는가?
- ✅ JWT_SECRET이 프로덕션용 값으로 설정되었는가?
- ✅ JWT_REFRESH_SECRET이 JWT_SECRET과 다른가?
- ✅ 쿠키가 HttpOnly로 설정되었는가?
- ✅ HTTPS로만 접속되는가?
- ✅ @catchtable.co.kr 이메일만 허용되는가?
- ✅ 로그에서 민감한 정보가 출력되지 않는가?

---

## 📞 배포 후 지원

### 이슈 발생 시 체크리스트

1. Vercel Logs 확인
2. 브라우저 Console 에러 확인
3. Network 탭에서 API 응답 확인
4. 환경 변수 설정 재확인
5. 로컬에서 동일한 에러 재현 가능한지 확인

### 긴급 롤백

문제가 해결되지 않으면 이전 버전으로 롤백:

1. Vercel Dashboard → Deployments
2. 이전 성공한 배포 선택
3. "⋯" 메뉴 → "Promote to Production"

---

## 🎉 배포 완료!

모든 테스트가 통과하면 JWT 인증 시스템 배포가 완료되었습니다.

**다음 단계:**
- 사용자에게 재로그인 안내
- 2주 후 dual-mode 제거 (x-user-id 지원 중단)
- JWT 시크릿 키를 안전한 곳에 백업

---

**작성일:** 2026-01-28
**버전:** 1.0
**문의:** Vercel 대시보드 또는 프로젝트 이슈 트래커
