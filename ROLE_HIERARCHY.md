# 🎯 HVAC 시스템 역할 체계 재정의

## 📋 기존 문제점

### 잘못된 명칭:
- **MANAGER**: 실제로는 "조회만 가능" (점검 불가)
- **INSPECTOR**: 실제로는 "점검 + 조회 + 추가 확인" (가장 높은 현장 권한)

### 혼란스러운 계층:
```
기존 (잘못됨):
INSPECTOR (점검자) < MANAGER (관리자) < ADMIN (시스템 관리자)
      ↑ 실제로는 더 많은 권한

실제 (올바름):
MANAGER (조회만) < INSPECTOR (점검+조회) < ADMIN (총괄)
```

---

## ✅ 새로운 역할 체계

### 역할 정의:

| 역할 | 영문명 | 한글명 | 권한 | 설명 |
|------|--------|--------|------|------|
| **pending** | - | 승인 대기 | ❌ 없음 | 회원가입 후 승인 전 |
| **viewer** | Viewer | 조회자 | 📖 조회만 | 기존 manager 역할 (점검 내역 조회만) |
| **inspector** | Inspector | 점검자 | 🔧 점검 + 조회 + 추가 확인 | 현장 점검 수행 + 문제 장비 재점검 |
| **manager** | Manager | 관리자 | 🛠️ 장비 관리 + 모든 조회 | 장비/사이트 데이터 관리 |
| **admin** | Admin | 시스템 관리자 | 👑 모든 권한 | 사용자/시스템 전체 관리 |

---

## 🔐 역할별 상세 권한

### 1. **pending** (승인 대기)
- 상태: 회원가입 완료, 관리자 승인 대기
- 로그인: ❌ 차단
- 알림: "계정 승인 대기 중"

### 2. **viewer** (조회자) - 기존 manager
- ✅ 대시보드 조회
- ✅ 점검 내역 조회
- ✅ 장비 정보 조회
- ✅ QR 스캔 → 정비내역만 조회
- ❌ 점검 수행 불가
- ❌ 장비 수정/삭제 불가
- ❌ 사용자 관리 불가

**사용 사례**: 감사팀, 경영진, 외부 검토자

### 3. **inspector** (점검자)
- ✅ **모든 viewer 권한**
- ✅ 장비 점검 수행
- ✅ 점검 기록 작성
- ✅ QR 스캔 → 점검 시작
- ✅ 문제 장비 추가 점검
- ✅ 점검 데이터 수정 (본인 작성분)
- ❌ 장비 마스터 데이터 수정 불가
- ❌ 사용자 관리 불가

**사용 사례**: 현장 점검 담당자, 기술자

### 4. **manager** (관리자) - 새로운 역할
- ✅ **모든 inspector 권한**
- ✅ 장비 추가/수정/삭제
- ✅ 사이트/건물 관리
- ✅ 점검자 데이터 관리
- ✅ 모든 점검 기록 수정
- ❌ 사용자 승인/역할 변경 불가
- ❌ 시스템 설정 불가

**사용 사례**: 현장 관리자, 팀장

### 5. **admin** (시스템 관리자)
- ✅ **모든 manager 권한**
- ✅ 사용자 승인/거절
- ✅ 역할 변경
- ✅ 시스템 설정
- ✅ 모든 데이터 삭제
- ✅ 감사 로그 조회

**사용 사례**: IT 관리자, 시스템 운영자

---

## 📊 권한 매트릭스

| 기능 | pending | viewer | inspector | manager | admin |
|------|:-------:|:------:|:---------:|:-------:|:-----:|
| **로그인** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **대시보드 조회** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **점검 내역 조회** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **장비 정보 조회** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **QR 스캔 (조회)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **장비 점검 수행** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **점검 기록 작성** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **QR 스캔 (점검)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **문제 장비 재점검** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **본인 점검 수정** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **장비 관리 (CRUD)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **사이트/건물 관리** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **모든 점검 수정** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **사용자 승인** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **역할 변경** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **시스템 관리** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🔄 마이그레이션 계획

### 기존 사용자 역할 변경:

```javascript
// 기존 manager → viewer
{
  role: 'manager',  // 기존
  // ↓ 변경
  role: 'viewer'    // 새로운
}

// 기존 inspector → 그대로 유지
{
  role: 'inspector'  // 유지
}

// 기존 admin → 그대로 유지
{
  role: 'admin'  // 유지
}
```

### 자동 마이그레이션 스크립트:
```javascript
const users = await getDocs(collection(db, 'users'));
users.forEach(async (userDoc) => {
    const data = userDoc.data();
    
    // 기존 manager를 viewer로 변경
    if (data.role === 'manager' && data.status === 'active') {
        await updateDoc(userDoc.ref, { 
            role: 'viewer',
            updated_at: new Date(),
            migration_note: 'Auto-migrated from manager to viewer'
        });
        console.log(`✅ Migrated ${data.email}: manager → viewer`);
    }
});
```

---

## 📝 코드 변경 필요 파일

### 1. Constants (역할 정의)
- `js/auth-manager.js`: USER_ROLES 객체 업데이트

### 2. Security Rules
- Firebase Firestore Rules: viewer 권한 추가

### 3. UI 업데이트
- `signup.html`: 기본값 viewer로 변경
- `user-approval.html`: viewer 옵션 추가
- `js/main.js`: viewer 메뉴 설정
- `js/equipment-search.js`: viewer 점검 버튼 숨김
- `qr-scanner.html`: viewer 점검 버튼 숨김

### 4. 권한 체크
- `PAGE_PERMISSIONS`: viewer는 inspection.html, qr-scanner.html 접근 가능하지만 점검 버튼 숨김
- `isManagerOrAbove()`: 헬퍼 함수 → `isManagerOrAdmin()`로 변경

---

## 🎯 구현 우선순위

### Phase 1 (필수):
1. ✅ USER_ROLES에 viewer 추가
2. ✅ 회원가입 기본값 viewer로 변경
3. ✅ user-approval.html에 viewer 옵션 추가
4. ✅ 기존 manager 사용자를 viewer로 마이그레이션

### Phase 2 (UI):
5. ✅ viewer용 메뉴 설정 (dashboard만, 점검 제외)
6. ✅ QR 스캔 페이지에서 viewer는 점검 버튼 숨김
7. ✅ 장비 검색 페이지에서 viewer는 점검 버튼 숨김

### Phase 3 (Security Rules):
8. ✅ Firestore Rules에 viewer 권한 추가
9. ✅ inspections 컬렉션: viewer는 read만
10. ✅ equipment 컬렉션: viewer는 read만

---

## 🚀 배포 순서

1. **코드 배포** (역할 정의 + UI 업데이트)
2. **기존 사용자 마이그레이션** (manager → viewer)
3. **Security Rules 업데이트**
4. **테스트 및 검증**

---

## ✅ 예상 효과

### 명확한 역할 구분:
- ✅ viewer: 조회만 (감사팀)
- ✅ inspector: 점검 수행 (현장 기술자)
- ✅ manager: 데이터 관리 (팀장)
- ✅ admin: 시스템 총괄 (IT 관리자)

### 보안 강화:
- 🔒 역할별 명확한 권한 분리
- 🔒 최소 권한 원칙 적용
- 🔒 승인 대기 시스템 유지

### 운영 효율:
- 📈 역할 이름과 실제 권한 일치
- 📈 직관적인 권한 관리
- 📈 유연한 역할 할당

---

**작성일**: 2025-03-31  
**목적**: 역할 체계 재정의 및 viewer 역할 추가  
**영향**: 기존 manager 사용자 마이그레이션 필요
