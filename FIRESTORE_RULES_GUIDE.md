# 🔥 Firestore 보안 규칙 설정 가이드

## 📋 문제 요약

**오류 메시지**: 
```
Error setting document: FirebaseError: Missing or insufficient permissions
Error setting sites: FirebaseError: Missing or insufficient permissions
Error setting inspectors: FirebaseError: Missing or insufficient permissions
```

**원인**: Firestore 보안 규칙이 읽기/쓰기를 차단하고 있습니다.

---

## 🔧 해결 방법

### 1단계: Firebase Console 접속

1. **Firebase Console 열기**:
   ```
   https://console.firebase.google.com/
   ```

2. **프로젝트 선택**:
   - 프로젝트 이름: `hvac-management-477fb`
   - 프로젝트 ID: `hvac-management-477fb`

---

### 2단계: Firestore Database 메뉴 이동

1. 왼쪽 메뉴에서 **"빌드(Build)"** 클릭
2. **"Firestore Database"** 클릭
3. 상단 탭에서 **"규칙(Rules)"** 탭 클릭

---

### 3단계: 보안 규칙 수정

현재 규칙이 다음과 같을 수 있습니다:

```javascript
// ❌ 문제 있는 규칙 (모든 접근 차단)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // 모든 접근 거부!
    }
  }
}
```

---

### 4단계: 권장 보안 규칙 적용

#### 옵션 1: 개발 모드 (테스트용, **보안 약함**)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 모든 읽기/쓰기 허용
    }
  }
}
```

**경고**: 
- ⚠️ 누구나 데이터를 읽고 쓸 수 있습니다
- ⚠️ 개발/테스트 용도로만 사용하세요
- ⚠️ 프로덕션 환경에서는 사용하지 마세요

**사용 시기**: 
- 초기 개발 단계
- 로컬 테스트
- 데이터 구조 설계 중

---

#### 옵션 2: 기본 보안 규칙 (권장)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 사이트(현장) 컬렉션
    match /sites/{siteId} {
      allow read: if true;                    // 모든 사용자가 읽기 가능
      allow write: if request.auth != null;   // 로그인한 사용자만 쓰기 가능
    }
    
    // 건물 컬렉션
    match /buildings/{buildingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 장비 컬렉션
    match /equipment/{equipmentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 점검 기록 컬렉션
    match /inspections/{inspectionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 점검자 컬렉션
    match /inspectors/{inspectorId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 사용자 컬렉션
    match /users/{userId} {
      allow read: if request.auth != null;    // 로그인한 사용자만 읽기 가능
      allow write: if request.auth != null;   // 로그인한 사용자만 쓰기 가능
    }
  }
}
```

**특징**:
- ✅ 읽기는 모두 허용 (공개 데이터)
- ✅ 쓰기는 인증된 사용자만 허용
- ✅ users 컬렉션은 인증된 사용자만 접근 가능

**문제**: 
- 현재 앱에 Firebase Authentication이 구현되어 있지 않음
- `request.auth != null` 조건이 항상 `false`가 됨
- 따라서 쓰기 작업이 실패함

---

#### 옵션 3: 임시 해결책 (인증 구현 전까지)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 모든 컬렉션에 대해 읽기/쓰기 허용 (임시)
    match /{document=**} {
      allow read: if true;   // 모든 읽기 허용
      allow write: if true;  // 모든 쓰기 허용
    }
  }
}
```

**사용 시기**:
- Firebase Authentication 구현 전까지 임시 사용
- 프로토타입 개발 중
- 내부 테스트 환경

**다음 단계**:
- Firebase Authentication 구현 후 옵션 2로 전환
- 사용자 권한 관리 추가

---

#### 옵션 4: 프로덕션 보안 규칙 (가장 안전)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 헬퍼 함수: 사용자가 인증되었는지 확인
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 헬퍼 함수: 사용자가 관리자인지 확인
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // 헬퍼 함수: 사용자가 점검자인지 확인
    function isInspector() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'inspector';
    }
    
    // 사이트(현장) 컬렉션
    match /sites/{siteId} {
      allow read: if true;                  // 모든 사용자가 읽기 가능
      allow create, update: if isAdmin();   // 관리자만 생성/수정 가능
      allow delete: if isAdmin();           // 관리자만 삭제 가능
    }
    
    // 건물 컬렉션
    match /buildings/{buildingId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    // 장비 컬렉션
    match /equipment/{equipmentId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    // 점검 기록 컬렉션
    match /inspections/{inspectionId} {
      allow read: if true;                                    // 모든 사용자가 읽기 가능
      allow create: if isAuthenticated();                     // 로그인한 사용자만 생성
      allow update: if isAuthenticated() && 
                       (request.auth.uid == resource.data.inspector_id || isAdmin());  // 작성자 또는 관리자만 수정
      allow delete: if isAdmin();                             // 관리자만 삭제
    }
    
    // 점검자 컬렉션
    match /inspectors/{inspectorId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    // 사용자 컬렉션
    match /users/{userId} {
      allow read: if isAuthenticated();                       // 로그인한 사용자만 읽기
      allow create: if isAuthenticated() && request.auth.uid == userId;  // 본인 정보만 생성
      allow update: if isAuthenticated() && 
                       (request.auth.uid == userId || isAdmin());  // 본인 또는 관리자만 수정
      allow delete: if isAdmin();                             // 관리자만 삭제
    }
  }
}
```

