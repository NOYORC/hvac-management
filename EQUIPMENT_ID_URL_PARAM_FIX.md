# 대시보드 equipment_id 전달 문제 해결

## 🐛 문제 요약

**증상**: 대시보드에서 주의 장비 또는 최근 점검 클릭 시 정비내역 페이지로 이동하지만, 장비 정보를 불러오지 못함

**원인**: URL 파라미터 이름 불일치
- **dashboard.js** (전송): `equipment_id` (언더스코어)
- **equipment-history.js** (수신): `equipmentId` (카멜케이스)

---

## 🔍 문제 발견 과정

### 1. 데이터 확인 (Firebase Console)
```javascript
// Firestore inspections 컬렉션
{
  equipment_id: "EQ0006",  ✅ 정상 존재
  inspector_name: "박상연",
  status: "정상",
  ...
}
```

### 2. 브라우저 콘솔 로그
```javascript
// dashboard.js 로그
Alert item - Inspection: ... equipment_id: EQ0001
Alert item - Inspection: ... equipment_id: EQ0004
Alert item - Inspection: ... equipment_id: EQ0006

Recent inspection - Inspection: ... equipment_id: EQ0001
Recent inspection - Inspection: ... equipment_id: EQ0006

goToEquipmentHistory called with equipmentId: EQ0006  ✅ 정상 전달
Navigating to equipment-history.html with equipment_id: EQ0006  ✅ 정상 전송
```

### 3. 코드 분석

#### dashboard.js (전송 측):
```javascript
// 주의 장비 카드
onclick="goToEquipmentHistory('${insp.equipment_id}')"

// 네비게이션 함수
function goToEquipmentHistory(equipmentId) {
    window.location.href = `equipment-history.html?equipment_id=${equipmentId}`;
    //                                          ^^^^^^^^^^^^^^^^
    //                                          언더스코어 사용!
}
```

#### equipment-history.js (수신 측) - **문제 발견!**
```javascript
// ❌ 잘못된 코드
const urlParams = new URLSearchParams(window.location.search);
equipmentId = urlParams.get('equipmentId');  // 카멜케이스로 읽음!
//                          ^^^^^^^^^^^^^
//                          equipment_id가 아닌 equipmentId를 찾음

if (!equipmentId) {
    alert('장비 ID가 없습니다.');  // ← 이 알림이 나타남!
    window.location.href = 'equipment-search.html';
}
```

**결과**: 
- URL: `equipment-history.html?equipment_id=EQ0006` ✅ 전송됨
- 읽기: `urlParams.get('equipmentId')` → `null` ❌ 읽지 못함

---

## ✅ 해결 방법

### 수정된 코드 (equipment-history.js):
```javascript
// ✅ 수정된 코드
const urlParams = new URLSearchParams(window.location.search);
equipmentId = urlParams.get('equipment_id') || urlParams.get('equipmentId');
//                          ^^^^^^^^^^^^^^^    ^^^^^^^^^^^^^^^
//                          우선순위 1          호환성 지원

console.log('URL 파라미터에서 받은 equipment_id:', equipmentId);

if (!equipmentId) {
    console.error('❌ 장비 ID가 URL 파라미터에 없습니다.');
    alert('장비 ID가 없습니다.');
    window.location.href = 'equipment-search.html';
    return;
}
```

**변경 사항**:
1. `equipment_id`를 우선적으로 읽음 (대시보드에서 전송한 형식)
2. 없으면 `equipmentId`를 읽음 (기존 호환성 유지)
3. 디버깅 로그 추가

---

## 📊 테스트 시나리오

### Before (수정 전):
```
1. 대시보드에서 주의 장비 "EQ0006" 클릭
2. URL: equipment-history.html?equipment_id=EQ0006 (전송 성공)
3. equipment-history.js: equipmentId = urlParams.get('equipmentId')
4. equipmentId === null (파라미터 이름 불일치)
5. Alert: "장비 ID가 없습니다."
6. 리다이렉트: equipment-search.html
```

### After (수정 후):
```
1. 대시보드에서 주의 장비 "EQ0006" 클릭
2. URL: equipment-history.html?equipment_id=EQ0006 (전송 성공)
3. equipment-history.js: equipmentId = urlParams.get('equipment_id')
4. equipmentId === "EQ0006" ✅ 성공!
5. 장비 정보 로드 및 정비내역 표시
```

---

## 🧪 테스트 방법

### 배포 후 테스트 (2-3분 후):

1. **대시보드 접속**: https://noyorc.github.io/hvac-management/dashboard.html
   - 로그인: admin@hvac.com / hvac1234

2. **주의 장비 테스트**:
   - "주의가 필요한 장비" 섹션으로 스크롤
   - 주의/경고/고장 장비 카드 클릭
   - **예상 결과**: 정비내역 페이지로 이동, 장비 정보 정상 표시

3. **최근 점검 테스트**:
   - "최근 점검 내역" 테이블로 스크롤
   - 테이블 행 클릭
   - **예상 결과**: 정비내역 페이지로 이동, 장비 정보 정상 표시

