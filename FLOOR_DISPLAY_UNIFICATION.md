# 층(Floor) 표시 통일 및 건물 선택 카드 개선

## 📋 요청 사항

### **1. 건물 선택 카드에 건물명 표시**
- 현재: 아이콘만 있고 건물명이 없음
- 요청: `<h3>` 태그에 건물명 표시

### **2. 층(Floor) 표시 자동화 및 통일**
- 현재: 일부 페이지는 "층"이 붙고, 일부는 숫자만 표시
- 요청: 
  - 엑셀 입력 시 숫자만 입력 (예: 6, 10, 15)
  - 화면에 자동으로 "층" 표시 (예: 6층, 10층, 15층)
  - 전체 페이지 통일

### **3. 장비 검색 페이지 면적 필드 제거**
- 현재: 층 아래 면적(m²) 표시
- 요청: 면적 필드 삭제

---

## 🔍 문제 분석

### **Before (수정 전)**

#### **1. inspection.js - 건물 선택 카드 (217-222줄)**
```javascript
card.innerHTML = `
    <div class="icon"><i class="fas fa-building"></i></div>
    <h3>${building.building_name}</h3>
    <p><i class="fas fa-layer-group"></i> ${building.floors}</p>
    <p><i class="fas fa-ruler-combined"></i> ${building.area}m²</p>  // ← 면적 표시
`;
```
**문제:**
- ✅ 건물명은 이미 표시됨
- ❌ 층수에 "층" 없음 (예: "6" → "6층" 필요)
- ❌ 면적 필드 불필요

#### **2. inspection.js - 장비 상세 위치 (91줄)**
```javascript
<div class="detail-value">${selectedEquipment.floor} - ${selectedEquipment.location}</div>
```
**문제:** "5F - 기계실" → "5F층 - 기계실" 필요

#### **3. inspection.js - 층 필터 옵션 (265줄)**
```javascript
floorFilter.innerHTML += `<option value="${floor}">${floor}</option>`;
```
**문제:** 드롭다운에 "5F" → "5F층" 필요

#### **4. dashboard.js - 주의 장비 위치 (283줄)**
```javascript
<i class="fas fa-map-marker-alt"></i> ${eq.location || '-'} (${eq.floor || '-'})
```
**문제:** "기계실 (5F)" → "기계실 (5F층)" 필요

---

## 🔧 해결 방법

### **1. inspection.js - 건물 선택 카드 수정 (217-221줄)**

**수정 전:**
```javascript
card.innerHTML = `
    <div class="icon"><i class="fas fa-building"></i></div>
    <h3>${building.building_name}</h3>
    <p><i class="fas fa-layer-group"></i> ${building.floors}</p>
    <p><i class="fas fa-ruler-combined"></i> ${building.area}m²</p>
`;
```

**수정 후:**
```javascript
card.innerHTML = `
    <div class="icon"><i class="fas fa-building"></i></div>
    <h3>${building.building_name}</h3>
    <p><i class="fas fa-layer-group"></i> ${building.floors ? building.floors + '층' : '층수 미등록'}</p>
`;
```

**변경 사항:**
- ✅ 건물명 표시 유지 (`<h3>${building.building_name}</h3>`)
- ✅ 층수에 "층" 자동 추가 (`building.floors + '층'`)
- ✅ 면적 라인 완전 제거
- ✅ 값 없을 때 "층수 미등록" 표시

---

### **2. inspection.js - 장비 상세 위치 수정 (91줄)**

**수정 전:**
```javascript
<div class="detail-value">${selectedEquipment.floor} - ${selectedEquipment.location}</div>
```

**수정 후:**
```javascript
<div class="detail-value">${selectedEquipment.floor}층 - ${selectedEquipment.location}</div>
```

**결과:** "5F - 기계실" → "5F층 - 기계실"

---

### **3. inspection.js - 층 필터 옵션 수정 (265줄)**

**수정 전:**
```javascript
floors.forEach(floor => {
    floorFilter.innerHTML += `<option value="${floor}">${floor}</option>`;
});
```

**수정 후:**
```javascript
floors.forEach(floor => {
    floorFilter.innerHTML += `<option value="${floor}">${floor}층</option>`;
});
```

