# 🔥 Firebase Security Rules 설정 가이드

## 📋 문제 상황

회원가입 시 다음과 같은 오류가 발생하는 경우:
```
FirebaseError: Missing or insufficient permissions.
```

**원인**: Firestore Security Rules에서 `users` 컬렉션에 대한 쓰기 권한이 없기 때문입니다.

**증상**:
1. ✅ Firebase Authentication 계정은 생성됨
2. ❌ Firestore `users` 컬렉션에 사용자 정보가 저장되지 않음
3. 🔴 로그인은 가능하지만 역할(role) 정보가 없어 시스템 오작동

---

## 🛠️ 해결 방법

### 1단계: Firebase Console 접속

1. https://console.firebase.google.com/ 접속
2. 프로젝트 `hvac-management-477fb` 선택
3. 좌측 메뉴에서 **Firestore Database** 클릭
4. 상단 탭에서 **규칙(Rules)** 선택

### 2단계: Security Rules 수정

기존 규칙을 아래 내용으로 교체:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================
    // users 컬렉션: 사용자 정보
    // ========================================
    match /users/{userId} {
      // 회원가입 시 본인 문서 생성 허용
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // 본인 문서 읽기 허용
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // 본인 문서 수정은 본인 또는 admin만 허용
      allow update: if request.auth != null && (
        request.auth.uid == userId || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      
      // 삭제는 admin만
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ========================================
    // sites 컬렉션: 현장 정보
    // ========================================
    match /sites/{siteId} {
      // 모든 인증된 사용자 읽기 허용
      allow read: if request.auth != null;
      
      // 매니저, 관리자만 쓰기 허용
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // ========================================
    // buildings 컬렉션: 건물 정보
    // ========================================
    match /buildings/{buildingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // ========================================
    // equipment 컬렉션: 장비 정보
    // ========================================
    match /equipment/{equipmentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // ========================================
    // inspections 컬렉션: 점검 기록
    // ========================================
    match /inspections/{inspectionId} {
      // 모든 인증된 사용자 읽기 허용
      allow read: if request.auth != null;
      
      // 점검자, 관리자만 점검 기록 생성/수정 허용 (매니저 제외)
      allow create, update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['inspector', 'admin'];
      
      // 삭제는 admin만
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ========================================
    // 기타 모든 컬렉션
    // ========================================
    match /{document=**} {
      // 기본적으로 인증된 사용자만 읽기 허용
      allow read: if request.auth != null;
      // 쓰기는 admin만
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 3단계: 규칙 게시

1. **게시(Publish)** 버튼 클릭
2. 확인 대화상자에서 **확인** 클릭

---

## ✅ 테스트

### 회원가입 테스트:
1. https://noyorc.github.io/hvac-management/signup.html 접속
2. 이메일, 비밀번호, 이름, 역할 입력
3. **회원가입** 버튼 클릭
4. ✅ "회원가입이 완료되었습니다!" 메시지 확인
5. Firebase Console > Firestore Database > users 컬렉션에서 사용자 문서 생성 확인

### 로그인 테스트:
1. https://noyorc.github.io/hvac-management/login.html 접속
2. 생성한 계정으로 로그인
3. ✅ 메인 페이지로 리다이렉트
4. ✅ 역할에 맞는 메뉴 표시 확인

---

## 🔒 보안 규칙 설명

### users 컬렉션:
- ✅ **create**: 회원가입 시 본인 UID로만 문서 생성 가능
- ✅ **read**: 본인 문서만 읽기 가능
- ⚠️ **update**: 본인 또는 admin만 수정 가능
- 🔴 **delete**: admin만 삭제 가능

### sites, buildings, equipment 컬렉션:
- ✅ **read**: 모든 인증된 사용자
- ⚠️ **write**: manager, admin만 가능

### inspections 컬렉션:
- ✅ **read**: 모든 인증된 사용자
- ⚠️ **create/update**: inspector, admin만 가능 (manager 제외)
- 🔴 **delete**: admin만 가능

---

## 🚨 문제 해결

### 문제 1: "Missing or insufficient permissions" 오류
**해결**: 위의 Security Rules를 적용하세요.

### 문제 2: 이미 생성된 Auth 계정에 role이 없는 경우
**해결**:
1. Firebase Console > Authentication에서 해당 계정 삭제
2. 또는 Firestore > users 컬렉션에 수동으로 문서 추가:
   - 문서 ID: Auth UID
   - 필드:
     - `email`: 이메일 주소
     - `name`: 사용자 이름
     - `role`: "inspector", "manager", "admin" 중 하나
     - `created_at`: Firestore 타임스탬프
     - `updated_at`: Firestore 타임스탬프

### 문제 3: 회원가입 후 자동 로그인되는 문제
**해결**: 코드가 이미 수정되어 Auth 계정 생성 후 Firestore 저장 실패 시 생성된 계정을 자동 삭제합니다.

---

## 📊 역할별 권한 매트릭스

| 기능 | INSPECTOR | MANAGER | ADMIN |
|------|:---------:|:-------:|:-----:|
| 회원가입 (본인) | ✅ | ✅ | ✅ |
| 장비 점검 수행 | ✅ | ❌ | ✅ |
| QR 스캔 | ✅ | ✅ | ✅ |
| 정비내역 조회 | ✅ | ✅ | ✅ |
| 관리 대시보드 | ✅ | ✅ | ✅ |
| 장비 검색 | ✅ | ✅ | ✅ |
| 장비 관리 (CRUD) | ❌ | ✅ | ✅ |
| 사용자 관리 | ❌ | ❌ | ✅ |
| 시스템 관리 | ❌ | ❌ | ✅ |

---

## 📚 참고 자료

- [Firebase Security Rules 공식 문서](https://firebase.google.com/docs/firestore/security/get-started)
- [Security Rules 테스트 가이드](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Role-based Access Control (RBAC)](https://firebase.google.com/docs/firestore/security/rules-conditions#building_complex_rules)

---

**작성일**: 2025-03-31  
**프로젝트**: HVAC Equipment Management System  
**리포지터리**: https://github.com/NOYORC/hvac-management
