# 🐛 버그 수정: MANAGER 역할이 INSPECTOR로 변경되는 문제

## 📋 문제 요약

### 증상
- MANAGER로 로그인 후 "장비 관리" 버튼 클릭 시 접근 거부
- 콘솔 로그에서 역할이 `manager` → `inspector`로 변경됨
- 에러 메시지: "접근 오류: 'Inspector'"

### 재현 단계
1. MANAGER 계정으로 로그인
2. 메인 페이지에서 "장비 관리" 카드 클릭
3. `equipment-list.html` 페이지로 이동
4. 권한 확인 로직에서 역할이 `inspector`로 변경되어 접근 거부

---

## 🔍 원인 분석

### 1. 근본 원인
`equipment-list.html`에서 `AuthManager.getCurrentUser()`를 호출할 때, 내부적으로 `getUserRole(uid)`가 다시 호출되면서 문제가 발생했습니다.

### 2. 상세 흐름

#### ❌ 문제가 있던 코드 흐름
```javascript
// equipment-list.html (문제 코드)
await window.AuthManager.initialize();  // ← AuthManager 초기화
const currentUser = window.AuthManager.getCurrentUser();  // ← 여기서 문제 발생
```

**AuthManager.getCurrentUser() 내부:**
```javascript
// js/auth-manager.js의 getUserRole() 함수
async getUserRole(uid) {
    try {
        // FirestoreHelper가 없으면 기본값 반환
        if (!window.FirestoreHelper) {
            console.warn('⚠️ FirestoreHelper 없음, 기본 역할 반환');
            return USER_ROLES.INSPECTOR;  // ← 여기서 INSPECTOR로 변경!
        }
        // ... 나머지 코드
    } catch (error) {
        console.error('❌ 역할 조회 오류:', error);
        return USER_ROLES.INSPECTOR;  // ← 에러 시에도 INSPECTOR로 변경!
    }
}
```

### 3. 왜 FirestoreHelper가 없었나?

`equipment-list.html`은 Firebase를 직접 초기화했지만, **FirestoreHelper를 별도로 로드하지 않았습니다.**

```html
<!-- equipment-list.html에서 Firebase만 초기화 -->
<script type="module">
    import { initializeApp } from 'firebase-app.js';
    import { getFirestore, ... } from 'firebase-firestore.js';
    // FirestoreHelper는 로드 안 함! ❌
</script>
```

반면 다른 페이지들(index.html, dashboard.html 등)은 별도의 Helper 스크립트를 로드했을 가능성이 있습니다.

### 4. 왜 다른 페이지는 문제가 없었나?

- **index.html, dashboard.html** 등은 이미 로그인 후 sessionStorage에 저장된 역할 정보를 그대로 사용
- `equipment-list.html`만 **새로 AuthManager를 초기화하면서** `getUserRole()`을 재호출
- FirestoreHelper 없음 → 에러 발생 → 기본값 `INSPECTOR` 반환

---

## ✅ 해결 방법

### 수정 내용
`equipment-list.html`에서 **AuthManager를 거치지 않고 sessionStorage를 직접 읽도록** 변경했습니다.

#### ✅ 수정된 코드
```javascript
// equipment-list.html (수정 후)
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 장비 관리 페이지 초기화 시작');

    // sessionStorage에서 사용자 정보 직접 읽기 (더 빠르고 안정적)
    const storedUser = sessionStorage.getItem('auth_user');
    if (!storedUser) {
        console.error('❌ 로그인 필요 (sessionStorage에 사용자 정보 없음)');
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }

    let currentUser;
    try {
        currentUser = JSON.parse(storedUser);
    } catch (e) {
        console.error('❌ 사용자 정보 파싱 오류:', e);
        alert('로그인 정보가 손상되었습니다. 다시 로그인해주세요.');
        window.location.href = 'login.html';
        return;
    }

    console.log('✅ 현재 사용자:', currentUser.email, '역할:', currentUser.role);

    // USER_ROLES 상수 정의 (auth-manager.js와 동일)
    const USER_ROLES = {
        VIEWER: 'viewer',
        INSPECTOR: 'inspector',
        MANAGER: 'manager',
        ADMIN: 'admin'
    };

    // 권한 확인 (MANAGER 또는 ADMIN만 접근 가능)
    if (currentUser.role !== USER_ROLES.MANAGER && currentUser.role !== USER_ROLES.ADMIN) {
        console.error('❌ 권한 없음:', currentUser.role);
        alert('장비 관리는 매니저 또는 관리자만 접근할 수 있습니다.\n\n현재 역할: ' + currentUser.role);
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ 권한 확인 완료 - 장비 목록 로드');
    await loadEquipmentList();
});
```

### 수정의 장점

1. **더 빠름**: AuthManager 초기화를 기다릴 필요 없음
2. **더 안정적**: `getUserRole()` 재호출로 인한 역할 변경 문제 제거
3. **의존성 감소**: FirestoreHelper에 의존하지 않음
4. **명확한 에러 메시지**: 권한 거부 시 현재 역할을 명시