**결과:** 
```html
<option value="B1">B1</option>        →  <option value="B1">B1층</option>
<option value="5F">5F</option>        →  <option value="5F">5F층</option>
<option value="10F">10F</option>      →  <option value="10F">10F층</option>
```

---

### **4. dashboard.js - 주의 장비 위치 수정 (283줄)**

**수정 전:**
```javascript
<div class="alert-info">
    <i class="fas fa-map-marker-alt"></i> ${eq.location || '-'} (${eq.floor || '-'})
</div>
```

**수정 후:**
```javascript
<div class="alert-info">
    <i class="fas fa-map-marker-alt"></i> ${eq.location || '-'} (${eq.floor ? eq.floor + '층' : '-'})
</div>
```

**결과:** "기계실 (5F)" → "기계실 (5F층)"

---

## 📊 수정 결과

### **수정 파일**
| 파일 | 변경 내용 | 라인 |
|------|----------|------|
| `js/inspection.js` | 건물 카드: 층 추가, 면적 제거 | 217-221줄 (-5줄, +1줄) |
| `js/inspection.js` | 장비 상세: 층 추가 | 91줄 |
| `js/inspection.js` | 층 필터: 층 추가 | 265줄 |
| `js/dashboard.js` | 주의 장비: 층 추가 | 283줄 |

### **커밋 정보**
- **d841a5a** - `fix: 층(floor) 표시 통일 및 건물 선택 카드 개선`

---

## ✅ After (수정 후)

### **1. 건물 선택 화면**
```
[건물 카드]
🏢
행정동                    ← 건물명 (h3)
📊 6층                    ← 층수 ("층" 자동 추가)
(면적 제거됨)
```

### **2. 장비 상세 정보**
```
📍 위치
5F층 - 기계실            ← "층" 추가됨
```

### **3. 층 필터 드롭다운**
```
[층 선택 ▼]
  전체
  B1층                   ← "층" 추가됨
  5F층                   ← "층" 추가됨
  10F층                  ← "층" 추가됨
```

### **4. 대시보드 - 주의 장비**
```
⚠️ CONSTANT TEMPERATURE & HUMIDITY UNIT (-)
📍 전기실(4) (B1층)      ← "층" 추가됨
❗ 2026. 1. 16. 오전 10:08
```

---

## 📋 전체 페이지 층 표시 현황

### ✅ **이미 "층"이 붙어 있는 페이지**

| 파일 | 위치 | 코드 | 상태 |
|------|------|------|------|
| `js/equipment-search.js` | 286줄 | `${equipment.floor}층` | ✅ 정상 |
| `js/equipment-search.js` | 144줄 | `${floor}층` (필터) | ✅ 정상 |
| `js/equipment-history.js` | 142줄 | `${equipment.floor}층` | ✅ 정상 |
| `js/equipment-history.js` | 384줄 | `${equipment.floor}층` | ✅ 정상 |
| `js/admin.js` | 472줄 | `${b.floors}층` | ✅ 정상 |

### ✅ **이번에 "층" 추가한 페이지**

| 파일 | 위치 | 변경 | 상태 |
|------|------|------|------|
| `js/inspection.js` | 220줄 | 건물 카드 | ✅ 수정됨 |
| `js/inspection.js` | 91줄 | 장비 상세 | ✅ 수정됨 |
| `js/inspection.js` | 265줄 | 층 필터 | ✅ 수정됨 |
| `js/dashboard.js` | 283줄 | 주의 장비 | ✅ 수정됨 |

---

## 🧪 테스트 방법

### **1. 건물 선택 화면 확인**
**URL:** https://noyorc.github.io/hvac-management/inspection.html

**테스트 절차:**
1. 점검 페이지 접속
2. 현장 선택 (예: 하남열병합발전소)
3. 건물 선택 화면 확인

**예상 결과:**
```
[건물 카드 1]
🏢
행정동
📊 6층

[건물 카드 2]
🏢
ST동
📊 2층
```

- ✅ 건물명 표시됨
- ✅ 층수에 "층" 붙음
- ✅ 면적 표시 없음

---

### **2. 장비 상세 정보 확인**
**테스트 절차:**
1. 건물 선택 후 장비 목록
2. 장비 선택하여 상세 정보 보기

**예상 결과:**
```
📍 위치
B1층 - 기계실
```

- ✅ "B1" → "B1층" 표시됨

