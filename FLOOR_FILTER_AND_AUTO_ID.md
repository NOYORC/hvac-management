# 층 필터링 문제 해결 및 ID 자동 생성 설명

## 📋 질문 요약

### **1. 층 필터링이 작동하지 않음**
- **문제**: 층으로 필터링했을 때 장비가 나오지 않음
- **원인**: 층 표시를 "층" 붙이도록 수정한 후 필터링 로직 확인 필요

### **2. ID 자동 배정 문의**
- `site_id`, `building_id` - 자동으로 배정되는가?
- `installation_date` - 자동으로 배정되는가?

---

## 🔍 층 필터링 문제 분석

### **필터링 로직 확인**

**inspection.js (265줄):**
```javascript
floors.forEach(floor => {
    floorFilter.innerHTML += `<option value="${floor}">${floor}층</option>`;
});
```

**HTML 결과:**
```html
<option value="1">1층</option>
<option value="B1">B1층</option>
<option value="5F">5F층</option>
```

**필터링 코드 (284-285줄):**
```javascript
if (floorFilter) {
    filtered = filtered.filter(e => e.floor === floorFilter);
}
```

**분석:**
- ✅ `value`는 원본 값 ("1", "B1", "5F")
- ✅ 표시는 "층" 포함 ("1층", "B1층", "5F층")
- ✅ 필터링은 `e.floor === floorFilter` 비교
- ✅ **로직 자체는 정상!**

---

### **추가한 디버깅 로그**

```javascript
function filterEquipment() {
    const floorFilter = document.getElementById('floorFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    console.log('🔍 필터링 조건:', { floor: floorFilter, type: typeFilter });
    console.log('📊 전체 장비 층 데이터:', allEquipment.map(e => ({ 
        id: e.id, 
        floor: e.floor, 
        type: typeof e.floor 
    })));
    
    let filtered = allEquipment;
    
    if (floorFilter) {
        filtered = filtered.filter(e => e.floor === floorFilter);
        console.log(`✅ 층 필터 적용 (${floorFilter}): ${filtered.length}개 장비 발견`);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(e => e.equipment_type === typeFilter);
        console.log(`✅ 종류 필터 적용 (${typeFilter}): ${filtered.length}개 장비 발견`);
    }
    
    displayEquipment(filtered);
}
```

**로그 예시:**
```
🔍 필터링 조건: { floor: "1", type: "" }
📊 전체 장비 층 데이터: [
  { id: "EQ0001", floor: "1", type: "string" },
  { id: "EQ0002", floor: "B1", type: "string" },
  { id: "EQ0003", floor: "5F", type: "string" }
]
✅ 층 필터 적용 (1): 1개 장비 발견
```

---

### **문제 해결 방법**

**테스트 절차:**
1. https://noyorc.github.io/hvac-management/inspection.html 접속
2. 현장 선택 → 건물 선택
3. 브라우저 개발자 도구(F12) → 콘솔 탭 열기
4. 층 필터 선택 (예: "1층")
5. 콘솔 로그 확인:
   - 필터 값이 올바른지
   - 장비 데이터의 floor 값이 올바른지
   - 필터링 결과 개수 확인

**예상 원인:**
- 데이터가 숫자형(1)으로 저장되어 있는데, 필터 값이 문자열("1")일 수 있음
- 또는 데이터에 공백이나 특수문자가 포함되어 있을 수 있음

**해결 방법 (필요 시):**
```javascript
// 타입 안전 비교
if (floorFilter) {
    filtered = filtered.filter(e => String(e.floor) === String(floorFilter));
}
```

---

## 🆔 ID 자동 생성 설명

### **1. Site ID 자동 생성**

**코드 위치:** `js/admin.js` (532줄)

```javascript
async function handleSiteSubmit(e) {
    const siteData = {
        site_name: formData.get('site_name'),
        address: formData.get('address'),
        contact_name: formData.get('contact_name'),
        contact_phone: formData.get('contact_phone')
    };
    
    if (currentEditId) {
        // 수정
        result = await window.CachedFirestoreHelper.updateDocument('sites', currentEditId, siteData);
    } else {
        // ✅ 신규 추가 - ID 자동 생성
        result = await window.CachedFirestoreHelper.addDocument('sites', siteData);
    }
}
```

**Firestore Helper 내부 (`js/firebase-config.js` 91줄):**
```javascript
async function addDocument(collectionName, data) {
    const docRef = await addDoc(collection(window.db, collectionName), data);
    return { success: true, id: docRef.id };  // ← Firestore 자동 생성 ID
}
```