4. **브라우저 콘솔 확인** (F12):
   ```
   📋 정비내역 페이지 초기화 시작
   URL 파라미터에서 받은 equipment_id: EQ0006  ✅ 이 로그 확인!
   📊 장비 EQ0006 데이터 로딩 시작...
   ✅ 장비 정보 로드 완료: COOLING TOWER ...
   ```

---

## 🔗 관련 커밋

### Commit 1: `912c63b` - 디버깅 로그 추가
- dashboard.js에 equipment_id 로깅 추가
- goToEquipmentHistory() 함수 검증 강화

### Commit 2: `200b4ff` - **URL 파라미터 불일치 수정** ⭐
- equipment-history.js에서 `equipment_id` 우선 읽기
- `equipmentId` 호환성 지원
- 디버깅 로그 추가

### Commit 3: `98fcadb` - 임시 파일 정리
- debug_inspections.html 제거

---

## 📝 근본 원인 분석

### 왜 이런 문제가 발생했나?

1. **명명 규칙 불일치**:
   - Firebase Firestore 필드: `equipment_id` (스네이크 케이스)
   - JavaScript 변수: `equipmentId` (카멜 케이스)

2. **기존 코드**:
   - equipment-search.html에서 정비내역으로 이동 시:
     ```javascript
     // equipment-search.html (추정)
     location.href = `equipment-history.html?equipmentId=${eq.id}`;
     ```
   - 이전에는 `equipmentId`(카멜 케이스)를 사용했을 가능성

3. **새 코드 (dashboard.js)**:
   - Firestore 필드명을 그대로 사용: `equipment_id`
   - 일관성을 위해 좋은 선택이지만, 기존 코드와 불일치

---

## 💡 향후 방지 방법

### 1. **명명 규칙 통일**

**권장 규칙**:
- **Firestore 필드**: `snake_case` (equipment_id, site_id, building_id)
- **URL 파라미터**: `snake_case` (equipment_id, site_id)
- **JavaScript 변수**: `camelCase` (equipmentId, siteId)

**변환 예시**:
```javascript
// Firestore → URL (그대로)
const equipmentId = equipment.equipment_id;
location.href = `page.html?equipment_id=${equipmentId}`;

// URL → JavaScript (변수는 camelCase)
const urlParams = new URLSearchParams(window.location.search);
const equipmentId = urlParams.get('equipment_id');
```

### 2. **유틸리티 함수 사용**

```javascript
// js/utils.js (새로 생성 권장)

// URL 파라미터 읽기 (여러 형식 지원)
function getUrlParam(name, aliases = []) {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 우선순위: name → aliases
    let value = urlParams.get(name);
    if (!value) {
        for (const alias of aliases) {
            value = urlParams.get(alias);
            if (value) break;
        }
    }
    
    return value;
}

// 사용 예시
const equipmentId = getUrlParam('equipment_id', ['equipmentId', 'eq_id']);
```

### 3. **타입 체크 및 검증**

```javascript
function validateEquipmentId(equipmentId) {
    if (!equipmentId) {
        console.error('❌ equipment_id is null or undefined');
        return false;
    }
    
    if (equipmentId === 'undefined' || equipmentId === 'null') {
        console.error('❌ equipment_id is string "undefined" or "null"');
        return false;
    }
    
    if (typeof equipmentId !== 'string' || equipmentId.length === 0) {
        console.error('❌ equipment_id is not a valid string');
        return false;
    }
    
    return true;
}
```

---

## 📊 영향 범위

### 수정된 파일:
- ✅ `js/equipment-history.js` (URL 파라미터 읽기 수정)

### 영향받는 페이지:
- ✅ **dashboard.html** → equipment-history.html (이제 정상 작동)
- ⚠️ **equipment-search.html** → equipment-history.html (기존 호환성 유지)

### 호환성:
- ✅ `equipment_id` (새 형식, 우선)
- ✅ `equipmentId` (기존 형식, 호환성)
- ✅ 두 형식 모두 지원하므로 기존 링크도 정상 작동

---

## 🎯 테스트 체크리스트

### 배포 후 확인사항 (2-3분 후):

- [ ] **대시보드 → 주의 장비 클릭** → 정비내역 페이지 정상 표시
- [ ] **대시보드 → 최근 점검 클릭** → 정비내역 페이지 정상 표시
- [ ] **장비 검색 → 정비내역 클릭** → 정상 작동 (기존 기능 유지)
- [ ] **브라우저 콘솔** → "URL 파라미터에서 받은 equipment_id: EQxxxx" 로그 확인
- [ ] **장비 정보** → 상단 카드에 장비명, 모델, 위치 표시
- [ ] **점검 이력** → 테이블에 과거 점검 기록 표시

---

## 🚀 다음 단계

### 배포 상태 확인:
- **GitHub Actions**: https://github.com/NOYORC/hvac-management/actions

### 추가 개선 제안:
1. **URL 파라미터 유틸리티 함수** 작성 (향후)
2. **명명 규칙 문서화** (개발 가이드)
3. **전체 코드베이스** URL 파라미터 일관성 검토

---

## 📞 문의

문제가 해결되었는지 확인 부탁드립니다!

**테스트 후 피드백 주세요**:
- ✅ 정상 작동하나요?
- ❌ 여전히 문제가 있나요?
- 💡 추가 개선 사항이 있나요?
