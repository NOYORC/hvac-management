# 🔐 Firebase Authentication 구현 완료 가이드

## 📋 개요

**프로젝트**: HVAC 관리 시스템  
**기능**: Firebase Authentication 통합  
**날짜**: 2026-02-23  
**상태**: ✅ 구현 완료 - 활성화 대기

---

## 🎯 구현된 기능

### 1. **인증 시스템**
- ✅ Firebase Authentication SDK 통합
- ✅ 이메일/비밀번호 로그인
- ✅ 자동 세션 관리
- ✅ 로그인 상태 감지

### 2. **역할 기반 접근 제어 (RBAC)**
- ✅ 3가지 사용자 역할:
  - **점검자 (inspector)**: 장비 점검 수행
  - **관리자 (manager)**: 데이터 관리 + 점검
  - **시스템 관리자 (admin)**: 전체 시스템 관리

### 3. **사용자 관리**
- ✅ **기존 admin.html 페이지에 통합됨**
- ✅ "점검자 관리" 탭에서 사용자 관리
- ✅ 사용자 생성 (Firebase Auth 연동)
- ✅ 사용자 목록 조회
- ✅ 사용자 삭제
- ✅ 역할별 권한 설정 (점검자/관리자/시스템 관리자)

### 4. **보안 규칙**
- ✅ Authentication 기반 Firestore 보안 규칙
- ✅ 역할별 데이터 접근 제어
- ✅ 리소스별 권한 분리

---

## 📁 생성/수정된 파일

### 신규 파일

1. **`firestore.rules.auth`** (2.6KB)
   - Authentication 기반 보안 규칙
   - 역할별 접근 제어
   - 프로덕션 환경용

### 기존 파일 (Firebase Auth 통합 완료)

1. **`login.html`** ✅
   - Firebase Auth 완전 통합
   - 로그인 UI
   - 자동 리다이렉트

2. **`admin.html`** ✅
   - 사용자 관리 탭 ("점검자 관리")
   - Firebase Auth 기반 사용자 생성/삭제
   - 역할 관리 UI (점검자/관리자/시스템 관리자)
   - 관리자 권한 체크 (line 16-20)

3. **`js/admin.js`** ✅
   - AuthManager.createUser() 통합 (line 219)
   - 사용자 생성/수정/삭제 로직
   - 역할 기반 접근 제어

4. **`js/auth-manager.js`** ✅
   - AuthManager 클래스
   - 로그인/로그아웃 로직
   - 사용자 생성 함수 (createUser)
   - 권한 확인 함수

5. **`js/auth-check.js`** ✅
   - 페이지 보호 로직
   - 인증 상태 확인

6. **`js/auth-helper.js`** ✅
   - 인증 헬퍼 함수
   - 세션 관리

---

## 🚀 Firebase Console 설정 가이드

### 1단계: Authentication 활성화

#### 1-1. Firebase Console 접속
```
https://console.firebase.google.com/project/hvac-management-477fb/authentication/users
```

#### 1-2. Authentication 시작하기
1. 왼쪽 메뉴 → **빌드** → **Authentication**
2. **"시작하기"** 버튼 클릭
3. **Sign-in method** 탭 선택

#### 1-3. 이메일/비밀번호 활성화
1. **"이메일/비밀번호"** 클릭
2. **"사용 설정"** 토글을 ON으로 변경
3. **"저장"** 버튼 클릭

**결과**:
```
✅ 이메일/비밀번호 로그인이 활성화되었습니다.
```

---

### 2단계: Firestore 보안 규칙 업데이트

#### 2-1. Firestore 규칙 페이지 이동
```
https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules
```

#### 2-2. 보안 규칙 교체

**기존 규칙 (임시)**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ 보안 취약
    }
  }
}
```

**새 규칙 (Authentication 기반)**:

프로젝트의 `firestore.rules.auth` 파일 내용을 복사하여 붙여넣기:

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
    
    // 헬퍼 함수: 사용자가 점검자 이상인지 확인
    function isInspectorOrAbove() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['inspector', 'manager', 'admin'];
    }
    
    // 헬퍼 함수: 사용자가 관리자 이상인지 확인
    function isManagerOrAbove() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // 사이트(현장) 컬렉션
    match /sites/{siteId} {
      allow read: if isAuthenticated();
      allow create, update: if isManagerOrAbove();
      allow delete: if isAdmin();
    }
    
    // 건물 컬렉션
    match /buildings/{buildingId} {
      allow read: if isAuthenticated();
      allow create, update: if isManagerOrAbove();
      allow delete: if isAdmin();
    }
    
    // 장비 컬렉션
    match /equipment/{equipmentId} {
      allow read: if isAuthenticated();
      allow create, update: if isManagerOrAbove();
      allow delete: if isAdmin();
    }
    
    // 점검 기록 컬렉션
    match /inspections/{inspectionId} {
      allow read: if isAuthenticated();
      allow create: if isInspectorOrAbove();
      allow update: if isInspectorOrAbove() && 
                       (request.auth.uid == resource.data.inspector_id || 
                        isManagerOrAbove());
      allow delete: if isAdmin();
    }
    
    // 점검자 컬렉션
    match /inspectors/{inspectorId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isManagerOrAbove();
    }
    
    // 사용자 컬렉션
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAuthenticated() && 
                       (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
  }
}
```

