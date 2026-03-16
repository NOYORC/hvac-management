# 대시보드 네비게이션 개선 가이드

## 📌 변경 사항 요약

**목적**: 
1. 관리 대시보드를 관리자(매니저/관리자)만 접근 가능하도록 명확히 제한
2. 주의가 필요한 장비 카드 클릭 시 정비내역 페이지로 이동
3. 최근 점검 내역 테이블 행 클릭 시 정비내역 페이지로 이동

---

## 🔐 접근 권한 개선

### **Before (이전)**
```
메인 페이지 → "관리 대시보드" 카드
- 표시: "관리자" 배지
- 동작: 클릭 시 권한 체크 후 이동
- 문제: "관리자"라고만 표시되어 매니저 접근 가능 여부 불명확
```

### **After (이후)**
```
메인 페이지 → "관리 대시보드" 카드
- 표시: "매니저/관리자" 배지
- 동작: 매니저 또는 관리자만 접근 가능
- 개선: 권한 명확히 표시 + 접근 제한 강화
```

---

## 🖱️ 클릭 네비게이션 추가

### 1. **주의가 필요한 장비 카드**

#### Before:
```
┌────────────────────────────────┐
│ COOLING TOWER (XXX-123)    주의 │
│ 📍 4층 전기실                  │
│ ⚠️ 냉매 압력 이상              │
│ 🕐 2025-03-16 10:30           │
└────────────────────────────────┘
[클릭 불가]
```

#### After:
```
┌────────────────────────────────┐
│ COOLING TOWER (XXX-123)    주의 │
│ 📍 4층 전기실                  │
│ ⚠️ 냉매 압력 이상              │
│ 🕐 2025-03-16 10:30           │
│ ──────────────────────────    │
│ 👆 클릭하여 정비내역 보기      │  ← 호버 시 표시
└────────────────────────────────┘
[클릭 가능 - 정비내역 페이지로 이동]
```

---

### 2. **최근 점검 내역 테이블**

#### Before:
```
┌────────────────────────────────────────────────────────┐
│ 점검일시  │ 점검자 │ 장비        │ 위치   │ 상태 │ ... │
├────────────────────────────────────────────────────────┤
│ 2025... │ 홍길동 │ TOWER      │ 4층   │ 정상 │ ... │
└────────────────────────────────────────────────────────┘
[클릭 불가]
```

#### After:
```
┌────────────────────────────────────────────────────────┐
│ 점검일시  │ 점검자 │ 장비        │ 위치   │ 상태 │ ... │
├────────────────────────────────────────────────────────┤
│ 2025... │ 홍길동 │ TOWER      │ 4층   │ 정상 │ ... │  ← 호버 시 배경색 변경
└────────────────────────────────────────────────────────┘
[클릭 가능 - 정비내역 페이지로 이동]
```

---

## 🔧 기술적 변경 사항

### 1. **접근 권한 강화** (`js/main.js`)

#### Before:
```javascript
function goToDashboard() {
    if (window.AuthManager.canAccessPage('dashboard.html')) {
        window.location.href = 'dashboard.html';
    } else {
        alert('관리자 권한이 필요합니다.');
    }
}
```

#### After:
```javascript
function goToDashboard() {
    const user = window.AuthManager.getCurrentUser();
    
    // 관리자만 접근 가능
    if (user && (user.role === window.USER_ROLES.MANAGER || user.role === window.USER_ROLES.ADMIN)) {
        window.location.href = 'dashboard.html';
    } else {
        alert('관리 대시보드는 관리자(매니저/관리자) 권한이 필요합니다.');
    }
}
```

**핵심 변경**:
- `canAccessPage()` → 직접 role 체크
- 에러 메시지 명확화: "매니저/관리자 권한 필요"

---

### 2. **주의 장비 카드 클릭 기능** (`js/dashboard.js`)

#### Before:
```javascript
alertList.innerHTML = alerts.map(insp => {
    return `
        <div class="alert-item" style="border-left: 4px solid ${statusColor}">
            <div class="alert-header">...</div>
            <div class="alert-info">...</div>
        </div>
    `;
}).join('');
```

#### After:
```javascript
alertList.innerHTML = alerts.map(insp => {
    return `
        <div class="alert-item clickable" 
             style="border-left: 4px solid ${statusColor}" 
             onclick="goToEquipmentHistory('${insp.equipment_id}')">
            <div class="alert-header">...</div>
            <div class="alert-info">...</div>
            <div class="alert-hint">
                <i class="fas fa-hand-pointer"></i> 클릭하여 정비내역 보기
            </div>
        </div>
    `;
}).join('');
```

