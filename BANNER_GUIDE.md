# 배너 관리 시스템 가이드

## 개요

홈 피드 상단에 표시되는 배너를 동적으로 관리할 수 있는 시스템입니다. 관리자가 배너를 추가/수정/삭제하고, 다양한 액션을 설정할 수 있습니다.

## 주요 기능

### 1. 배너 타입

#### Action Types
- **write**: 글쓰기 화면으로 이동
- **link**: 외부 URL 열기 (새 탭)
- **navigate**: 앱 내부 라우트로 이동

#### Icon Types
- **pen**: 펜 아이콘
- **user**: 사용자 프로필 사진 + 펜 아이콘
- **custom**: 커스텀 이미지 URL

### 2. 배너 설정 옵션

- **제목**: `{{name}}` 템플릿으로 사용자 이름 동적 삽입 가능
- **설명**: 부제목 (선택사항)
- **배경 그라데이션**: CSS gradient 값
- **표시 순서**: 낮은 숫자가 먼저 표시
- **활성화 여부**: 활성화된 배너만 노출
- **시작일/종료일**: 기간 제한 (선택사항)

## 사용 방법

### 관리자 페이지 접근

1. 앱 실행 후 로그인
2. `/admin` 경로로 이동
3. "Banner Management" 클릭
4. `/admin/banners` 페이지에서 배너 관리

### 배너 생성

1. "새 배너 추가" 버튼 클릭
2. 필수 항목 입력:
   - 제목 (예: `{{name}}님,\n오늘 뭐 먹었어요?`)
   - 액션 타입 선택
3. 선택 항목 입력:
   - 설명
   - 배경 그라데이션 (프리셋 또는 직접 입력)
   - 아이콘 타입
   - 시작일/종료일
4. 미리보기 확인
5. "저장" 클릭

### 배너 수정

1. 배너 목록에서 연필 아이콘 클릭
2. 수정할 내용 변경
3. "저장" 클릭

### 배너 활성화/비활성화

- 배너 목록에서 눈 아이콘 클릭
- 비활성화된 배너는 앱에 표시되지 않음

### 배너 삭제

1. 배너 목록에서 휴지통 아이콘 클릭
2. 확인 대화상자에서 "확인" 클릭

## API 엔드포인트

### 공개 API

```bash
# 활성화된 배너 조회 (날짜 필터 적용)
GET /api/banners
```

### 관리자 API

```bash
# 모든 배너 조회
GET /api/banners/all

# 배너 생성
POST /api/banners
Content-Type: application/json

{
  "title": "{{name}}님,\n오늘 뭐 먹었어요?",
  "description": "간단한 사진 한 장으로\n내 미식 취향을 완성하세요",
  "action_type": "write",
  "action_value": null,
  "background_gradient": "linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)",
  "icon_type": "pen",
  "icon_url": null,
  "is_active": true,
  "display_order": 0,
  "start_date": null,
  "end_date": null
}

# 배너 수정
PATCH /api/banners/:id
Content-Type: application/json

{
  "title": "새로운 제목",
  "is_active": false
}

# 배너 삭제
DELETE /api/banners/:id
```

## 데이터베이스 구조

### banners 테이블

```sql
CREATE TABLE banners (
    id serial PRIMARY KEY,
    title text NOT NULL,
    description text,
    action_type varchar(20) NOT NULL, -- 'write', 'link', 'navigate'
    action_value text, -- URL or route
    background_gradient text DEFAULT 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
    icon_type varchar(20), -- 'pen', 'user', 'custom'
    icon_url text, -- Custom icon URL
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    start_date timestamp,
    end_date timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_banners_active_order ON banners (is_active, display_order);
```

## 배너 표시 로직

### HomeTab.tsx

1. 컴포넌트 마운트 시 `/api/banners` 호출
2. 활성화된 배너들을 `display_order` 순으로 렌더링
3. 제목의 `{{name}}` 템플릿을 현재 사용자 닉네임으로 치환
4. `action_type`에 따라 클릭 이벤트 처리:
   - `write`: `onWrite()` 호출
   - `link`: `window.open(action_value, '_blank')`
   - `navigate`: `navigate(action_value)`

### 필터링 로직 (서버)

```typescript
// 현재 날짜/시간 기준으로 자동 필터링
const now = new Date();

WHERE
  is_active = true
  AND (start_date IS NULL OR start_date <= now)
  AND (end_date IS NULL OR end_date >= now)
ORDER BY
  display_order ASC,
  created_at DESC
```

## 예제 배너

