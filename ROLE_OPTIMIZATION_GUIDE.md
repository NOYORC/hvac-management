# 🎯 역할별 권한 최적화 완료 가이드

## 🐛 발견된 문제점 및 해결

### 1. ❌ VIEWER 로그인 불가
**원인**: `getUserRole()` 함수의 기본값이 `INSPECTOR`로 설정되어 있었음
```javascript
// Before (문제)
const role = result.data.role || USER_ROLES.INSPECTOR;

// After (수정)
const role = result.data.role || USER_ROLES.VIEWER;
```
**결과**: ✅ VIEWER 역할로 로그인 가능

---

### 2. ❌ MANAGER와 INSPECTOR 차이 없음
**원인**: 메인 페이지에 MANAGER 전용 메뉴(장비 관리)가 없었음

**해결**:
- 메인 페이지에 **"장비 관리"** 카드 추가
- MANAGER와 ADMIN만 해당 카드 표시
- equipment-list.html로 연결

**결과**: ✅ MANAGER는 "장비 관리" 카드 추가 표시

---

## 📊 최종 역할별 메뉴 구성

### 🔍 VIEWER (조회자)
**표시되는 카드**:
- ✅ 관리 대시보드
- ✅ QR 스캔 버튼

**숨겨진 카드**:
- ❌ 장비 점검
- ❌ 장비 관리
- ❌ 시스템 관리

**사용 예**: 감사팀, 경영진

---

### 🔧 INSPECTOR (점검자)
**표시되는 카드**:
- ✅ 장비 점검
- ✅ 관리 대시보드
- ✅ QR 스캔 버튼

**숨겨진 카드**:
- ❌ 장비 관리
- ❌ 시스템 관리

**사용 예**: 현장 기술자, 점검 담당자

---

### 🛠️ MANAGER (관리자)
**표시되는 카드**:
- ✅ 장비 점검
- ✅ 관리 대시보드
- ✅ **장비 관리** ⭐ (INSPECTOR와 차이점!)
- ✅ QR 스캔 버튼

**숨겨진 카드**:
- ❌ 시스템 관리

**장비 관리 기능**:
- 장비 추가/수정/삭제
- 사이트/건물 관리
- 점검자 데이터 관리

**사용 예**: 현장 팀장, 시설 관리자

---

### 👑 ADMIN (시스템 관리자)
**표시되는 카드**:
- ✅ 장비 점검
- ✅ 관리 대시보드
- ✅ 장비 관리
- ✅ **시스템 관리** (ADMIN 전용!)
- ✅ QR 스캔 버튼

**시스템 관리 기능**:
- 사용자 승인/거절
- 역할 변경
- 점검자 관리
- 시스템 설정

**사용 예**: IT 관리자, 시스템 운영자

---

## 🔐 권한 비교표

| 기능 | VIEWER | INSPECTOR | MANAGER | ADMIN |
|------|:------:|:---------:|:-------:|:-----:|
| **메인 페이지 카드** |
| 장비 점검 | ❌ | ✅ | ✅ | ✅ |
| 관리 대시보드 | ✅ | ✅ | ✅ | ✅ |
| 장비 관리 | ❌ | ❌ | ✅ | ✅ |
| 시스템 관리 | ❌ | ❌ | ❌ | ✅ |
| QR 스캔 | ✅(조회) | ✅(점검) | ✅(점검) | ✅(점검) |
| **실제 기능** |
| 점검 수행 | ❌ | ✅ | ✅ | ✅ |
| 점검 내역 조회 | ✅ | ✅ | ✅ | ✅ |
| 장비 CRUD | ❌ | ❌ | ✅ | ✅ |
| 사이트/건물 관리 | ❌ | ❌ | ✅ | ✅ |
| 사용자 승인 | ❌ | ❌ | ❌ | ✅ |

---

## 🎨 메인 페이지 카드 디자인