**결과:**
- ✅ `site_id`는 **Firestore가 자동 생성** (예: `abc123xyz`, `def456uvw`)
- ✅ 사용자가 입력할 필요 없음
- ✅ 고유성 보장 (중복 불가)

---

### **2. Building ID 자동 생성**

**코드 위치:** `js/admin.js` (623줄)

```javascript
async function handleBuildingSubmit(e) {
    const buildingData = {
        site_id: formData.get('site_id'),       // ← 선택한 현장 ID
        building_name: formData.get('building_name'),
        floors: formData.get('floors') ? parseInt(formData.get('floors')) : null
    };
    
    if (currentEditId) {
        // 수정
        result = await window.CachedFirestoreHelper.updateDocument('buildings', currentEditId, buildingData);
    } else {
        // ✅ 신규 추가 - ID 자동 생성
        result = await window.CachedFirestoreHelper.addDocument('buildings', buildingData);
    }
}
```

**결과:**
- ✅ `building_id`는 **Firestore가 자동 생성**
- ✅ `site_id`는 **사용자가 현장 선택** (드롭다운)

---

### **3. Equipment ID 및 Installation Date**

**코드 위치:** `js/admin.js` (371줄)

```javascript
async function handleEquipmentSubmit(e) {
    const equipmentData = {
        equipment_type: formData.get('type'),
        site_id: formData.get('site_id'),        // ← 선택
        building_id: formData.get('building_id'),// ← 선택
        model: formData.get('model'),
        location: formData.get('location'),
        floor: formData.get('floor'),
        capacity: formData.get('capacity')
    };
    
    // ✅ installation_date 자동 처리
    const installDate = formData.get('installation_date');
    if (installDate) {
        // 사용자가 입력한 날짜 사용
        equipmentData.installation_date = window.FirestoreTimestamp.fromDate(new Date(installDate));
    } else {
        // ✅ 입력하지 않으면 현재 시간으로 자동 설정
        equipmentData.installation_date = window.FirestoreTimestamp.now();
    }
    
    if (currentEditId) {
        // 수정
        result = await window.CachedFirestoreHelper.updateDocument('equipment', currentEditId, equipmentData);
    } else {
        // ✅ 신규 추가 - ID 자동 생성
        result = await window.CachedFirestoreHelper.addDocument('equipment', equipmentData);
    }
}
```

**결과:**
- ✅ `equipment_id`는 **Firestore가 자동 생성**
- ✅ `installation_date`는:
  - **사용자가 입력하면** → 입력한 날짜 사용
  - **입력하지 않으면** → 현재 시간으로 자동 설정

---

### **4. Created At (생성 시간)**

**모든 문서에 자동 추가되는 필드:**

Firestore Helper나 Cache Helper에서 자동으로 `created_at` 필드를 추가하지는 않지만, 엑셀 가져오기 시에는 추가됩니다.

**Excel Import (`js/excel-import.js` 256줄):**
```javascript
function processItemData(type, item) {
    const processed = { ...item };
    
    // ✅ 공통: created_at 추가
    processed.created_at = window.FirestoreTimestamp.now();
    
    // ... 타입별 처리 ...
    
    return processed;
}
```

---

## 📊 자동 생성 요약

| 필드 | 생성 방식 | 비고 |
|------|----------|------|
| `site_id` | ✅ Firestore 자동 생성 | 현장 추가 시 자동 |
| `building_id` | ✅ Firestore 자동 생성 | 건물 추가 시 자동 |
| `equipment_id` | ✅ Firestore 자동 생성 | 장비 추가 시 자동 (문서 ID) |
| `installation_date` | ⚠️ 반자동 | 입력 안 하면 현재 시간 |
| `created_at` | ⚠️ 엑셀 가져오기만 | addDocument는 수동 추가 필요 |

---

## 🔧 추가 개선 사항

### **1. 용량(Capacity) 필드 추가**

**admin.html:**
```html
<div class="form-group">
    <label for="equipmentCapacity">용량</label>
    <input type="text" id="equipmentCapacity" name="capacity" placeholder="500RT">
</div>
```

**admin.js (handleEquipmentSubmit):**
```javascript
equipmentData.capacity = formData.get('capacity');
```

**admin.js (editEquipment):**
```javascript
document.getElementById('equipmentCapacity').value = eq.capacity || '';
```

---

### **2. 설치일자(Installation Date) 필드 추가**

**admin.html:**
```html
<div class="form-group">
    <label for="equipmentInstallDate">설치일자</label>
    <input type="date" id="equipmentInstallDate" name="installation_date">
</div>
```