#### 2-3. 규칙 게시
1. 상단의 **"게시(Publish)"** 버튼 클릭
2. 확인 대화상자에서 **"게시"** 클릭

**결과**:
```
✅ 규칙이 성공적으로 게시되었습니다.
```

---

### 3단계: 첫 관리자 계정 생성

#### 방법 1: Firebase Console에서 수동 생성 (권장)

**3-1. Authentication 사용자 탭**
```
https://console.firebase.google.com/project/hvac-management-477fb/authentication/users
```

**3-2. 사용자 추가**
1. **"사용자 추가"** 버튼 클릭
2. 이메일 입력: `admin@hvac.com`
3. 비밀번호 입력: `hvac1234` (또는 원하는 비밀번호)
4. **"사용자 추가"** 버튼 클릭

**3-3. Firestore에 사용자 문서 생성**

1. Firestore 데이터 탭으로 이동:
   ```
   https://console.firebase.google.com/project/hvac-management-477fb/firestore/data
   ```

2. **"컬렉션 시작"** 또는 **"문서 추가"** 클릭

3. 컬렉션 ID: `users`

4. 문서 ID: **Authentication에서 생성된 UID 복사**
   - Authentication → 사용자 탭 → 방금 생성한 사용자의 UID 복사

5. 필드 추가:
   ```
   email (string): admin@hvac.com
   name (string): 시스템 관리자
   role (string): admin
   created_at (timestamp): 현재 시간
   ```

6. **"저장"** 클릭

---

#### 방법 2: 임시로 보안 규칙 완화 후 UI에서 생성

**⚠️ 주의**: 이 방법은 첫 계정 생성 후 즉시 원래 규칙으로 되돌려야 합니다.