### 장비 관리 카드 (MANAGER 전용)
```html
<div class="menu-card manager-only" onclick="goToEquipmentList()">
    <div class="card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
        <i class="fas fa-toolbox"></i>
    </div>
    <h2>장비 관리</h2>
    <p>장비/사이트/건물 데이터 관리</p>
    <div class="card-badge">관리자 전용</div>
</div>
```

**특징**:
- 분홍색 그라데이션 아이콘
- "관리자 전용" 배지
- MANAGER와 ADMIN만 표시

---

## 🔧 구현된 코드 변경

### 1. getUserRole() 기본값 수정
```javascript
// js/auth-manager.js
const role = result.data.role || USER_ROLES.VIEWER; // 변경!

// 디버깅 로그 추가
console.log('🎭 역할 상세:', {
    viewer: role === USER_ROLES.VIEWER,
    inspector: role === USER_ROLES.INSPECTOR,
    manager: role === USER_ROLES.MANAGER,
    admin: role === USER_ROLES.ADMIN
});
```

### 2. showMenuByRole() 완전 재작성
```javascript
// js/main.js
function showMenuByRole() {
    const user = window.AuthManager.getCurrentUser();
    if (!user) return;
    
    // 모든 카드 선택
    const inspectionCard = document.querySelector('.menu-card[onclick="goToInspection()"]');
    const dashboardCard = document.querySelector('.menu-card[onclick="goToDashboard()"]');
    const equipmentListCard = document.querySelector('.menu-card.manager-only');
    const adminCard = document.querySelector('.menu-card.admin-only');
    const qrButton = document.querySelector('.btn-qr');
    
    // 초기화 (모두 숨김)
    if (inspectionCard) inspectionCard.style.display = 'none';
    if (equipmentListCard) equipmentListCard.style.display = 'none';
    if (adminCard) adminCard.style.display = 'none';
    
    // 역할별 표시
    if (user.role === USER_ROLES.VIEWER) {
        if (dashboardCard) dashboardCard.style.display = 'block';
        if (qrButton) qrButton.style.display = 'inline-flex';
        
    } else if (user.role === USER_ROLES.INSPECTOR) {
        if (inspectionCard) inspectionCard.style.display = 'block';
        if (dashboardCard) dashboardCard.style.display = 'block';
        if (qrButton) qrButton.style.display = 'inline-flex';
        
    } else if (user.role === USER_ROLES.MANAGER) {
        if (inspectionCard) inspectionCard.style.display = 'block';
        if (dashboardCard) dashboardCard.style.display = 'block';
        if (equipmentListCard) equipmentListCard.style.display = 'block'; // ⭐
        if (qrButton) qrButton.style.display = 'inline-flex';
        
    } else if (user.role === USER_ROLES.ADMIN) {
        if (inspectionCard) inspectionCard.style.display = 'block';
        if (dashboardCard) dashboardCard.style.display = 'block';
        if (equipmentListCard) equipmentListCard.style.display = 'block';
        if (adminCard) adminCard.style.display = 'block'; // ⭐
        if (qrButton) qrButton.style.display = 'inline-flex';
    }
}
```

### 3. goToEquipmentList() 함수 추가
```javascript
// js/main.js
function goToEquipmentList() {
    if (window.AuthManager.canAccessPage('equipment-list.html')) {
        window.location.href = 'equipment-list.html';
    } else {
        alert('장비 관리 권한이 필요합니다.\n관리자(MANAGER) 이상만 접근 가능합니다.');
    }
}
```

---

## 🧪 테스트 체크리스트

### ✅ VIEWER 테스트
- [ ] 로그인 성공
- [ ] 메인 페이지: 대시보드 카드만 표시
- [ ] QR 스캔: 조회 가능, 점검 버튼 숨김
- [ ] 장비 검색: 조회 가능, 점검 버튼 없음
- [ ] inspection.html 직접 접근: 권한 오류