**특징**:
- ✅ 역할 기반 접근 제어 (RBAC)
- ✅ 관리자와 점검자 권한 분리
- ✅ 사용자별 데이터 접근 제어
- ✅ 프로덕션 환경에 적합

**요구사항**:
- Firebase Authentication 구현 필수
- `users` 컬렉션에 `role` 필드 필요
  - 예: `{ uid: "user123", email: "user@example.com", role: "admin" }`
  - 예: `{ uid: "user456", email: "inspector@example.com", role: "inspector" }`

---

## 🚀 적용 방법

### 1. Firebase Console에서 규칙 붙여넣기

1. Firebase Console → Firestore Database → 규칙 탭
2. 위의 규칙 중 하나를 선택하여 복사
3. 규칙 에디터에 붙여넣기
4. 상단의 **"게시(Publish)"** 버튼 클릭

### 2. 규칙 적용 확인

```
✅ 규칙이 성공적으로 게시되었습니다.
```

### 3. 웹 앱 테스트

1. 브라우저 새로고침 (Ctrl+F5)
2. 개발자 도구(F12) → Console 탭 확인
3. 에러 메시지 사라짐 확인
4. 데이터 로드/저장 테스트

---

## 🧪 테스트 방법

### 테스트 1: 데이터 읽기

```javascript
// Console에서 실행
const result = await window.CachedFirestoreHelper.getAllDocuments('sites');
console.log('Sites:', result);
```

**예상 결과**:
```javascript
{
  success: true,
  data: [
    { id: "SITE-001", site_name: "본사 빌딩", ... },
    { id: "SITE-002", site_name: "지사 건물", ... }
  ],
  total: 2
}
```

---

### 테스트 2: 데이터 쓰기

```javascript
// Console에서 실행
const testSite = {
  site_name: "테스트 현장",
  address: "서울시 강남구",
  contact_name: "홍길동",
  contact_phone: "010-1234-5678"
};

const result = await window.CachedFirestoreHelper.addDocument('sites', testSite);
console.log('Add result:', result);
```

**예상 결과**:
```javascript
{
  success: true,
  id: "abc123def456"
}
```

---

### 테스트 3: 관리자 페이지 동작 확인

1. https://noyorc.github.io/hvac-management/admin.html 접속
2. "장비 관리" 탭 → 장비 목록 확인
3. "현장/건물 관리" 탭 → 현장 목록 확인
4. 데이터 추가/수정/삭제 테스트

**예상 결과**:
- ✅ 에러 없이 데이터 로드
- ✅ 추가/수정/삭제 정상 동작
- ✅ Console에 에러 메시지 없음

---

## 📋 단계별 진행 계획

### 현재 단계: 옵션 3 적용 (임시 해결책)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**이유**:
- Firebase Authentication이 아직 구현되지 않음
- 앱 기능 개발 우선 진행 필요
- 빠른 테스트 및 프로토타입 개발

---

### 다음 단계: Firebase Authentication 구현

#### 1. Firebase Authentication 활성화

1. Firebase Console → 빌드 → Authentication
2. "시작하기" 클릭
3. 로그인 제공업체 선택:
   - **이메일/비밀번호**: 기본 인증
   - **Google**: 소셜 로그인
   - **익명**: 임시 사용자

#### 2. 코드에 인증 추가

