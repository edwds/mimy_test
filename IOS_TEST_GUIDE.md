# iOS JWT 인증 테스트 가이드

## 📱 iOS에서 JWT 인증 테스트하기

### 준비 사항
- Xcode 설치
- iOS 시뮬레이터 또는 실제 iOS 디바이스
- 코드 변경사항이 배포되어 있어야 함

---

## 🚀 1단계: iOS 앱 빌드

### 프로젝트 빌드
```bash
# 1. 프론트엔드 빌드
npm run build

# 2. Capacitor 동기화 (이미 완료됨)
npx cap sync ios

# 3. Xcode 열기
npx cap open ios
```

### Xcode에서 실행
1. Xcode가 열리면 상단의 디바이스/시뮬레이터 선택
   - iPhone 15 시뮬레이터 권장
   - 또는 실제 디바이스 연결

2. **Play 버튼 (▶️)** 클릭 또는 `Cmd+R`

3. 앱이 시뮬레이터/디바이스에 설치되고 실행됨

---

## ✅ 2단계: 인증 플로우 테스트

### 테스트 시나리오 1: 로그인

1. **앱 시작**
   - "Sign in with Google" 버튼 탭

2. **Google 로그인**
   - @catchtable.co.kr 이메일 선택
   - (시뮬레이터에서는 Google 계정 추가 필요)

3. **OTP 입력**
   - 인증 코드: `260130`

4. **결과 확인**
   - ✅ 메인 화면으로 이동
   - ✅ `/start`로 리다이렉트 안 됨
   - ✅ 프로필 정보 표시됨

### 테스트 시나리오 2: 앱 재시작 (세션 유지)

1. **앱 종료**
   - 홈 버튼으로 나가기
   - 앱 스위처에서 완전 종료

2. **앱 다시 시작**
   - 결과: ✅ 로그인 상태 유지되어야 함

3. **메인 화면에서 확인**
   - ✅ 사용자 프로필 표시
   - ✅ 피드 로드 성공
   - ✅ `/start`로 리다이렉트 안 됨

### 테스트 시나리오 3: 보호된 기능

로그인 후 다음 기능들 테스트:

- ✅ **리뷰 작성**: 새 리뷰 등록
- ✅ **좋아요**: 콘텐츠 좋아요/취소
- ✅ **댓글**: 댓글 작성
- ✅ **팔로우**: 다른 사용자 팔로우
- ✅ **맛집 저장**: 맛집 북마크

### 테스트 시나리오 4: 로그아웃

1. **프로필 → 로그아웃**
2. 결과:
   - ✅ `/start` 화면으로 이동
   - ✅ 토큰 삭제됨 (Preferences)
   - ✅ 다시 로그인 필요

---

## 🔍 3단계: 디버깅

### Xcode Console 로그 확인

앱 실행 중 Xcode 하단 콘솔에서 로그 확인:

**정상 로그:**
```
[TokenStorage] Tokens saved to Preferences
[Login] Tokens saved for native platform
[authFetch] Authorization header added
```

**에러 로그:**
```
Failed to fetch current user
401 Unauthorized
Failed to save tokens
```

### Safari Web Inspector (iOS 디바이스)

실제 iOS 디바이스에서 테스트 시:

1. **Mac Safari → 개발 메뉴 활성화**
   - Safari → 환경설정 → 고급
   - "메뉴 막대에서 개발자용 메뉴 보기" 체크

2. **디바이스 연결 후**
   - 개발 → [디바이스 이름] → Mimy
   - Web Inspector 열림

3. **Console 탭에서 로그 확인**

---

## 🛠️ 4단계: 트러블슈팅

### 문제 1: 여전히 401 에러

**원인:** 토큰이 저장되지 않았거나 Authorization 헤더가 추가되지 않음

**확인:**
```typescript
// Xcode 콘솔에서 로그 확인
[TokenStorage] Tokens saved to Preferences // 이게 보여야 함
[authFetch] Authorization header added       // 이게 보여야 함
```

**해결:**
1. 앱 완전 삭제 후 재설치
2. 로그인 다시 시도

### 문제 2: Google 로그인이 iOS에서 작동 안 함

**원인:** GoogleAuth 플러그인 설정 문제

**확인:**
1. `ios/App/App/GoogleService-Info.plist` 파일 존재 확인
2. CLIENT_ID가 올바른지 확인

**해결:**
```bash
# Capacitor 재동기화
npx cap sync ios

# Xcode에서 Clean Build Folder (Cmd+Shift+K)
# 다시 빌드 (Cmd+R)
```

### 문제 3: 토큰이 저장되지 않음

**원인:** Preferences 권한 문제

**확인:**
```bash
# iOS 시뮬레이터 리셋
xcrun simctl erase all

# 앱 재설치
```

---

## 📊 5단계: 성공 확인 체크리스트

- [ ] iOS에서 @catchtable.co.kr 이메일로 로그인 성공
- [ ] OTP 260130으로 인증 성공
- [ ] 메인 화면 유지 (리다이렉트 안 됨)
- [ ] 앱 재시작 후에도 로그인 유지
- [ ] 리뷰 작성 성공
- [ ] 좋아요/댓글 성공
- [ ] 로그아웃 후 토큰 삭제 확인
- [ ] Xcode 콘솔에 "Tokens saved" 로그 확인

---

## 🌐 웹 vs iOS 비교

| 기능 | 웹 | iOS/Android |
|------|-----|-------------|
| 토큰 저장 | HttpOnly Cookie | Preferences (SecureStorage) |
| 전송 방식 | credentials: 'include' | Authorization: Bearer {token} |
| 만료 시간 | Access: 15분, Refresh: 7일 | 동일 |
| 보안 | XSS 방지 (HttpOnly) | 앱 샌드박스 보호 |

---

## 📝 다음 단계

iOS 테스트 완료 후:
1. Android도 동일하게 작동 (Preferences는 크로스플랫폼)
2. 프로덕션 배포
3. 실제 사용자 테스트

---

**작성일:** 2026-01-28
**버전:** 1.0 (iOS Support)