### 1. 기본 글쓰기 배너

```json
{
  "title": "{{name}}님,\n오늘 뭐 먹었어요?",
  "description": "간단한 사진 한 장으로\n내 미식 취향을 완성하세요",
  "action_type": "write",
  "background_gradient": "linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)",
  "icon_type": "pen",
  "display_order": 0
}
```

### 2. 이벤트 배너 (기간 제한)

```json
{
  "title": "🎉 특별 이벤트\n지금 참여하세요!",
  "description": "기간 한정 이벤트 진행 중",
  "action_type": "link",
  "action_value": "https://example.com/event",
  "background_gradient": "linear-gradient(135deg, #FFF5E1 0%, #FFE4E1 100%)",
  "icon_type": "custom",
  "icon_url": "https://example.com/event-icon.png",
  "start_date": "2026-02-01T00:00:00Z",
  "end_date": "2026-02-28T23:59:59Z",
  "display_order": 0
}
```

### 3. 내부 페이지 이동 배너

```json
{
  "title": "미식 성향 테스트\n다시 하기",
  "description": "나의 미식 취향을 다시 확인해보세요",
  "action_type": "navigate",
  "action_value": "/quiz",
  "background_gradient": "linear-gradient(135deg, #E6F3FF 0%, #F0F8FF 100%)",
  "icon_type": "custom",
  "icon_url": "https://example.com/quiz-icon.png",
  "display_order": 1
}
```

## 프리셋 그라데이션

```css
/* 기본 (라이트 퍼플) */
linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)

/* 오렌지 선셋 */
linear-gradient(135deg, #FFF5E1 0%, #FFE4E1 100%)

/* 민트 프레시 */
linear-gradient(135deg, #E0F7F7 0%, #E8F8F5 100%)

/* 핑크 블러시 */
linear-gradient(135deg, #FFF0F5 0%, #FFE4F3 100%)

/* 블루 스카이 */
linear-gradient(135deg, #E6F3FF 0%, #F0F8FF 100%)
```

## 파일 구조

```
mimy_test/
├── server/
│   ├── db/
│   │   └── schema.ts                    # banners 테이블 스키마
│   ├── routes/
│   │   └── banners.ts                   # 배너 API 라우트
│   ├── scripts/
│   │   ├── create-banners-table.ts      # 테이블 생성 스크립트
│   │   └── seed-default-banner.ts       # 기본 배너 생성
│   └── index.ts                         # 라우트 등록
│
├── src/
│   ├── screens/
│   │   ├── admin/
│   │   │   ├── AdminScreen.tsx          # 관리자 메인
│   │   │   └── BannerAdminScreen.tsx    # 배너 관리 UI
│   │   └── main/
│   │       └── HomeTab.tsx              # 배너 표시 (수정됨)
│   └── App.tsx                          # 라우트 추가
│
└── drizzle/
    └── 0011_optimal_caretaker.sql       # 마이그레이션 파일
```

## 트러블슈팅

### 배너가 표시되지 않아요

1. 배너가 활성화 상태인지 확인
2. 시작일/종료일 설정 확인
3. 브라우저 개발자 도구에서 네트워크 탭 확인
4. `/api/banners` 응답 확인

### 배너 클릭이 작동하지 않아요

1. `action_type` 값 확인
2. `link` 타입: `action_value`에 유효한 URL 입력 확인
3. `navigate` 타입: `action_value`에 유효한 라우트 확인
4. 브라우저 콘솔에서 에러 메시지 확인

### 배너 순서가 이상해요

- `display_order` 값을 수정하세요
- 낮은 숫자가 먼저 표시됩니다
- 같은 `display_order`인 경우 최신 생성 순

## 마이그레이션

### 기존 데이터베이스에 배너 테이블 추가

```bash
# 방법 1: Drizzle 마이그레이션 (권장)
npm run db:generate
npm run db:migrate

# 방법 2: 스크립트 실행
npx tsx server/scripts/create-banners-table.ts

# 기본 배너 데이터 생성
npx tsx server/scripts/seed-default-banner.ts
```

## 향후 개선 사항

- [ ] 드래그&드롭으로 배너 순서 변경
- [ ] 배너 클릭 통계 추적
- [ ] A/B 테스트 기능
- [ ] 사용자 세그먼트별 배너 타겟팅
- [ ] 배너 템플릿 라이브러리
- [ ] 배너 복제 기능
- [ ] 배너 미리보기 모드

---

**작성일**: 2026-02-04
**작성자**: Claude Code (Sonnet 4.5)