```javascript
// 로그인 페이지 추가
<!DOCTYPE html>
<html>
<head>
    <title>로그인 - HVAC 관리</title>
</head>
<body>
    <h1>로그인</h1>
    <form id="loginForm">
        <input type="email" id="email" placeholder="이메일" required>
        <input type="password" id="password" placeholder="비밀번호" required>
        <button type="submit">로그인</button>
    </form>

    <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
        import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

        const firebaseConfig = { /* 설정 */ };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log('로그인 성공:', userCredential.user);
                window.location.href = 'admin.html';
            } catch (error) {
                alert('로그인 실패: ' + error.message);
            }
        });
    </script>
</body>
</html>
```

#### 3. 보안 규칙을 옵션 2 또는 4로 업그레이드

---

### 최종 단계: 프로덕션 배포 (옵션 4 적용)

1. 사용자 역할 관리 구현
2. 관리자 계정 생성
3. 보안 규칙을 옵션 4로 업그레이드
4. 철저한 테스트 수행
5. 프로덕션 배포

---

## ⚠️ 보안 권장사항

### 절대 하지 말아야 할 것

❌ **프로덕션에서 `allow read, write: if true` 사용**
- 누구나 데이터를 삭제/변조할 수 있음
- 민감한 정보 노출 위험
- 악의적인 사용자의 공격 가능

❌ **API 키를 공개 저장소에 커밋**
- 현재 코드에 API 키가 포함되어 있음
- GitHub 등 공개 저장소에 올리면 위험
- `.env` 파일로 분리하거나 환경 변수로 관리

❌ **보안 규칙 없이 배포**
- 데이터베이스가 완전히 노출됨
- 법적 책임 문제 발생 가능

---

### 꼭 해야 할 것

✅ **최소 권한 원칙 적용**
- 필요한 권한만 부여
- 읽기 전용 사용자는 쓰기 권한 없음
- 관리자만 삭제 권한 보유

✅ **정기적인 보안 규칙 검토**
- Firebase Console → 보안 규칙 시뮬레이터 사용
- 실제 시나리오 테스트
- 로그 모니터링

✅ **Firebase Authentication 구현**
- 사용자 인증 필수
- 역할 기반 접근 제어 구현
- 세션 관리 및 로그아웃 기능

✅ **데이터 유효성 검사**
- 입력 데이터 타입 검증
- 필수 필드 확인
- SQL Injection 방지

---

## 📊 보안 규칙 옵션 비교표

| 항목 | 옵션 1 (개발) | 옵션 2 (기본) | 옵션 3 (임시) | 옵션 4 (프로덕션) |
|------|--------------|--------------|--------------|------------------|
| **읽기 권한** | 모두 | 모두 | 모두 | 모두 |
| **쓰기 권한** | 모두 | 인증 사용자 | 모두 | 역할별 |
| **보안 수준** | ⚠️ 매우 낮음 | ✅ 보통 | ⚠️ 매우 낮음 | ✅ 높음 |
| **인증 필요** | ❌ | ✅ | ❌ | ✅ |
| **역할 관리** | ❌ | ❌ | ❌ | ✅ |
| **프로덕션 사용** | ❌ | ⚠️ 주의 | ❌ | ✅ 권장 |
| **개발 단계** | ✅ 초기 개발 | ⚠️ 인증 후 | ✅ 인증 전 | ✅ 최종 배포 |

---

## 🔧 즉시 적용 방법

### 지금 당장 문제를 해결하려면

1. **Firebase Console 접속**:
   ```
   https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules
   ```

2. **다음 규칙 복사 & 붙여넣기**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

3. **"게시" 버튼 클릭**

4. **브라우저 새로고침** (Ctrl+F5)

5. **테스트**:
   - https://noyorc.github.io/hvac-management/admin.html
   - 장비 관리 탭 확인
   - Console 에러 사라짐 확인

---

## 📞 추가 지원

### Firebase Console 직접 링크

- **프로젝트 개요**: https://console.firebase.google.com/project/hvac-management-477fb
- **Firestore 규칙**: https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules
- **Firestore 데이터**: https://console.firebase.google.com/project/hvac-management-477fb/firestore/data
- **Authentication**: https://console.firebase.google.com/project/hvac-management-477fb/authentication/users

### 문제 해결 체크리스트

- [ ] Firebase Console 접속 가능
- [ ] Firestore Database 활성화됨
- [ ] 보안 규칙 수정 권한 있음
- [ ] 규칙 게시 완료
- [ ] 브라우저 새로고침
- [ ] Console 에러 확인
- [ ] 데이터 로드/저장 테스트

---

**작성일**: 2026-02-23  
**작성자**: GenSpark AI Developer  
**상태**: 📝 가이드 문서