**핵심 변경**:
- `clickable` 클래스 추가
- `onclick="goToEquipmentHistory('${insp.equipment_id}')"` 이벤트 핸들러
- `alert-hint` 힌트 텍스트 추가 (호버 시 표시)

---

### 3. **최근 점검 테이블 클릭 기능** (`js/dashboard.js`)

#### Before:
```javascript
tbody.innerHTML = recentInspections.map(insp => {
    return `
        <tr>
            <td>${formattedDate}</td>
            <td>${insp.inspector_name}</td>
            <td>${eq.equipment_type}</td>
            ...
        </tr>
    `;
}).join('');
```

#### After:
```javascript
tbody.innerHTML = recentInspections.map(insp => {
    return `
        <tr class="clickable-row" 
            onclick="goToEquipmentHistory('${insp.equipment_id}')" 
            title="클릭하여 정비내역 보기">
            <td>${formattedDate}</td>
            <td>${insp.inspector_name}</td>
            <td>${eq.equipment_type}</td>
            ...
        </tr>
    `;
}).join('');
```

**핵심 변경**:
- `clickable-row` 클래스 추가
- `onclick` 이벤트 핸들러
- `title` 속성으로 툴팁 표시

---

### 4. **네비게이션 함수 추가** (`js/dashboard.js`)

```javascript
// 정비내역 페이지로 이동
function goToEquipmentHistory(equipmentId) {
    if (!equipmentId) {
        alert('장비 정보를 찾을 수 없습니다.');
        return;
    }
    
    // equipment-history.html로 이동 (URL 파라미터로 equipment_id 전달)
    window.location.href = `equipment-history.html?equipment_id=${equipmentId}`;
}
```

**동작 원리**:
1. `equipmentId`를 URL 파라미터로 전달
2. `equipment-history.html`에서 파라미터를 읽어 해당 장비의 정비내역 로드
3. 예시: `equipment-history.html?equipment_id=ABC123`

---

### 5. **CSS 스타일 추가** (`css/dashboard.css`)

#### 주의 장비 카드 스타일:
```css
/* 클릭 가능한 alert-item 스타일 */
.alert-item {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s ease;
    position: relative;
}

.alert-item.clickable {
    cursor: pointer;
}

.alert-item.clickable:hover {
    transform: translateX(5px) translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    background: #ffffff;
}

.alert-hint {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #e0e0e0;
    font-size: 12px;
    color: #667eea;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 5px;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.alert-item.clickable:hover .alert-hint {
    opacity: 1;
}
```

**효과**:
- 호버 시 카드가 살짝 위로 이동 + 그림자 강화
- 힌트 텍스트가 페이드인 애니메이션으로 나타남
- 커서 모양 변경 (`cursor: pointer`)

---

#### 테이블 행 스타일:
```css
table tbody tr {
    transition: all 0.3s ease;
}

table tbody tr.clickable-row {
    cursor: pointer;
}

table tbody tr:hover {
    background: #f5f7fa;
}

table tbody tr.clickable-row:hover {
    background: #e8f0fe;
    transform: scale(1.01);
}
```

**효과**:
- 호버 시 배경색 변경 (`#e8f0fe` - 연한 파란색)
- 살짝 확대 효과 (`scale(1.01)`)
- 커서 모양 변경

---

## 📱 사용자 경험 개선

### **개선 전 (Before)**

**시나리오**: 관리자가 주의 장비를 발견했을 때
```
1. 대시보드에서 주의 장비 확인
2. 장비 ID 또는 위치를 기억
3. 메인 페이지로 이동
4. "장비 검색" 클릭
5. 검색 필터 설정
6. 장비 찾기
7. 정비내역 클릭
→ 총 7단계
```

### **개선 후 (After)**

**시나리오**: 관리자가 주의 장비를 발견했을 때
```
1. 대시보드에서 주의 장비 확인
2. 카드 클릭
→ 총 2단계 (5단계 단축!)
```

**편의성 향상**: 
- **클릭 횟수**: 7회 → 2회 (71% 감소)
- **소요 시간**: 약 30초 → 약 3초 (90% 감소)

---

## 🎯 실제 사용 흐름

### **시나리오 1: 주의 장비 확인**

1. **로그인**: https://noyorc.github.io/hvac-management/login.html
   - 이메일: admin@hvac.com
   - 비밀번호: hvac1234

2. **메인 페이지**에서 **"관리 대시보드"** 클릭
   - 매니저 또는 관리자만 접근 가능
   - 점검자는 "매니저/관리자 권한 필요" 메시지 표시

3. **대시보드**에서 **"주의가 필요한 장비"** 섹션 확인
   - 주의/경고/고장 상태 장비 자동 표시