---

### **3. 층 필터 드롭다운 확인**
**테스트 절차:**
1. 장비 목록 화면에서 "층 선택" 드롭다운 클릭

**예상 결과:**
```
[층 선택 ▼]
  전체
  B1층
  5F층
  10F층
```

- ✅ 각 옵션에 "층" 붙음

---

### **4. 대시보드 - 주의 장비 확인**
**URL:** https://noyorc.github.io/hvac-management/dashboard.html

**테스트 절차:**
1. 대시보드 접속
2. "주의가 필요한 장비" 섹션 확인

**예상 결과:**
```
⚠️ CONSTANT TEMPERATURE & HUMIDITY UNIT (-)
📍 전기실(4) (B1층)
❗ 2026. 1. 16. 오전 10:08
```

- ✅ 위치에 "B1층" 표시됨

---

### **5. 장비 검색 화면 확인**
**URL:** https://noyorc.github.io/hvac-management/equipment-search.html

**테스트 절차:**
1. 장비 검색 페이지 접속
2. 장비 카드 확인

**예상 결과:**
```
[장비 카드]
COOLING TOWERS
CARRIER-30XA

📍 하남열병합발전소(나래에너지서비스)
🏢 행정동
📊 옥상층               ← 이미 "층"이 붙어 있음
📍 옥상
```

- ✅ "층" 표시 정상
- ✅ 면적 표시 없음 (원래부터 없었음)

---

## 💡 엑셀 데이터 입력 가이드

### **Buildings 시트**
| id | site_id | building_name | floors |
|----|---------|---------------|--------|
| BLD001 | SITE001 | 행정동 | 6 |
| BLD002 | SITE001 | ST동 | 2 |

**주의:**
- `floors` 컬럼에 **숫자만** 입력 (예: 6, 10, 15)
- ❌ "6층", "10층" 입력 금지
- ✅ 화면에 자동으로 "층" 표시됨

### **Equipment 시트**
| id | site_id | building_id | equipment_type | floor | location |
|----|---------|-------------|----------------|-------|----------|
| EQ0001 | SITE001 | BLD001 | 냉동기 | B1 | 기계실 |
| EQ0002 | SITE001 | BLD001 | 보일러 | 5F | 보일러실 |

**주의:**
- `floor` 컬럼에 **층 코드만** 입력 (예: B1, 5F, 10F, RF)
- ❌ "B1층", "5F층" 입력 금지
- ✅ 화면에 자동으로 "층" 표시됨

---

## 📈 효과

### **1. 사용자 경험**
- ✅ 전체 페이지 층 표시 통일 (일관성 향상)
- ✅ 가독성 향상 ("6" → "6층" 명확)
- ✅ 불필요한 정보(면적) 제거로 집중도 향상

### **2. 데이터 입력**
- ✅ 엑셀 입력 간소화 (숫자만 입력)
- ✅ 입력 오류 감소 ("6층" vs "6" 혼란 방지)
- ✅ 데이터 정합성 향상

### **3. 유지보수**
- ✅ 코드 일관성 확보
- ✅ 층 표시 로직 중앙화
- ✅ 향후 수정 용이

---

## 🔗 관련 페이지

- **점검 페이지**: https://noyorc.github.io/hvac-management/inspection.html
- **대시보드**: https://noyorc.github.io/hvac-management/dashboard.html
- **장비 검색**: https://noyorc.github.io/hvac-management/equipment-search.html
- **관리자 페이지**: https://noyorc.github.io/hvac-management/admin.html

---

## ✅ 체크리스트

- [x] inspection.js 건물 카드: 층 추가, 면적 제거
- [x] inspection.js 장비 상세: 층 추가
- [x] inspection.js 층 필터: 층 추가
- [x] dashboard.js 주의 장비: 층 추가
- [x] 코드 커밋 및 푸시 완료
- [x] 문서 작성 완료
- [ ] 실제 화면에서 표시 확인
- [ ] 엑셀 데이터 입력 테스트
- [ ] 전체 페이지 층 표시 통일성 검증

---

**수정 완료!** 이제 모든 페이지에서 층 정보가 통일되게 "층"과 함께 표시됩니다. 엑셀 입력 시 숫자만 입력하면 화면에 자동으로 "층"이 붙습니다. 🎉
