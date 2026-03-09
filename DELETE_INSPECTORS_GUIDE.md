# 🗑️ Inspectors 컬렉션 삭제 가이드

## 📋 개요

**날짜**: 2026-03-09  
**작업**: 레거시 `inspectors` 컬렉션 삭제  
**이유**: Firebase Authentication 기반 `users` 컬렉션으로 통합 완료

---

## 🔍 현재 상황 분석

### 중복된 데이터 구조

#### 1️⃣ **`inspectors` 컬렉션** (구 시스템 - 삭제 대상)

**위치**: Firestore → inspectors

**구조**:
```
inspectors/
├─ INSP001 { inspector_name: "이대윤" }
├─ INSP002 { inspector_name: "..." }
├─ INSP003 { inspector_name: "..." }
├─ ...
└─ INSP012 { inspector_name: "..." }
```

**특징**:
- 배포 전 임시 테스트 데이터
- 단순 구조 (id, inspector_name만)
- Firebase Authentication과 연동 안 됨
- 로그인 기능 없음
- 역할 관리 없음

**문제점**:
- ❌ 보안 취약 (인증 없음)
- ❌ 권한 관리 불가
- ❌ `users` 컬렉션과 중복
- ❌ 유지보수 복잡도 증가

---

#### 2️⃣ **`users` 컬렉션** (신 시스템 - 유지)

**위치**: Firestore → users

**구조**:
```
users/
├─ DEJoF4VgAHPIQS8pdnNNOtVrCEd2 {
│    email: "gkdms@dj.kr",
│    name: "강하은",
│    role: "admin",
│    created_at: "2026-02-26T06:08:56.564Z",
│    created_by: "dDRrdVWJxeZMxBpKinaXG5nvP823"
│  }
├─ KDwFnjYqTlaaUTd2BBFpcdF... { role: "manager", ... }
├─ cPKmZErq4UV9zmN48Dw1VyN... { role: "inspector", ... }
└─ dDRrdVWJxeZMxBpKinaXG5n... { role: "admin", ... }
```

**특징**:
- Firebase Authentication 완전 통합
- 완전한 구조 (email, name, role, created_at, created_by)
- 로그인/로그아웃 지원
- 역할 기반 접근 제어 (RBAC)
- 보안 규칙 연동

**장점**:
- ✅ 강력한 보안 (Firebase Auth)
- ✅ 세밀한 권한 관리 (inspector/manager/admin)
- ✅ 세션 관리 자동화
- ✅ 감사 로그 (created_at, created_by)

---

## ✅ 결론: `inspectors` 컬렉션 삭제 권장

### 이유

| 항목 | inspectors | users |
|------|-----------|-------|
| **인증** | ❌ 없음 | ✅ Firebase Auth |
| **역할 관리** | ❌ 없음 | ✅ inspector/manager/admin |
| **보안** | ❌ 취약 | ✅ 강력 |
| **로그인** | ❌ 불가 | ✅ 가능 |
| **권한 제어** | ❌ 없음 | ✅ RBAC |
| **유지보수** | ❌ 중복 | ✅ 단일 |

### 삭제 후 흐름

```
[삭제 전]
inspectors 컬렉션 (INSP001~012) ← 레거시
users 컬렉션 (Firebase Auth) ← 신규

[삭제 후]
users 컬렉션만 사용
├─ role: "inspector" → 점검자
├─ role: "manager" → 관리자
└─ role: "admin" → 시스템 관리자
```

---

## 🛠️ 삭제 방법

### 방법 1: 전용 삭제 페이지 사용 (권장)

**URL**:
```
https://noyorc.github.io/hvac-management/delete-inspectors-collection.html
```

**파일**: `/home/user/webapp/delete-inspectors-collection.html`

**절차**:
1. 위 URL 접속
2. 컬렉션 현황 확인 (문서 개수, 예상 소요 시간)
3. **"Inspectors 컬렉션 삭제"** 버튼 클릭
4. 확인 다이얼로그 2회 승인
5. 실시간 진행률 및 로그 확인
6. 완료 메시지 확인

**특징**:
- ✅ 실시간 진행률 표시
- ✅ 상세 로그 출력
- ✅ 안전장치 (이중 확인)
- ✅ 문서 개수 자동 확인
- ✅ 예상 소요 시간 계산