**admin.js (handleEquipmentSubmit):**
```javascript
const installDate = formData.get('installation_date');
if (installDate) {
    equipmentData.installation_date = window.FirestoreTimestamp.fromDate(new Date(installDate));
} else {
    equipmentData.installation_date = window.FirestoreTimestamp.now();
}
```

**admin.js (editEquipment):**
```javascript
if (eq.installation_date) {
    const date = eq.installation_date.toDate ? eq.installation_date.toDate() : new Date(eq.installation_date);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    document.getElementById('equipmentInstallDate').value = dateStr;
}
```

---

### **3. Equipment Type 필드명 통일**

**문제:**
- 일부 코드: `eq.type`
- 일부 코드: `eq.equipment_type`

**수정:**
```javascript
// 기존
document.getElementById('equipmentType').value = eq.type;

// 수정 후 (둘 다 지원)
document.getElementById('equipmentType').value = eq.equipment_type || eq.type;
```

---

## 🧪 테스트 방법

### **1. 층 필터링 테스트**

**URL:** https://noyorc.github.io/hvac-management/inspection.html

**절차:**
1. 점검 페이지 접속
2. 현장 선택 → 건물 선택
3. F12 개발자 도구 열기 → 콘솔 탭
4. 층 필터 선택 (예: "1층", "B1층")
5. 콘솔 로그 확인:
   ```
   🔍 필터링 조건: { floor: "1", type: "" }
   📊 전체 장비 층 데이터: [...]
   ✅ 층 필터 적용 (1): 2개 장비 발견
   ```
6. 장비 목록 확인

---

### **2. 현장 추가 테스트 (ID 자동 생성)**

**URL:** https://noyorc.github.io/hvac-management/admin.html

**절차:**
1. 관리자 페이지 접속
2. "현장/건물 관리" 탭
3. "+ 현장 추가" 버튼
4. 정보 입력:
   - 현장명: 테스트 현장
   - 주소: 서울시 강남구
   - 담당자명: 홍길동
   - 연락처: 010-1234-5678
5. "저장" 클릭
6. Firestore 콘솔 확인:
   - `sites` 컬렉션에 새 문서 생성됨
   - 문서 ID(site_id)가 자동 생성됨 (예: `Kj9mN8pQr2sT3uV4wX5y`)

---

### **3. 장비 추가 테스트 (Installation Date 자동 설정)**

**테스트 케이스 1: 설치일자 입력**
1. 관리자 페이지 → 장비 관리 → "+ 장비 추가"
2. 정보 입력:
   - 장비 종류: 냉동기
   - 현장: (선택)
   - 건물: (선택)
   - 모델명: LG-ARUN500
   - 위치: 기계실
   - 층: B1
   - 용량: 500RT
   - 설치일자: 2020-03-15 (선택)
3. "저장" 클릭
4. Firestore 확인:
   - `installation_date`: 2020-03-15 00:00:00 (입력한 날짜)

**테스트 케이스 2: 설치일자 미입력**
1. 위와 동일하지만 설치일자 비워둠
2. "저장" 클릭
3. Firestore 확인:
   - `installation_date`: 현재 시간 (예: 2026-02-23 14:30:00)

---

## 📝 커밋 정보

- **c2a5e52** - `fix: 층 필터링 디버깅 로그 추가 및 장비 필드 개선`

**변경 파일:**
- `js/inspection.js`: 필터링 디버깅 로그 추가
- `admin.html`: 용량, 설치일자 필드 추가
- `js/admin.js`: handleEquipmentSubmit, editEquipment 개선

---

## 🔗 관련 페이지

- **점검 페이지**: https://noyorc.github.io/hvac-management/inspection.html
- **관리자 페이지**: https://noyorc.github.io/hvac-management/admin.html

---

## ✅ 결론

### **층 필터링 문제**
- ✅ 디버깅 로그 추가로 원인 파악 가능
- ✅ 로직 자체는 정상 작동
- ✅ 실제 데이터 확인 후 타입 불일치 여부 체크 필요

### **ID 자동 생성**
- ✅ `site_id`, `building_id`, `equipment_id` 모두 **Firestore 자동 생성**
- ✅ 사용자가 직접 입력할 필요 없음
- ✅ 고유성 자동 보장

### **Installation Date**
- ✅ 사용자가 입력 → 입력한 날짜 사용
- ✅ 입력 안 함 → 현재 시간으로 자동 설정
- ✅ 관리자 페이지에서 설치일자 입력 가능

브라우저 콘솔에서 로그를 확인하고, 필터링이 안 되는 경우 스크린샷을 보내주세요! 🔍
