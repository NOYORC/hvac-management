# 🔐 회원가입 보안 강화 가이드

## 🚨 지적하신 보안 문제점

### 현재 문제:
1. ✅ **자동 로그인**: 회원가입 시 Firebase Auth가 자동으로 로그인 상태로 만듦
2. ✅ **역할 선택**: 사용자가 직접 inspector/manager 선택 가능
3. ✅ **즉시 접근**: 승인 절차 없이 바로 시스템 사용 가능
4. 🔴 **보안 위험**: 악의적 사용자가 manager로 가입하면 모든 데이터 수정/삭제 가능!

---

## ✅ 구현된 해결책

### 1️⃣ 승인 대기 시스템

#### 회원가입 시:
```javascript
// signup.html - 변경됨
await setDoc(doc(db, 'users', uid), {
    email: email,
    name: name,
    role: 'inspector',      // 기본값 고정
    status: 'pending',      // ⭐ 승인 대기 상태
    created_at: timestamp,
    updated_at: timestamp
});

// 즉시 로그아웃 (자동 로그인 방지)
await signOut(auth);

// 사용자에게 알림
alert('회원가입 신청이 완료되었습니다!\n관리자 승인 후 사용 가능합니다.');
```

#### 로그인 시:
```javascript
// js/auth-manager.js - getUserRole()
if (status === 'pending') {
    alert('⏳ 계정 승인 대기 중\n\n관리자 승인 후 로그인이 가능합니다.');
    return null;  // 로그인 차단
}

// onAuthStateChanged에서 role이 null이면 자동 로그아웃
if (userRole === null) {
    await signOut(auth);
    return;
}
```

### 2️⃣ 역할 선택 제거

#### Before:
```html
<select id="role" required>
    <option value="">역할을 선택하세요</option>
    <option value="inspector">점검자 (INSPECTOR)</option>
    <option value="manager">매니저 (MANAGER)</option>  <!-- ❌ 보안 위험 -->
</select>
```

#### After:
```html
<select id="role" style="display: none;">
    <option value="inspector" selected>점검자 (INSPECTOR)</option>
</select>

<div class="info-box">
    회원가입 시 기본적으로 <strong>점검자(INSPECTOR)</strong> 역할로 신청됩니다.
    매니저 또는 관리자 권한이 필요한 경우 승인 시 관리자가 변경합니다.
</div>
```

### 3️⃣ 사용자 승인 관리 페이지

#### 새로 추가된 페이지: `user-approval.html`

**기능**:
- ✅ 승인 대기 사용자 목록 조회
- ✅ 사용자 승인 (status: pending → active)
- ✅ 사용자 거절 (Firestore 문서 삭제)
- ✅ 활성 사용자 역할 변경 (inspector ↔ manager ↔ admin)
- ✅ admin 권한만 접근 가능

**접근**:
```
URL: https://noyorc.github.io/hvac-management/user-approval.html
권한: admin만 접근 가능
```

---

## 📊 변경 내용 요약

| 항목 | 변경 전 | 변경 후 | 효과 |
|------|---------|---------|------|
| 역할 선택 | ✅ 사용자가 선택 | ❌ 기본값 inspector | 보안 강화 |
| 회원가입 후 | ✅ 자동 로그인 | ✅ 즉시 로그아웃 | 자동 로그인 방지 |
| status 필드 | ❌ 없음 | ✅ pending/active | 승인 시스템 |
| 로그인 시 | ✅ 즉시 접근 | ⏳ 승인 대기 차단 | 무단 접근 차단 |
| 역할 변경 | ❌ 불가능 | ✅ 관리자 페이지 | 유연한 권한 관리 |

---

## 🔧 Firebase Security Rules 추가 수정 필요

현재 규칙에 `status` 필드 검증을 추가해야 합니다:

### 수정 필요:
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  // ✅ 기존: 회원가입 시 본인 문서 생성 허용
  allow create: if request.auth != null && request.auth.uid == userId;
  
  // ⭐ 추가: update 시 status 검증
  allow update: if isAuthenticated() && (
    // 본인 정보 수정 (단, status는 변경 불가)
    (request.auth.uid == userId && 
     request.resource.data.status == resource.data.status) ||
    // 또는 관리자
    isAdmin()
  );
  
  allow delete: if isAdmin();
}
```

**이유**: 일반 사용자가 본인의 `status`를 'pending'에서 'active'로 변경하는 것을 방지

---

## 🚀 적용 방법

### 1단계: 코드 배포
```bash
# 이미 커밋 및 푸시 완료 예정
git add .
git commit -m "feat: 회원가입 승인 시스템 추가"
git push origin main
```

### 2단계: Firebase Security Rules 업데이트
```
1. Firebase Console > Firestore Database > 규칙
2. FIREBASE_RULES_MINIMAL_FIX.md의 규칙 복사
3. users 컬렉션의 update 규칙에 status 검증 추가
4. 게시
```

### 3단계: 테스트

#### 신규 회원가입 테스트:
```
1. https://noyorc.github.io/hvac-management/signup.html
2. 정보 입력 (역할 선택 필드 제거됨 확인)
3. 회원가입 클릭
4. ✅ "관리자 승인 후 사용 가능" 메시지 확인
5. ✅ 자동 로그아웃 확인 (login.html로 리다이렉트)
6. ❌ 생성한 계정으로 로그인 시도 → "승인 대기 중" 알림 후 로그인 차단
```

#### 관리자 승인 테스트:
```
7. admin 계정으로 로그인
8. https://noyorc.github.io/hvac-management/user-approval.html 접속
9. "승인 대기" 탭에서 신규 사용자 확인
10. "승인" 버튼 클릭
11. ✅ Firestore에서 status: 'pending' → 'active' 변경 확인
```

#### 승인 후 로그인 테스트:
```
12. 로그아웃
13. 승인된 계정으로 로그인
14. ✅ 메인 페이지 접속 성공
15. ✅ inspector 역할에 맞는 메뉴 표시
```

#### 역할 변경 테스트:
```
16. admin 계정으로 user-approval.html 접속
17. "활성 사용자" 탭 클릭
18. 특정 사용자의 "역할 변경" 버튼 클릭
19. manager 선택 후 변경
20. ✅ Firestore에서 role: 'inspector' → 'manager' 확인
21. 해당 사용자 재로그인 시 manager 메뉴 표시 확인
```

---

## 🔒 보안 강화 효과

### Before (취약):
```
1. 악의적 사용자가 회원가입
2. manager 역할 선택
3. 즉시 로그인 → 모든 장비 데이터 접근 가능
4. 장비 삭제, 수정 가능 → 데이터 손실 위험!
```

### After (안전):
```
1. 사용자가 회원가입 (자동으로 inspector)
2. 즉시 로그아웃 → 자동 로그인 차단
3. 로그인 시도 → "승인 대기 중" 알림 후 차단
4. 관리자가 수동 승인 → status: 'active'로 변경
5. 승인 후에만 로그인 가능
6. 역할 변경도 관리자만 가능
```

---

## 📋 추가 권장사항

### 1. 이메일 알림 (선택사항)
- 회원가입 시 관리자에게 알림 이메일
- 승인 완료 시 사용자에게 알림 이메일
- Firebase Cloud Functions 또는 sendGrid API 사용

### 2. 승인 요청 사유 (선택사항)
```html
<!-- signup.html에 추가 -->
<textarea id="reason" placeholder="가입 사유를 간단히 작성해주세요"></textarea>
```

### 3. 승인 거절 시 Auth 계정 자동 삭제
현재는 Firestore 문서만 삭제되고 Auth 계정은 수동 삭제 필요.
Firebase Admin SDK를 사용하면 자동 삭제 가능 (Cloud Functions 필요).

### 4. 승인 대기 기간 제한
- 7일 이상 승인 대기 중인 계정 자동 삭제
- Cloud Functions의 scheduled function 사용

---

## 🎯 다음 단계

### 필수:
1. ✅ Firebase Security Rules에 status 검증 추가
2. ✅ 기존 사용자들에게 status: 'active' 필드 추가 (마이그레이션)
3. ✅ admin 계정 확인 (최소 1명의 admin 필요)

### 선택:
4. 메인 페이지에 사용자 승인 링크 추가 (admin 메뉴)
5. 이메일 알림 기능 추가
6. 승인 요청 사유 필드 추가
7. 승인 대기 기간 제한 설정

---

## 🛠️ 기존 사용자 마이그레이션

기존 사용자들은 status 필드가 없으므로 추가 필요:

### 방법 1: Firebase Console (수동)
```
1. Firebase Console > Firestore Database > users 컬렉션
2. 각 문서 클릭 → 필드 추가
3. 필드명: status, 값: 'active'
```

### 방법 2: 스크립트 (자동)
```javascript
// scripts/migrate-user-status.html
const users = await getDocs(collection(db, 'users'));
users.forEach(async (doc) => {
    if (!doc.data().status) {
        await updateDoc(doc.ref, { status: 'active' });
    }
});
```

---

## ✅ 결론

**질문**: "아무나 아이디를 생성하고 접근할 수 있을 것 같은데 어떻게 생각해?"

**답변**: 
- ✅ **정확한 지적입니다!** 중대한 보안 취약점이었습니다.
- ✅ **해결 완료**: 승인 대기 시스템 구현
- ✅ **보안 강화**: 역할 선택 제거 + 자동 로그인 방지
- ✅ **관리 기능**: 관리자 승인 페이지 추가

**효과**:
- 🔒 무단 회원가입 차단
- 🔒 악의적 사용자의 manager 역할 취득 방지
- 🔒 모든 신규 사용자는 관리자 승인 필요
- ✅ 관리자가 역할 직접 할당 가능

---

**작성일**: 2025-03-31  
**문제**: 무단 회원가입 및 역할 선택 보안 취약점  
**해결**: 승인 대기 시스템 + 역할 고정 + 자동 로그아웃  
**파일**: signup.html, js/auth-manager.js, user-approval.html (신규)
