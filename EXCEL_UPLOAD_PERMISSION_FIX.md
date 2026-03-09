# 🔒 Excel 업로드 권한 오류 해결 가이드

## 📋 문제 상황

**증상**: Excel 데이터 업로드 시 다음 오류 반복 발생
```
Missing or insufficient permissions
Missing or insufficient permissions
...
```

**원인**: Firestore 보안 규칙이 데이터 쓰기를 차단하고 있음

**영향받는 작업**:
- Excel 파일에서 건물 데이터 업로드
- Excel 파일에서 장비 데이터 업로드
- Excel 파일에서 현장 데이터 업로드

---

## 🚀 해결 방법

### 1단계: 현재 보안 규칙 확인

**Firebase Console 접속**:
```
https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules
```

**절차**:
1. 위 URL 접속
2. 현재 적용된 규칙 확인
3. 아래 시나리오 중 어느 것인지 판단

---

### 시나리오 A: 규칙이 `if false` 또는 매우 제한적인 경우

**현재 규칙 예시**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // 모든 접근 차단
    }
  }
}
```

**또는**:
```javascript
match /equipment/{equipmentId} {
  allow create, update: if isManagerOrAbove();  // 관리자만 쓰기
}
```

**해결**: 임시 규칙으로 변경 필요

---

### 시나리오 B: 인증 필요 규칙인 경우

**현재 규칙 예시**:
```javascript
match /{document=**} {
  allow read, write: if request.auth != null;  // 로그인 필요
}
```

**해결**: 로그인 후 업로드 또는 임시 규칙으로 변경

---

## 🔧 해결책 적용

### 방법 1: 임시 규칙으로 변경 (빠른 해결)

**⚠️ 주의**: 이 규칙은 보안이 취약합니다! Excel 업로드 완료 후 즉시 원래 규칙으로 되돌려야 합니다.

**절차**:

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules
   ```

2. **임시 규칙 적용**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;  // 임시: 모든 접근 허용
       }
     }
   }
   ```

3. **게시(Publish)** 버튼 클릭

4. **Excel 업로드 수행**
   - https://noyorc.github.io/hvac-management/excel-import.html
   - Excel 파일 선택 및 업로드

5. **⚠️ 즉시 원래 규칙으로 복구**
   - 업로드 완료 후 즉시 보안 규칙 되돌리기
   - 아래 "보안 규칙 복구" 섹션 참고

---

### 방법 2: 로그인 후 업로드 (권장)

**전제 조건**: 
- Firebase Authentication 활성화됨
- 관리자 계정으로 로그인

**절차**:

1. **로그인**
   ```
   https://noyorc.github.io/hvac-management/login.html
   ```
   - 이메일: `admin@hvac.com` (또는 관리자 계정)
   - 비밀번호: 설정한 비밀번호

2. **Excel 업로드 페이지 접속**
   ```
   https://noyorc.github.io/hvac-management/excel-import.html
   ```

3. **Excel 파일 업로드**

**이 방법의 장점**:
- ✅ 보안 규칙 변경 불필요
- ✅ 감사 로그 자동 기록 (created_by 필드)
- ✅ 역할 기반 권한 유지

**이 방법의 조건**:
- Firestore 규칙이 인증된 사용자 또는 관리자의 쓰기를 허용해야 함
- 예: `allow create, update: if isAuthenticated();`
- 또는: `allow create, update: if isManagerOrAbove();`

---

## 🔐 보안 규칙 복구

### Excel 업로드 완료 후 즉시 적용

**옵션 1: 인증 필요 규칙 (권장)**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;  // 로그인한 사용자만
    }
  }
}
```

**장점**:
- ✅ 로그인한 사용자만 접근
- ✅ 간단한 구조
- ✅ Excel 업로드 가능 (로그인 상태)

---

**옵션 2: 역할 기반 규칙 (가장 안전)**

**파일**: `/home/user/webapp/firestore.rules.auth`

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
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       (request.auth.uid == resource.data.inspector_id || 
                        isManagerOrAbove());
      allow delete: if isAdmin();
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

**장점**:
- ✅ 가장 안전한 규칙
- ✅ 역할별 세밀한 권한 제어
- ✅ 감사 로그 자동 기록

**단점**:
- ❌ Excel 업로드 시 관리자로 로그인 필요
- ❌ 역할이 없는 사용자는 업로드 불가

---

## 📝 단계별 작업 흐름

### 🔄 Excel 업로드 전체 프로세스

```
1. 현재 보안 규칙 백업
   ↓
2. 임시 규칙 적용 (allow read, write: if true)
   ↓
3. Firebase Console에서 "게시" 클릭
   ↓
4. Excel 업로드 페이지 접속
   ↓
5. Excel 파일 선택 및 업로드
   ↓
6. 업로드 완료 확인
   ↓
7. ⚠️ 즉시 보안 규칙 복구
   - 옵션 1: 인증 필요 규칙
   - 옵션 2: 역할 기반 규칙
   ↓
8. Firebase Console에서 "게시" 클릭
   ↓
9. Firestore 데이터 확인
```