**임시 규칙**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 임시로 모든 접근 허용
    }
  }
}
```

**절차**:
1. 위의 임시 규칙을 Firestore에 게시
2. 브라우저에서 직접 사용자 생성:
   ```javascript
   // 브라우저 Console에서 실행
   import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
   import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
   
   const auth = getAuth();
   const db = getFirestore();
   
   const userCred = await createUserWithEmailAndPassword(auth, 'admin@hvac.com', 'hvac1234');
   await setDoc(doc(db, 'users', userCred.user.uid), {
     email: 'admin@hvac.com',
     name: '시스템 관리자',
     role: 'admin',
     created_at: new Date().toISOString()
   });
   
   console.log('✅ 관리자 계정 생성 완료:', userCred.user.uid);
   ```
3. **즉시 Authentication 기반 보안 규칙으로 되돌리기**

---

## 🧪 테스트 가이드

### 1. 로그인 테스트

**URL**: 
```
https://noyorc.github.io/hvac-management/login.html
```

**절차**:
1. 로그인 페이지 접속
2. 이메일: `admin@hvac.com`
3. 비밀번호: `hvac1234`
4. **"로그인"** 버튼 클릭

**예상 결과**:
- ✅ 로그인 성공
- ✅ `admin.html`로 자동 리다이렉트 (관리자 역할)
- ✅ 상단에 사용자 정보 표시

---

### 2. 사용자 관리 테스트

**URL**:
```
https://noyorc.github.io/hvac-management/admin.html
```

**절차**:
1. 관리자 계정으로 로그인
2. 시스템 관리 페이지 (`admin.html`) 접속
3. **"점검자 관리"** 탭 클릭 (기본 활성)
4. **"새 점검자 추가"** 버튼 클릭
5. 테스트 계정 생성:
   - 이메일: `inspector@hvac.com`
   - 이름: `김점검`
   - 비밀번호: `hvac1234`
   - 역할: **점검자 (inspector)**
6. **"저장"** 버튼 클릭

**예상 결과**:
- ✅ "새 점검자가 추가되었습니다." 메시지
- ✅ 점검자 목록에 새 사용자 표시
- ✅ 역할 배지가 "점검자"로 표시
- ✅ Firebase Authentication에 계정 생성
- ✅ Firestore `users` 컬렉션에 문서 생성

---

### 3. 역할별 접근 권한 테스트

#### 3-1. 점검자 권한 테스트
1. 로그아웃
2. `inspector@hvac.com`으로 로그인
3. 접근 가능 페이지:
   - ✅ `index.html` (메인)
   - ✅ `inspection.html` (장비 점검)
   - ✅ `qr-scanner.html` (QR 스캔)
   - ✅ `equipment-search.html` (장비 검색)
   - ✅ `equipment-history.html` (장비 이력)
4. 접근 불가 페이지:
   - ❌ `admin.html` (시스템 관리)
   - ❌ `dashboard.html` (대시보드)
   - → "접근 권한이 없습니다" 알림

#### 3-2. 관리자 권한 테스트
1. 로그아웃
2. `manager@hvac.com`으로 로그인 (생성 필요)
3. 접근 가능 페이지:
   - ✅ 점검자 권한 페이지 전부
   - ✅ `dashboard.html` (대시보드)
   - ✅ `equipment-list.html` (장비 목록)
4. 접근 불가 페이지:
   - ❌ `admin.html` (시스템 관리)

#### 3-3. 시스템 관리자 권한 테스트
1. `admin@hvac.com`으로 로그인
2. 접근 가능 페이지:
   - ✅ **모든 페이지** 접근 가능

---

### 4. 데이터 접근 권한 테스트

#### 테스트 1: 점검자 - 데이터 읽기
```javascript
// 브라우저 Console에서 실행 (inspector@hvac.com 로그인 상태)
const sites = await window.FirestoreHelper.getAllDocuments('sites');
console.log('사이트 목록:', sites);  // ✅ 성공 (읽기 가능)
```

#### 테스트 2: 점검자 - 데이터 쓰기
```javascript
// 브라우저 Console에서 실행 (inspector@hvac.com 로그인 상태)
const result = await window.FirestoreHelper.addDocument('sites', {
  site_name: '테스트 현장',
  address: '서울시'
});
console.log(result);  // ❌ 실패 (권한 없음)
// 예상: { success: false, error: "Missing or insufficient permissions" }
```

#### 테스트 3: 관리자 - 데이터 쓰기
```javascript
// 브라우저 Console에서 실행 (manager@hvac.com 로그인 상태)
const result = await window.FirestoreHelper.addDocument('sites', {
  site_name: '테스트 현장',
  address: '서울시'
});
console.log(result);  // ✅ 성공 (관리자 권한)
```

---

## 📊 역할별 권한 매트릭스

| 기능 / 역할 | 점검자 | 관리자 | 시스템 관리자 |
|------------|--------|--------|--------------|
| **로그인** | ✅ | ✅ | ✅ |
| **장비 점검 수행** | ✅ | ✅ | ✅ |
| **QR 스캔** | ✅ | ✅ | ✅ |
| **장비 검색** | ✅ | ✅ | ✅ |
| **장비 이력 조회** | ✅ | ✅ | ✅ |
| **대시보드 접근** | ❌ | ✅ | ✅ |
| **현장/건물 추가** | ❌ | ✅ | ✅ |
| **장비 추가/수정** | ❌ | ✅ | ✅ |
| **현장/건물 삭제** | ❌ | ❌ | ✅ |
| **장비 삭제** | ❌ | ❌ | ✅ |
| **사용자 관리** | ❌ | ❌ | ✅ |
| **시스템 설정** | ❌ | ❌ | ✅ |

---

## 🔒 보안 기능 요약

### 1. 인증 레벨 보안
- ✅ 모든 데이터 접근에 로그인 필수
- ✅ 세션 자동 관리 (SessionStorage + Firebase Auth)
- ✅ 비밀번호 암호화 (Firebase에서 자동 처리)

### 2. 역할 기반 접근 제어 (RBAC)
- ✅ 3단계 역할 계층:
  - Level 1: 점검자 (읽기 + 점검 기록 작성)
  - Level 2: 관리자 (+ 데이터 생성/수정)
  - Level 3: 시스템 관리자 (+ 삭제 + 사용자 관리)

### 3. 페이지 레벨 보안
- ✅ 페이지별 권한 설정 (`PAGE_PERMISSIONS`)
- ✅ 자동 리다이렉트 (권한 없으면 메인 페이지로)
- ✅ 로그인 안 하면 로그인 페이지로

### 4. 데이터 레벨 보안
- ✅ Firestore 보안 규칙으로 이중 보호
- ✅ 역할 확인 후 데이터 접근
- ✅ 작성자 확인 (점검 기록 수정 시)

---

## 📝 테스트 계정 생성 스크립트

사용자 관리 페이지나 Console에서 다음 계정들을 생성하세요:

### 1. 시스템 관리자 (admin)
```
이메일: admin@hvac.com
비밀번호: hvac1234
이름: 시스템 관리자
역할: admin
```

### 2. 관리자 (manager)
```
이메일: manager@hvac.com
비밀번호: hvac1234
이름: 김관리
역할: manager
```

### 3. 점검자 (inspector)
```
이메일: inspector@hvac.com
비밀번호: hvac1234
이름: 김점검
역할: inspector
```

---

## 🚨 문제 해결

### 문제 1: 로그인 후 "권한 없음" 오류

**증상**:
```
FirebaseError: Missing or insufficient permissions
```

**원인**: Firestore 보안 규칙이 아직 임시 규칙으로 설정되어 있거나, `users` 컬렉션에 사용자 문서가 없음

**해결**:
1. Firestore 보안 규칙을 Authentication 기반 규칙으로 업데이트
2. `users` 컬렉션에 사용자 문서 확인:
   ```
   컬렉션: users
   문서 ID: [Authentication의 UID]
   필드: { email, name, role, created_at }
   ```

---

### 문제 2: 페이지 접근 시 로그인 페이지로 리다이렉트

**원인**: 로그인 상태가 유지되지 않음

**해결**:
1. SessionStorage 확인:
   ```javascript
   // Console에서 실행
   console.log(sessionStorage.getItem('auth_user'));
   ```
2. AuthManager 초기화 확인:
   ```javascript
   console.log(window.AuthManager.getCurrentUser());
   ```
3. 브라우저 캐시 삭제 후 재로그인

---

### 문제 3: 사용자 생성 시 "이미 등록된 이메일" 오류

**원인**: Authentication에는 사용자가 있지만 Firestore `users` 컬렉션에는 없음

**해결**:
1. Firebase Console → Authentication → 사용자 삭제
2. 또는 Firestore `users` 컬렉션에 수동으로 문서 추가

---

## 📦 커밋 정보

**커밋 해시**: `2df7d8a`  
**커밋 메시지**: `feat: Firebase Authentication 통합 및 사용자 관리 페이지 추가`

**추가 파일**:
- `user-management.html` (사용자 관리 페이지)
- `firestore.rules.auth` (Authentication 기반 보안 규칙)

**브랜치**: `main`  
**저장소**: https://github.com/NOYORC/hvac-management

---

## 🎯 다음 단계

### 즉시 수행 (필수)
- [ ] Firebase Console에서 Authentication 활성화
- [ ] 이메일/비밀번호 로그인 제공업체 활성화
- [ ] Firestore 보안 규칙을 `firestore.rules.auth`로 업데이트
- [ ] 첫 관리자 계정 생성
- [ ] 로그인 테스트

### 단기 (1주일 이내)
- [ ] 테스트 계정 생성 (점검자, 관리자)
- [ ] 역할별 권한 테스트
- [ ] 사용자 교육 (로그인 방법, 역할별 기능)

### 중기 (1개월 이내)
- [ ] 비밀번호 재설정 기능 추가
- [ ] 사용자 프로필 편집 기능
- [ ] 로그인 이력 조회
- [ ] 다중 인증 (MFA) 고려

### 장기 (향후)
- [ ] 소셜 로그인 추가 (Google, 카카오 등)
- [ ] 비밀번호 정책 강화
- [ ] 세션 타임아웃 설정
- [ ] 감사 로그 (Audit Log)

---

## 🔗 유용한 링크

**Firebase Console**:
- 프로젝트 홈: https://console.firebase.google.com/project/hvac-management-477fb
- Authentication: https://console.firebase.google.com/project/hvac-management-477fb/authentication/users
- Firestore 규칙: https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules
- Firestore 데이터: https://console.firebase.google.com/project/hvac-management-477fb/firestore/data

**프로젝트 페이지**:
- 로그인: https://noyorc.github.io/hvac-management/login.html
- 사용자 관리: https://noyorc.github.io/hvac-management/user-management.html
- 메인: https://noyorc.github.io/hvac-management/index.html

---

**작성일**: 2026-02-23  
**작성자**: GenSpark AI Developer  
**커밋**: 2df7d8a  
**상태**: ✅ 구현 완료 - Firebase Console 설정 대기
