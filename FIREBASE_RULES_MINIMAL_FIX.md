# 🔥 Firebase Security Rules - 최소 변경 가이드

## 📋 문제 상황

현재 `users` 컬렉션의 규칙:
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin();  // ❌ 문제: 회원가입 불가
  allow update: if isAuthenticated() && 
                   (request.auth.uid == userId || isAdmin());
  allow delete: if isAdmin();
}
```

**문제점**: 일반 사용자가 회원가입 시 자신의 문서를 생성할 수 없음

---

## ✅ 해결책: users 컬렉션만 수정

### 변경 전:
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin();  // ❌
  allow update: if isAuthenticated() && 
                   (request.auth.uid == userId || isAdmin());
  allow delete: if isAdmin();
}
```

### 변경 후:
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  // ✅ 회원가입: 본인 UID로 문서 생성 허용
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if isAuthenticated() && 
                   (request.auth.uid == userId || isAdmin());
  allow delete: if isAdmin();
}
```

---

## 📝 전체 수정된 규칙 (복사해서 사용)

아래 규칙을 복사하여 Firebase Console > Firestore Database > Rules에 붙여넣으세요:

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
      allow read: if isAuthenticated();                  // 로그인한 사용자는 읽기 가능
      allow create, update: if isManagerOrAbove();       // 관리자 이상만 생성/수정
      allow delete: if isAdmin();                        // 시스템 관리자만 삭제
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
      allow read: if isAuthenticated();                  // 모든 로그인 사용자 읽기 가능
      allow create: if isInspectorOrAbove();             // 점검자 이상 생성 가능
      allow update: if isInspectorOrAbove() && 
                       (request.auth.uid == resource.data.inspector_id || 
                        isManagerOrAbove());              // 작성자 또는 관리자만 수정
      allow delete: if isAdmin();                        // 시스템 관리자만 삭제
    }
    
    // 점검자 컬렉션
    match /inspectors/{inspectorId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isManagerOrAbove();
    }
    
    // 사용자 컬렉션 ⭐ 수정됨
    match /users/{userId} {
      allow read: if isAuthenticated();                  // 로그인한 사용자는 모든 사용자 정보 읽기 가능
      // ✅ 변경: 회원가입 시 본인 UID로 문서 생성 허용
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if isAuthenticated() && 
                       (request.auth.uid == userId ||     // 본인 정보 수정
                        isAdmin());                       // 또는 관리자
      allow delete: if isAdmin();                        // 관리자만 삭제
    }
  }
}
```

---

## 🔄 변경 내용 요약

### 변경된 부분 (단 1줄):
```diff
  match /users/{userId} {
    allow read: if isAuthenticated();
-   allow create: if isAdmin();
+   allow create: if request.auth != null && request.auth.uid == userId;
    allow update: if isAuthenticated() && 
                     (request.auth.uid == userId || isAdmin());
    allow delete: if isAdmin();
  }
```

### 효과:
- ✅ 회원가입 가능: 사용자가 본인 UID로 문서 생성 가능
- ✅ 보안 유지: 다른 사용자의 문서는 생성 불가
- ✅ 기존 기능 유지: 모든 다른 컬렉션 규칙 그대로

---

## 🚀 적용 방법

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트: `hvac-management-477fb`

2. **규칙 페이지로 이동**
   - 좌측 메뉴 > Firestore Database
   - 상단 탭 > 규칙(Rules)

3. **전체 규칙 교체**
   - 위의 "전체 수정된 규칙" 복사
   - 기존 내용 삭제 후 붙여넣기

4. **게시**
   - "게시(Publish)" 버튼 클릭
   - 확인 클릭

---

## 🧪 테스트

### 1. 회원가입 테스트:
```
1. https://noyorc.github.io/hvac-management/signup.html
2. 정보 입력 (test@hvac.com / test123 / 홍길동 / inspector)
3. 회원가입 버튼 클릭
4. ✅ "회원가입이 완료되었습니다!" 메시지 확인
5. Firebase Console > Firestore > users 컬렉션에서 문서 확인
```

### 2. 로그인 테스트:
```
6. 로그인 페이지에서 방금 생성한 계정으로 로그인
7. ✅ 메인 페이지로 이동
8. ✅ inspector 역할에 맞는 메뉴 표시 (장비 점검, QR 스캔)
```

### 3. 기존 기능 테스트:
```
9. 대시보드 접속 → 데이터 조회 확인
10. 장비 검색 → 장비 목록 확인
11. QR 스캔 → 장비 정보 조회 확인
12. 점검 수행 → 점검 기록 생성 확인
```

---

## ⚠️ 주의사항

### 보안 고려사항:

**현재 규칙**:
```javascript
allow read: if isAuthenticated();  // 모든 사용자 정보를 누구나 읽을 수 있음
```

**잠재적 문제**:
- inspector A가 manager B의 개인정보(이메일, 이름, 역할)를 볼 수 있음
- 보안상 민감하다면 본인 정보만 읽도록 제한 권장

**더 강화된 규칙 (선택사항)**:
```javascript
match /users/{userId} {
  // 본인 또는 admin만 읽기
  allow read: if isAuthenticated() && 
                 (request.auth.uid == userId || isAdmin());
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if isAuthenticated() && 
                   (request.auth.uid == userId || isAdmin());
  allow delete: if isAdmin();
}
```

⚠️ 단, 이렇게 변경하면 대시보드에서 다른 사용자의 점검 기록을 볼 때 점검자 이름이 안 보일 수 있습니다. 현재는 `allow read: if isAuthenticated();`를 유지하는 것을 권장합니다.

---

## 📊 변경 전후 비교

| 항목 | 변경 전 | 변경 후 | 효과 |
|------|---------|---------|------|
| 회원가입 | ❌ admin만 가능 | ✅ 본인 문서 생성 가능 | 회원가입 작동 |
| 사용자 읽기 | ✅ 모든 인증 사용자 | ✅ 동일 | 기존 기능 유지 |
| 사용자 수정 | ✅ 본인 또는 admin | ✅ 동일 | 기존 기능 유지 |
| 사용자 삭제 | ✅ admin만 | ✅ 동일 | 기존 기능 유지 |
| 장비/점검 | ✅ 기존과 동일 | ✅ 동일 | 기존 기능 유지 |

---

## ✅ 결론

**답변**: 아니요, FIREBASE_SETUP.md 전체로 교체하면 안 됩니다!

**이유**:
1. 기존 규칙이 헬퍼 함수로 잘 구조화되어 있음
2. 세부적인 권한 설정이 잘 되어 있음 (inspector_id 확인 등)
3. 단 1줄(`allow create`)만 수정하면 해결됨

**권장**:
- 위의 "전체 수정된 규칙"을 사용 (기존 + 1줄 수정)
- 기존 구조 유지 + 회원가입 기능만 추가

---

**작성일**: 2025-03-31  
**문제**: users 컬렉션 create 권한 오류  
**해결**: `allow create: if request.auth != null && request.auth.uid == userId;`