---

### 방법 2: Firebase Console에서 수동 삭제

**URL**:
```
https://console.firebase.google.com/project/hvac-management-477fb/firestore/data/~2Finspectors
```

**절차**:
1. Firestore Data 페이지 접속
2. 왼쪽 메뉴에서 `inspectors` 컬렉션 클릭
3. 문서 목록에서 INSP001 ~ INSP012 선택
4. 상단 메뉴에서 **"삭제"** 클릭
5. 확인 다이얼로그 승인

**장점**:
- ✅ 백업/Export 쉬움
- ✅ 선택적 삭제 가능

**단점**:
- ❌ 수동 작업 (시간 소요)
- ❌ 진행률 표시 없음

---

## ⚠️ 주의사항

### 삭제 전 확인

1. **백업 필요 여부**
   - 혹시 모를 경우를 대비해 Export 권장
   - Firebase Console → Firestore → Export

2. **코드 의존성 확인**
   - `inspectors` 컬렉션 참조하는 코드 검색
   - 있다면 `users` 컬렉션으로 변경 필요

3. **현재 사용자 계정 확인**
   - `users` 컬렉션에 필요한 사용자가 모두 있는지 확인
   - Authentication → Users 탭에서 확인

---

## 📝 코드 영향 분석

### `inspectors` 컬렉션을 참조하는 파일

| 파일 | 라인 | 용도 | 영향 | 조치 |
|------|------|------|------|------|
| **js/inspection.js** | 134, 151 | 점검자 목록 로드 | ⚠️ 중간 | users로 변경 필요 |
| **js/test-data-generator.js** | 178-191 | 테스트 데이터 생성 | ✅ 낮음 | 테스트용이므로 무시 가능 |
| **js/delete-firestore-data.js** | 35, 110, 126 | 데이터 삭제 도구 | ✅ 낮음 | 도구용이므로 무시 가능 |
| **setup-firebase-data.html** | 163-277 | 초기 데이터 생성 | ✅ 낮음 | 설정용이므로 무시 가능 |
| **migrate-data.html** | 207-336 | 데이터 마이그레이션 | ✅ 낮음 | 마이그레이션 완료 후 불필요 |
| **migrate-inspectors.html** | 126-226 | 점검자 마이그레이션 | ✅ 낮음 | 마이그레이션 완료 후 불필요 |

### ⚠️ **중요**: `js/inspection.js` 수정 필요

**현재 코드** (Line 134):
```javascript
const data = await window.CachedFirestoreHelper.getAllDocuments('inspectors');
```

**수정 필요** → `users` 컬렉션 사용:
```javascript
const data = await window.CachedFirestoreHelper.getAllDocuments('users');
// role이 'inspector'인 사용자만 필터링
const inspectors = data.filter(user => user.role === 'inspector');
```

---

## 🔧 코드 수정 가이드

### `js/inspection.js` 수정

**파일**: `/home/user/webapp/js/inspection.js`

**변경 전**:
```javascript
// 점검자 목록 로드 (Line 134)
const data = await window.CachedFirestoreHelper.getAllDocuments('inspectors');
if (data.success) {
    allInspectors = data.data;
    renderInspectorCards(allInspectors);
} else {
    console.error('점검자 로드 실패:', data.error);
    console.warn('Firebase 컬렉션 "inspectors"를 확인하세요.');
}
```

**변경 후**:
```javascript
// 점검자 목록 로드 (users 컬렉션 사용)
const data = await window.CachedFirestoreHelper.getAllDocuments('users');
if (data.success) {
    // role이 'inspector' 또는 'manager', 'admin'인 사용자 필터링
    allInspectors = data.data.filter(user => 
        user.role === 'inspector' || 
        user.role === 'manager' || 
        user.role === 'admin'
    );
    renderInspectorCards(allInspectors);
} else {
    console.error('점검자 로드 실패:', data.error);
    console.warn('Firebase 컬렉션 "users"를 확인하세요.');
}
```

**변경 사항**:
1. `'inspectors'` → `'users'`로 컬렉션 변경
2. `role` 필드로 점검자 필터링 추가
3. 에러 메시지 업데이트