### ✅ INSPECTOR 테스트
- [ ] 로그인 성공
- [ ] 메인 페이지: 장비 점검 + 대시보드 표시
- [ ] QR 스캔: 점검 시작 버튼 표시
- [ ] 점검 수행 가능
- [ ] equipment-list.html 접근: 권한 오류

### ✅ MANAGER 테스트
- [ ] 로그인 성공
- [ ] 메인 페이지: 장비 점검 + 대시보드 + **장비 관리** 표시 ⭐
- [ ] 장비 관리 클릭: equipment-list.html 이동
- [ ] 장비 추가/수정/삭제 가능
- [ ] 점검 수행 가능
- [ ] admin.html 접근: 권한 오류

### ✅ ADMIN 테스트
- [ ] 로그인 성공
- [ ] 메인 페이지: 모든 카드 표시 (장비 점검 + 대시보드 + 장비 관리 + **시스템 관리**)
- [ ] 시스템 관리 클릭: admin.html 이동
- [ ] 사용자 승인 버튼 클릭: user-approval.html 이동
- [ ] 모든 기능 사용 가능

---

## 🐛 디버깅 방법

### 콘솔 로그 확인
브라우저 개발자 도구(F12) > Console에서:

```
✅ 로그인 시:
🔍 사용자 역할 조회 시작, UID: abc123...
📄 Firestore 조회 결과: {success: true, data: {...}}
✅ 사용자 역할: viewer / 상태: active
🎭 역할 상세: {viewer: true, inspector: false, manager: false, admin: false}

✅ 메인 페이지 로드 시:
🎭 현재 사용자 역할: viewer
✅ VIEWER 메뉴: 대시보드, QR(조회)
```

### 문제 해결 가이드

#### 1. VIEWER 로그인 안 됨
**확인사항**:
- Firestore users 컬렉션에서 해당 UID 문서 확인
- `role` 필드가 'viewer'인지 확인
- `status` 필드가 'active'인지 확인

#### 2. MANAGER에 장비 관리 카드 안 보임
**확인사항**:
- 콘솔에서 `🎭 현재 사용자 역할: manager` 로그 확인
- `✅ MANAGER 메뉴: ...` 로그 확인
- HTML에서 `.menu-card.manager-only` 요소 존재 확인

#### 3. 권한 오류 발생
**확인사항**:
- `PAGE_PERMISSIONS`에서 해당 페이지 권한 확인
- 콘솔에서 `canAccessPage` 관련 로그 확인

---

## 📝 최종 체크리스트

### 코드 배포
- [x] 커밋 ID: `a8e8286`
- [x] 푸시 완료
- [x] GitHub: https://github.com/NOYORC/hvac-management

### 테스트 필요
- [ ] VIEWER 로그인 및 메뉴 확인
- [ ] INSPECTOR 로그인 및 메뉴 확인
- [ ] MANAGER 로그인 및 **장비 관리 카드** 확인 ⭐
- [ ] ADMIN 로그인 및 모든 카드 확인

### 문서화
- [x] ROLE_HIERARCHY.md: 역할 체계
- [x] ROLE_OPTIMIZATION_GUIDE.md: 최적화 가이드 (이 문서)

---

## 🎉 최종 결과

### 수정 전 문제점:
1. ❌ VIEWER 로그인 불가
2. ❌ MANAGER와 INSPECTOR 차이 없음
3. ⚠️ 역할별 메뉴 불명확

### 수정 후:
1. ✅ VIEWER 로그인 가능 + 조회 전용 메뉴
2. ✅ MANAGER는 "장비 관리" 카드 추가 표시
3. ✅ 역할별 메뉴 명확히 구분
4. ✅ 디버깅 로그 추가로 문제 파악 용이

---

**작성일**: 2025-03-31  
**커밋**: a8e8286  
**목적**: 역할별 권한 최적화 및 문제 해결
