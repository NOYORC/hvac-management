# Firebase Authentication 설정 가이드

## 🔧 Firebase Console에서 설정해야 할 사항

### 1. Authentication 활성화

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `hvac-management-477fb`
3. 좌측 메뉴에서 **Authentication** 클릭
4. **Sign-in method** 탭 선택
5. **이메일/비밀번호** 공급업체 선택
6. **사용 설정** 토글을 켜기
7. **저장** 클릭

### 2. 테스트 계정 생성

브라우저에서 다음 페이지를 열어 테스트 계정을 생성하세요:

```
https://noyorc.github.io/hvac-management/setup-test-accounts.html
```

또는 로컬에서:

```
https://8000-ib00geyolti46jft3ty11-5634da27.sandbox.novita.ai/setup-test-accounts.html
```

"테스트 계정 생성" 버튼을 클릭하면 다음 계정이 자동 생성됩니다:

- **점검자**: inspector@hvac.com / hvac1234
- **관리자**: manager@hvac.com / hvac1234
- **시스템 관리자**: admin@hvac.com / hvac1234

### 3. Firestore 규칙 업데이트 (권장)

Firebase Console > Firestore Database > 규칙 탭에서:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 읽기 가능
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // 사용자 컬렉션: 본인 정보만 읽기 가능
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     (request.auth.uid == userId || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

## 📋 시스템 구조

### 역할 (Roles)

1. **inspector** (점검자)
   - 장비 점검 페이지 접근
   - QR 스캔 및 점검 데이터 입력
   - 장비 검색/조회

2. **manager** (관리자)
   - 점검자 권한 + 추가 기능
   - 관리 대시보드 접근
   - 통계 및 점검 내역 조회
   - 엑셀 다운로드

3. **admin** (시스템 관리자)
   - 모든 권한 + 시스템 관리
   - 점검자 관리 (CRUD)
   - 장비 관리 (CRUD)
   - 현장/건물 관리 (CRUD)

### 페이지 접근 권한

| 페이지 | inspector | manager | admin |
|--------|-----------|---------|-------|
| index.html | ✅ | ✅ | ✅ |
| login.html | ✅ (공개) | ✅ (공개) | ✅ (공개) |
| inspection.html | ✅ | ✅ | ✅ |
| qr-scanner.html | ✅ | ✅ | ✅ |
| equipment-search.html | ✅ | ✅ | ✅ |
| equipment-history.html | ✅ | ✅ | ✅ |
| equipment-list.html | ❌ | ✅ | ✅ |
| dashboard.html | ❌ | ✅ | ✅ |
| admin.html | ❌ | ❌ | ✅ |

## 🔐 보안 기능

### 1. 페이지 접근 제어

모든 보호된 페이지는 `auth-check.js`를 통해 자동으로 인증 체크:

```javascript
// 로그인 체크
if (!AuthManager.isLoggedIn()) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
}

// 권한 체크
if (!AuthManager.canAccessPage(currentPage)) {
    alert('접근 권한이 없습니다.');
    window.location.href = 'index.html';
}
```

### 2. 세션 관리

- Firebase Authentication 기반 세션
- sessionStorage에 사용자 정보 캐싱
- 자동 세션 갱신 (5분마다)
- 로그아웃 시 자동 정리

### 3. QR 스캔 보안

QR 코드를 스캔하여 장비 점검을 시작하더라도:
1. `qr-scanner.html`에서 인증 체크
2. `inspection.html`에서 다시 인증 체크
3. 미인증 사용자는 로그인 페이지로 리다이렉트

## 🚀 사용 방법

### 1. 최초 설정

1. Firebase Console에서 Authentication 활성화
2. `setup-test-accounts.html` 페이지에서 테스트 계정 생성
3. Firestore 규칙 업데이트 (선택사항)

### 2. 로그인

1. 브라우저에서 `login.html` 또는 메인 페이지 접속
2. 로그인되지 않았으면 자동으로 `login.html`로 리다이렉트
3. 테스트 계정으로 로그인:
   - 빠른 로그인 카드 클릭
   - 또는 이메일/비밀번호 직접 입력

### 3. 사용자 추가 (관리자만)

1. admin@hvac.com으로 로그인
2. 메인 페이지에서 "시스템 관리" 카드 클릭
3. "점검자 관리" 탭에서 "점검자 추가" 버튼
4. 이메일, 비밀번호, 이름, 역할 입력 후 저장

## 🔍 문제 해결

### 로그인이 안 돼요

1. Firebase Console > Authentication이 활성화되어 있는지 확인
2. 이메일/비밀번호 공급업체가 사용 설정되어 있는지 확인
3. 브라우저 콘솔(F12)에서 오류 메시지 확인

### 페이지 접근이 거부돼요

1. 현재 로그인한 계정의 역할 확인
2. 해당 페이지에 필요한 권한이 있는지 확인
3. 로그아웃 후 적절한 권한의 계정으로 다시 로그인

### 테스트 계정 생성이 안 돼요

1. Firebase Console > Authentication이 활성화되어 있는지 확인
2. 이미 계정이 존재하는 경우 "이미 존재" 메시지 표시 (정상)
3. 콘솔 오류 메시지 확인

## 📚 관련 파일

- `js/auth-manager.js` - 인증 관리 핵심 로직
- `js/auth-check.js` - 페이지 접근 권한 체크
- `login.html` - 로그인 페이지
- `admin.html` - 관리자 페이지
- `setup-test-accounts.html` - 테스트 계정 생성 도구

## 🎯 다음 단계

- [ ] Firebase Storage 통합 (사진 업로드)
- [ ] 비밀번호 재설정 기능
- [ ] 이메일 인증
- [ ] 소셜 로그인 (Google, etc.)
- [ ] 사용자 프로필 편집
- [ ] 권한 세부 조정