4. **주의 장비 카드**에 마우스 올리기 (hover)
   - 카드가 살짝 위로 이동 + 그림자 강화
   - 하단에 "👆 클릭하여 정비내역 보기" 표시

5. **카드 클릭**
   - 자동으로 `equipment-history.html?equipment_id=ABC123`로 이동
   - 해당 장비의 전체 정비내역 로드

---

### **시나리오 2: 최근 점검 내역 확인**

1. **대시보드**에서 **"최근 점검 내역"** 테이블 확인
   - 최근 10개 점검 내역 표시

2. **테이블 행**에 마우스 올리기 (hover)
   - 배경색 연한 파란색으로 변경
   - 행이 살짝 확대 (1%)
   - 툴팁 표시: "클릭하여 정비내역 보기"

3. **행 클릭**
   - 자동으로 해당 장비의 정비내역 페이지로 이동
   - 시간순으로 정렬된 전체 점검 이력 표시

---

## ✅ 테스트 체크리스트

### **접근 권한 테스트**
- [ ] **점검자 계정**으로 로그인 → 대시보드 접근 시 "권한 필요" 메시지 확인
- [ ] **매니저 계정**으로 로그인 → 대시보드 정상 접근 확인
- [ ] **관리자 계정**으로 로그인 → 대시보드 정상 접근 확인
- [ ] 메인 페이지 대시보드 카드 배지가 "매니저/관리자"로 표시되는지 확인

### **주의 장비 클릭 테스트**
- [ ] 대시보드에서 주의 장비 카드에 호버 시 스타일 변경 확인
- [ ] 힌트 텍스트 "클릭하여 정비내역 보기" 표시 확인
- [ ] 카드 클릭 시 정비내역 페이지로 이동 확인
- [ ] 정비내역 페이지에서 해당 장비 정보 정상 표시 확인

### **최근 점검 테이블 클릭 테스트**
- [ ] 테이블 행에 호버 시 배경색 변경 확인
- [ ] 툴팁 "클릭하여 정비내역 보기" 표시 확인
- [ ] 행 클릭 시 정비내역 페이지로 이동 확인
- [ ] 정비내역 페이지에서 해당 장비 정보 정상 표시 확인

### **모바일 테스트**
- [ ] 모바일 화면에서 카드 클릭 동작 확인
- [ ] 모바일 화면에서 테이블 스크롤 및 클릭 확인

---

## 🔗 관련 파일

- **접근 권한**: `js/main.js` (라인 104-112)
- **주의 장비 클릭**: `js/dashboard.js` (라인 272-293)
- **최근 점검 클릭**: `js/dashboard.js` (라인 319-335)
- **네비게이션 함수**: `js/dashboard.js` (라인 618-626)
- **CSS 스타일**: `css/dashboard.css` (라인 155-227, 312-322)
- **메인 페이지**: `index.html` (라인 60-67)

---

## 📊 변경 요약

| 항목 | Before | After | 개선 효과 |
|------|--------|-------|----------|
| 대시보드 접근 | 점검자도 시도 가능 (거부됨) | 매니저/관리자만 명확히 표시 | 혼란 방지 |
| 주의 장비 확인 | 클릭 불가 | 클릭 시 정비내역 이동 | 7단계 → 2단계 |
| 최근 점검 확인 | 클릭 불가 | 클릭 시 정비내역 이동 | 빠른 접근 |
| 사용자 피드백 | 없음 | 호버 스타일 + 힌트 텍스트 | 직관성 향상 |

---

## 🚀 다음 단계

1. **코드 배포**: GitHub에 푸시 후 GitHub Pages 배포 대기 (2-3분)
2. **테스트**: 
   - 관리자 계정으로 대시보드 접근
   - 주의 장비 클릭 → 정비내역 이동 확인
   - 최근 점검 클릭 → 정비내역 이동 확인
3. **피드백 수집**: 실제 사용자 반응 확인

---

## 💡 추가 개선 아이디어

### **단기 (다음 업데이트)**
- 정비내역 페이지에서 대시보드로 돌아가는 버튼 추가
- 주의 장비 카드에 마지막 점검일 표시
- 테이블에 정렬 기능 추가 (날짜, 상태 등)

### **중기**
- 주의 장비 필터링 (주의/경고/고장 별도 탭)
- 정비내역 페이지에서 인접 장비 빠른 이동
- 알림 기능 (주의 장비 발생 시 관리자에게 알림)

### **장기**
- 예측 분석 (장비 고장 예측)
- 정비 일정 자동 추천
- 모바일 앱 푸시 알림

---

## 📞 문의

추가 기능 요청이나 개선 사항이 있으면 언제든지 말씀해주세요!