---

## 📊 삭제 후 확인 사항

### 1. Firestore 확인
- Firebase Console → Firestore → Data
- `inspectors` 컬렉션이 사라졌는지 확인
- `users` 컬렉션에 필요한 사용자가 모두 있는지 확인

### 2. Authentication 확인
- Firebase Console → Authentication → Users
- 로그인 가능한 사용자 계정 확인
- 각 사용자의 UID와 Firestore `users` 문서 ID 일치 확인

### 3. 페이지 테스트
- **로그인 페이지**: https://noyorc.github.io/hvac-management/login.html
  - 테스트 계정으로 로그인 가능한지 확인
- **점검 페이지**: https://noyorc.github.io/hvac-management/inspection.html
  - 점검자 목록이 정상 표시되는지 확인 (수정 후)
- **시스템 관리**: https://noyorc.github.io/hvac-management/admin.html
  - "점검자 관리" 탭에서 사용자 목록 확인

---

## 🎯 작업 체크리스트

### 삭제 전

- [ ] `users` 컬렉션에 필요한 사용자 모두 확인
- [ ] Authentication에 로그인 계정 모두 생성 확인
- [ ] 백업 필요 시 Firestore Export 수행
- [ ] `js/inspection.js` 코드 수정 준비

### 삭제

- [ ] `delete-inspectors-collection.html` 페이지 접속
- [ ] 문서 개수 확인 (12개 예상)
- [ ] **"Inspectors 컬렉션 삭제"** 버튼 클릭
- [ ] 확인 다이얼로그 2회 승인
- [ ] 삭제 완료 메시지 확인

### 삭제 후

- [ ] Firestore에서 `inspectors` 컬렉션 사라짐 확인
- [ ] `js/inspection.js` 코드 수정 및 커밋
- [ ] 점검 페이지에서 점검자 목록 정상 표시 확인
- [ ] 로그인/로그아웃 테스트
- [ ] 역할별 권한 테스트

---

## 🚀 최종 시스템 구조

### 삭제 후 사용자 관리 흐름

```
1. 사용자 생성
   ↓
   admin.html → "점검자 관리" 탭
   → AuthManager.createUser(email, password, { name, role })
   ↓
   Firebase Authentication 계정 생성
   ↓
   Firestore users 컬렉션에 문서 추가

2. 사용자 로그인
   ↓
   login.html → 이메일/비밀번호 입력
   → AuthManager.login(email, password)
   ↓
   Firebase Authentication 인증
   ↓
   Firestore에서 role 조회
   ↓
   역할별 메인 페이지로 리다이렉트
   - inspector → index.html
   - manager → dashboard.html
   - admin → admin.html

3. 점검 수행
   ↓
   inspection.html → 점검자 목록 로드
   → CachedFirestoreHelper.getAllDocuments('users')
   → role로 필터링
   ↓
   점검 기록 저장
   → inspections 컬렉션에 저장
   → inspector_id = 현재 로그인 사용자 UID
```

---

## 🔗 관련 링크

### Firebase Console
- **Firestore Data**: https://console.firebase.google.com/project/hvac-management-477fb/firestore/data
- **Authentication**: https://console.firebase.google.com/project/hvac-management-477fb/authentication/users
- **Firestore Rules**: https://console.firebase.google.com/project/hvac-management-477fb/firestore/rules

### 배포 페이지
- **삭제 도구**: https://noyorc.github.io/hvac-management/delete-inspectors-collection.html
- **시스템 관리**: https://noyorc.github.io/hvac-management/admin.html
- **로그인**: https://noyorc.github.io/hvac-management/login.html

### GitHub
- **저장소**: https://github.com/NOYORC/hvac-management
- **커밋**: 4082980 - feat: inspectors 컬렉션 삭제 도구 추가

---

## 📞 문의

추가 질문이나 문제가 발생하면:
1. Firebase Console의 Logs 확인
2. 브라우저 개발자 도구 Console 확인
3. GitHub Issues에 문의

---

**🎉 모든 준비가 완료되었습니다!**

`inspectors` 컬렉션을 안전하게 삭제하고 `users` 컬렉션으로 완전히 통합하세요.
