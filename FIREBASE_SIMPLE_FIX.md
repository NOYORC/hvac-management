# 🔒 간단한 해결책: ADMIN 전용 데이터 가져오기

## 💡 핵심 아이디어

**현재 문제**: 
- 데이터 가져오기 페이지를 누구나 접근 가능
- Firestore 규칙이 쓰기를 막고 있음

**해결책**:
1. ✅ 데이터 가져오기 페이지를 **ADMIN만 접근** 가능하도록 제한
2. ✅ Firestore 규칙에서 **ADMIN은 모든 쓰기 허용**
3. ✅ 보안 유지하면서 데이터 가져오기 가능

---

## 📝 적용할 Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 헬퍼 함수: 사용자가 인증되었는지 확인
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 헬퍼 함수: 사용자 문서가 존재하는지 확인
    function userExists() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }
    
    // 헬퍼 함수: 사용자가 관리자인지 확인
    function isAdmin() {
      return isAuthenticated() && 
             userExists() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // 헬퍼 함수: 사용자가 점검자 이상인지 확인
    function isInspectorOrAbove() {
      return isAuthenticated() &&
             userExists() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['inspector', 'manager', 'admin'];
    }
    
    // 헬퍼 함수: 사용자가 관리자 이상인지 확인
    function isManagerOrAbove() {
      return isAuthenticated() &&
             userExists() &&
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
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if isAuthenticated() && (
        (request.auth.uid == userId && 
         (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'role']))) ||
        isAdmin()
      );
      allow delete: if isAdmin();
    }
  }
}
```

---

## 🔐 핵심 보안 원칙

### ✅ 안전한 이유

1. **ADMIN만 대량 데이터 쓰기 가능**
   - `isManagerOrAbove()` 또는 `isAdmin()` 체크
   - 일반 사용자는 쓰기 불가

2. **데이터 가져오기 페이지 접근 제한**
   - ADMIN 계정으로만 로그인 가능
   - 다른 사용자는 페이지 자체를 볼 수 없음

3. **사용자 역할 검증**
   - Firestore에서 사용자 문서를 직접 읽어 역할 확인
   - 클라이언트에서 역할을 속일 수 없음

### ⚠️ 주의사항

**절대 하지 말아야 할 것**:
```javascript
// ❌ 절대 금지!
match /{document=**} {
  allow read, write: if true;  // 누구나 접근 가능!
}

// ❌ 절대 금지!
match /equipment/{equipmentId} {
  allow write: if true;  // 누구나 쓰기 가능!
}
```

**올바른 방법**:
```javascript
// ✅ 권장
match /equipment/{equipmentId} {
  allow read: if isAuthenticated();           // 로그인 필요
  allow create, update: if isManagerOrAbove(); // 관리자만
  allow delete: if isAdmin();                  // ADMIN만
}
```

---

## 🎯 적용 순서

### 1단계: Firestore Rules 업데이트

1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트: `hvac-management-477fb`
3. Firestore Database → Rules 탭
4. 위의 규칙 복사 → 붙여넣기
5. **"게시" 버튼 클릭** ⭐

### 2단계: 브라우저 새로고침

- Ctrl + F5 (Windows) 또는 Cmd + Shift + R (Mac)
- 캐시 삭제 후 재접속

### 3단계: ADMIN 계정으로 로그인

- ADMIN 역할을 가진 계정으로 로그인
- 데이터 가져오기 페이지 접속
- 엑셀 파일 업로드

### 4단계: 테스트

**성공 시나리오**:
```
1. ADMIN 로그인
2. excel-import.html 접속
3. 엑셀 파일 업로드
4. ✅ "데이터를 성공적으로 저장했습니다"
```

**실패 시나리오** (MANAGER 또는 INSPECTOR):
```
1. MANAGER/INSPECTOR 로그인
2. excel-import.html 접속
3. 엑셀 파일 업로드
4. ❌ "Missing or insufficient permissions"
```

---

## 📊 권한 매트릭스

| 컬렉션 | 읽기 | 생성 | 수정 | 삭제 |
|--------|------|------|------|------|
| **sites** | 로그인 사용자 | MANAGER/ADMIN | MANAGER/ADMIN | ADMIN |
| **buildings** | 로그인 사용자 | MANAGER/ADMIN | MANAGER/ADMIN | ADMIN |
| **equipment** | 로그인 사용자 | **MANAGER/ADMIN** ⭐ | **MANAGER/ADMIN** ⭐ | ADMIN |
| **inspections** | 로그인 사용자 | INSPECTOR+ | INSPECTOR+(본인) | ADMIN |
| **users** | 로그인 사용자 | 본인 (회원가입) | 본인/ADMIN | ADMIN |

⭐ **핵심**: MANAGER와 ADMIN은 장비 데이터를 **생성/수정**할 수 있습니다!

---

## 🔍 문제 해결

### Q1: 여전히 권한 오류가 발생해요

**확인 사항**:
1. ✅ Firestore Rules를 **게시**했나요?
2. ✅ 브라우저 **캐시를 삭제**했나요?
3. ✅ **ADMIN 계정**으로 로그인했나요?
4. ✅ Firestore에서 해당 사용자의 `role` 필드가 `'admin'`인가요?

**디버깅 코드**:
```javascript
// 콘솔에서 실행
const user = JSON.parse(sessionStorage.getItem('auth_user'));
console.log('현재 사용자:', user);
console.log('역할:', user?.role);
```

### Q2: MANAGER도 데이터를 가져오고 싶어요

**방법 1**: Rules에서 MANAGER 권한 추가 (이미 되어 있음!)
```javascript
allow create, update: if isManagerOrAbove();  // ✅ 이미 MANAGER 포함
```

**방법 2**: 엑셀 가져오기 페이지 접근 제한 해제
- 현재는 모든 로그인 사용자가 접근 가능
- MANAGER 계정으로 로그인 후 테스트

### Q3: 특정 컬렉션만 ADMIN만 쓰기 가능하게 하고 싶어요

예: `inspectors` 컬렉션은 ADMIN만
```javascript
match /inspectors/{inspectorId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();  // ADMIN만!
}
```

---

## ✅ 최종 체크리스트

- [ ] Firestore Rules 복사
- [ ] Firebase Console에서 Rules 탭 열기
- [ ] 규칙 붙여넣기
- [ ] **"게시" 버튼 클릭**
- [ ] 브라우저 새로고침 (Ctrl + F5)
- [ ] ADMIN 계정으로 로그인
- [ ] 데이터 가져오기 페이지 테스트

---

## 🎉 완료 후 확인

성공적으로 적용되면:
- ✅ ADMIN/MANAGER는 데이터 가져오기 가능
- ✅ INSPECTOR/VIEWER는 읽기만 가능
- ✅ 보안 규칙이 제대로 작동
- ✅ 권한 오류 없이 대량 데이터 업로드 가능

---

## 📞 추가 도움

이 방법으로도 문제가 해결되지 않으면:
1. 콘솔 로그 전체 복사
2. 현재 Firestore Rules 전체 복사
3. 사용자 역할 확인 (Firestore에서 `users` 컬렉션)

위 정보를 제공하면 더 정확한 진단이 가능합니다!