---

## 🧪 테스트 방법

### 1. MANAGER 계정 테스트
```bash
1. MANAGER 계정으로 로그인
2. 메인 페이지에서 "장비 관리" 카드 클릭
3. equipment-list.html 페이지 정상 접근 확인
4. 콘솔 로그 확인:
   ✅ 현재 사용자: managerdhvac.com 역할: manager
   ✅ 권한 확인 완료 - 장비 목록 로드
```

### 2. INSPECTOR 계정 테스트
```bash
1. INSPECTOR 계정으로 로그인
2. 메인 페이지에서 "장비 관리" 카드가 보이지 않는지 확인
3. URL 직접 입력: equipment-list.html
4. 접근 거부 메시지 확인:
   "장비 관리는 매니저 또는 관리자만 접근할 수 있습니다.
    현재 역할: inspector"
```

### 3. VIEWER 계정 테스트
```bash
1. VIEWER 계정으로 로그인
2. 메인 페이지에서 "장비 관리" 카드가 보이지 않는지 확인
3. URL 직접 입력: equipment-list.html
4. 접근 거부 메시지 확인:
   "장비 관리는 매니저 또는 관리자만 접근할 수 있습니다.
    현재 역할: viewer"
```

### 4. ADMIN 계정 테스트
```bash
1. ADMIN 계정으로 로그인
2. 메인 페이지에서 "장비 관리" 카드 클릭
3. equipment-list.html 페이지 정상 접근 확인
4. 장비 추가/수정/삭제 기능 모두 테스트
```

---

## 📊 비교표

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **AuthManager 의존** | ✅ 필요 | ❌ 불필요 |
| **FirestoreHelper 의존** | ✅ 필요 | ❌ 불필요 |
| **getUserRole() 호출** | ✅ 재호출 | ❌ 호출 안 함 |
| **역할 변경 버그** | ❌ 발생 | ✅ 해결 |
| **로딩 속도** | 느림 | 빠름 |
| **에러 메시지** | 모호함 | 명확함 |

---

## 🔐 보안 고려사항

### sessionStorage 사용의 안전성
1. **XSS 공격 위험**: sessionStorage는 JavaScript로 접근 가능하므로 XSS 공격에 취약할 수 있습니다.
   - **현재 대책**: CSP(Content Security Policy) 헤더 사용 권장
   
2. **세션 유지**: 탭을 닫으면 sessionStorage가 자동 삭제되어 보안성 향상

3. **서버 검증**: Firestore Security Rules로 서버 측에서도 권한을 다시 확인
   ```javascript
   // Firebase Security Rules
   match /equipment/{equipmentId} {
     allow read: if request.auth != null;
     allow write: if request.auth != null && 
       (getUserRole(request.auth.uid) == 'manager' || 
        getUserRole(request.auth.uid) == 'admin');
   }
   ```

---

## 📝 향후 개선 방향

### 1. FirestoreHelper 통합
- 모든 페이지에서 FirestoreHelper를 공통으로 로드하도록 구조 개선
- `js/firestore-helper.js` 파일 생성 및 표준화

### 2. AuthManager 개선
- `getUserRole()` 함수에서 에러 시 기본값 반환하지 않고 `null` 반환
- 명시적인 에러 처리 추가

### 3. 중앙 집중식 권한 관리
```javascript
// 권장: 공통 권한 확인 함수
function checkPageAccess(requiredRoles) {
    const user = getStoredUser();
    if (!user || !requiredRoles.includes(user.role)) {
        redirectToUnauthorized();
        return false;
    }
    return true;
}
```

---

## 📚 참고 자료

### 관련 파일
- `equipment-list.html` - 장비 관리 페이지
- `js/auth-manager.js` - 인증 관리자
- `js/main.js` - 메인 페이지 로직

### 관련 커밋
- `9af1f10` - fix: 장비 관리 페이지 역할 확인 로직 수정
- `95b7cfb` - feat: 장비 관리 페이지 추가 (MANAGER/ADMIN 전용)
- `a8e8286` - fix: 역할별 권한 및 메뉴 표시 최적화

### 라이브 배포
- **리포지토리**: https://github.com/NOYORC/hvac-management
- **라이브 사이트**: https://noyorc.github.io/hvac-management/
- **장비 관리 페이지**: https://noyorc.github.io/hvac-management/equipment-list.html

---

## ✅ 체크리스트

- [x] 버그 원인 파악
- [x] 코드 수정
- [x] 로컬 테스트
- [x] Git 커밋
- [x] GitHub 푸시
- [x] 배포 확인
- [x] 문서화 완료

---

**작성일**: 2026-03-31  
**작성자**: Claude (AI Assistant)  
**버그 수정 커밋**: `9af1f10`