---

## 🧪 테스트

### 규칙 변경 후 확인

**1. 읽기 테스트**
```javascript
// 브라우저 Console에서 실행
const testRead = await window.CachedFirestoreHelper.getAllDocuments('equipment');
console.log('읽기 테스트:', testRead);
```

**예상 결과**:
- ✅ `{ success: true, data: [...] }`
- ❌ `{ success: false, error: "Missing or insufficient permissions" }`

---

**2. 쓰기 테스트**
```javascript
// 브라우저 Console에서 실행
const testWrite = await window.CachedFirestoreHelper.setDocument('test_collection', 'test_doc', {
  test: true,
  timestamp: new Date().toISOString()
});
console.log('쓰기 테스트:', testWrite);

// 테스트 문서 삭제
await window.CachedFirestoreHelper.deleteDocument('test_collection', 'test_doc');
```

**예상 결과**:
- ✅ `{ success: true }`
- ❌ `{ success: false, error: "Missing or insufficient permissions" }`

---

## 📊 규칙 비교표

| 규칙 | 보안 수준 | Excel 업로드 | 로그인 필요 | 역할 관리 |
|------|----------|--------------|------------|----------|
| **임시 (`if true`)** | ❌ 매우 낮음 | ✅ 가능 | ❌ 불필요 | ❌ 없음 |
| **인증 필요** | ⚠️ 중간 | ✅ 가능 (로그인 후) | ✅ 필요 | ❌ 없음 |
| **역할 기반 (RBAC)** | ✅ 높음 | ✅ 가능 (관리자만) | ✅ 필요 | ✅ 있음 |

---

## 🔗 주요 링크

### Firebase Console
- **Firestore Rules**: https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules
- **Firestore Data**: https://console.firebase.google.com/project/hvac-management-477fb/firestore/data
- **Authentication**: https://console.firebase.google.com/project/hvac-management-477fb/authentication/users

### 배포 페이지
- **Excel 업로드**: https://noyorc.github.io/hvac-management/excel-import.html
- **로그인**: https://noyorc.github.io/hvac-management/login.html
- **시스템 관리**: https://noyorc.github.io/hvac-management/admin.html

---

## ⚠️ 중요 주의사항

### DO ✅

1. **Excel 업로드 전**: 현재 규칙 백업
2. **업로드 중**: 임시 규칙 사용
3. **업로드 후**: 즉시 보안 규칙 복구
4. **테스트**: 규칙 변경 후 읽기/쓰기 테스트
5. **확인**: Firestore에 데이터 정상 저장 확인

### DON'T ❌

1. **임시 규칙 방치**: 보안 취약점 발생
2. **로그인 없이 업로드**: 감사 로그 누락
3. **규칙 변경 테스트 생략**: 예상치 못한 오류
4. **백업 없이 규칙 변경**: 복구 불가능
5. **프로덕션에서 임시 규칙 사용**: 데이터 유출 위험

---

## 🎯 권장 워크플로우

### 개발 단계

```
임시 규칙 (if true)
→ Excel 업로드 자유롭게
→ 개발 및 테스트
```

### 테스트 단계

```
인증 필요 규칙 (if request.auth != null)
→ 로그인 후 Excel 업로드
→ 권한 테스트
```

### 프로덕션 단계

```
역할 기반 규칙 (RBAC)
→ 관리자만 Excel 업로드 가능
→ 세밀한 권한 제어
→ 감사 로그 자동 기록
```

---

## 📞 추가 지원

### 문제가 계속되는 경우

1. **Firebase Console Logs 확인**
   - https://console.firebase.google.com/project/hvac-management-477fb/logs

2. **브라우저 개발자 도구 Console 확인**
   - F12 → Console 탭
   - 오류 메시지 상세 확인

3. **Firestore 규칙 시뮬레이터 사용**
   - Firebase Console → Firestore → Rules
   - 오른쪽 상단 "규칙 시뮬레이터" 버튼
   - 읽기/쓰기 작업 테스트

---

## 🎉 해결 완료 체크리스트

- [ ] Firebase Console에서 현재 규칙 확인
- [ ] 임시 규칙 적용 (또는 로그인)
- [ ] Excel 파일 업로드 성공
- [ ] Firestore에 데이터 저장 확인
- [ ] 보안 규칙 복구 (인증 필요 또는 RBAC)
- [ ] 규칙 변경 후 테스트
- [ ] 모든 기능 정상 작동 확인

---

**🚀 이제 Excel 데이터를 안전하게 업로드할 수 있습니다!**
