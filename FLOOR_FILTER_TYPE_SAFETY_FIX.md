# 층 필터링 타입 안전성 수정 보고서

## 📋 문제 요약

**발견 일시**: 2026-02-23  
**보고자**: 사용자  
**증상**: 층(floor) 필터를 선택해도 장비가 표시되지 않음

## 🔍 문제 원인

### 1. **타입 불일치 문제 (inspection.js)**

**위치**: `js/inspection.js` 라인 288

```javascript
// 문제 코드
if (floorFilter) {
    filtered = filtered.filter(e => e.floor === floorFilter);
}
```

**원인**:
- Firestore에서 가져온 `e.floor` 값이 **숫자(number)** 타입일 수 있음
- HTML `<select>` 요소의 `value`는 항상 **문자열(string)** 타입
- 엄격한 동등 비교 연산자(`===`)로 인해 `1 === "1"` → `false`

**예시**:
```javascript
// Firestore 데이터
{ id: 'eq-001', floor: 1, equipment_type: 'AHU(공조기)' }  // floor는 숫자

// 필터 값
floorFilter = "1"  // HTML select value는 문자열

// 비교 결과
1 === "1"  // false (타입이 다름)
```

### 2. **null/undefined 처리 부족 (equipment-search.js)**

**위치**: `js/equipment-search.js` 라인 212

```javascript
// 문제 코드
const matchesFloor = !floor || equipment.floor.toString() === floor;
```

**원인**:
- `equipment.floor`가 `null` 또는 `undefined`일 경우
- `.toString()` 메서드 호출 시 **TypeError** 발생
- "Cannot read property 'toString' of null" 오류

**예시**:
```javascript
// 층 정보가 없는 장비
{ id: 'eq-002', floor: null, equipment_type: '냉동기' }

// 실행
null.toString()  // TypeError: Cannot read property 'toString' of null
```

## ✅ 해결 방법

### 1. **inspection.js 수정**

```javascript
// 수정 후 (라인 288)
if (floorFilter) {
    filtered = filtered.filter(e => String(e.floor) === String(floorFilter));
    console.log(`✅ 층 필터 적용 (${floorFilter}): ${filtered.length}개 장비 발견`);
}
```

**개선 사항**:
- `String()` 함수로 양쪽을 모두 문자열로 변환
- 타입에 관계없이 값 자체를 비교
- `String(1) === String("1")` → `"1" === "1"` → `true`

### 2. **equipment-search.js 수정**

```javascript
// 수정 후 (라인 212)
const matchesFloor = !floor || String(equipment.floor || '') === String(floor);
```

**개선 사항**:
- `equipment.floor || ''`: null/undefined일 경우 빈 문자열로 대체
- `String()` 변환 전에 안전하게 기본값 처리
- TypeError 발생 방지

**동작 예시**:
```javascript
// 정상적인 경우
String(1 || '') === String("1")      // "1" === "1" → true
String("3F" || '') === String("3F")  // "3F" === "3F" → true

// null/undefined 경우
String(null || '') === String("1")   // "" === "1" → false (정상 동작)
String(undefined || '') === String("2")  // "" === "2" → false (정상 동작)
```

## 🧪 테스트 시나리오

### 테스트 1: 숫자 층 필터링

**데이터**:
```javascript
[
    { id: 'eq-001', floor: 1, equipment_type: 'AHU(공조기)' },
    { id: 'eq-002', floor: 2, equipment_type: 'FCU(팬코일유닛)' },
    { id: 'eq-003', floor: 1, equipment_type: '냉동기' }
]
```

**작업**:
1. https://noyorc.github.io/hvac-management/inspection.html 접속
2. 현장 및 건물 선택
3. 층 필터에서 "1층" 선택

**예상 결과**:
- `eq-001` (AHU) 표시 ✅
- `eq-003` (냉동기) 표시 ✅
- `eq-002` (FCU) 숨김 ✅

### 테스트 2: 문자열 층 필터링 (B1, 3F 등)

**데이터**:
```javascript
[
    { id: 'eq-004', floor: 'B1', equipment_type: '보일러' },
    { id: 'eq-005', floor: 'B2', equipment_type: '펌프' },
    { id: 'eq-006', floor: '3F', equipment_type: '배기팬' }
]
```

**작업**:
1. 층 필터에서 "B1층" 선택

**예상 결과**:
- `eq-004` (보일러) 표시 ✅
- `eq-005`, `eq-006` 숨김 ✅

### 테스트 3: null/undefined 층 처리

**데이터**:
```javascript
[
    { id: 'eq-007', floor: null, equipment_type: '냉각탑' },
    { id: 'eq-008', floor: undefined, equipment_type: '송풍기' },
    { id: 'eq-009', floor: 5, equipment_type: 'AHU(공조기)' }
]
```

**작업**:
1. https://noyorc.github.io/hvac-management/equipment-search.html 접속
2. 층 필터에서 "5층" 선택

**예상 결과**:
- `eq-009` (AHU) 표시 ✅
- `eq-007`, `eq-008` 숨김 ✅
- **TypeError 발생 안 함** ✅

### 테스트 4: "전체" 필터

**작업**:
1. 층 필터에서 "전체" 선택 (value="")

**예상 결과**:
- 모든 장비 표시 (층과 관계없이)
- null/undefined 층도 포함

## 📊 수정 전후 비교

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **숫자 층 필터링** | ❌ 동작 안 함 (타입 불일치) | ✅ 정상 동작 |
| **문자열 층 필터링** | ✅ 동작함 | ✅ 정상 동작 |
| **null/undefined 처리** | ❌ TypeError 발생 | ✅ 안전하게 처리 |
| **혼합 타입 데이터** | ❌ 일부만 표시됨 | ✅ 모두 정상 표시 |
| **디버깅 로그** | ✅ 있음 | ✅ 유지됨 |

## 🔧 추가 개선 사항

### 디버깅 로그 (기존 유지)

```javascript
console.log('🔍 필터링 조건:', { floor: floorFilter, type: typeFilter });
console.log('📊 전체 장비 층 데이터:', allEquipment.map(e => ({ 
    id: e.id, 
    floor: e.floor, 
    type: typeof e.floor 
})));
console.log(`✅ 층 필터 적용 (${floorFilter}): ${filtered.length}개 장비 발견`);
```

**활용 방법**:
1. 브라우저 개발자 도구(F12) → Console 탭 열기
2. 층 필터 선택 시 로그 확인
3. 각 장비의 층 값과 타입 확인 가능

## 💡 권장 사항

### 1. **데이터 입력 일관성**

**엑셀 가져오기 시**:
- 층 필드에 **숫자만** 입력: `1`, `2`, `3`, `10`, `15`
- 지하층: `B1`, `B2`, `B3` (문자열로 입력)
- 다국어 표기: `1F`, `2F`, `3F` (영문 표기 허용)

**자동 변환**:
- 입력: `1` → 표시: `1층`
- 입력: `B1` → 표시: `B1층`
- 입력: `3F` → 표시: `3F층`

### 2. **데이터 유효성 검사**

**admin.html 장비 추가 시 층 입력 개선** (향후 고려):
```html
<input type="text" 
       id="equipmentFloor" 
       name="floor" 
       pattern="^([1-9][0-9]?|B[1-9]|[1-9]F)$" 
       title="1~99, B1~B9, 1F~9F 형식으로 입력"
       placeholder="3 또는 B1 또는 3F">
```

### 3. **Firestore 데이터 정규화**

**층 필드 저장 규칙**:
- 문자열로 통일 저장: `"1"`, `"2"`, `"B1"`, `"3F"`
- 숫자와 문자열 혼용 방지
- 엑셀 가져오기 시 자동 문자열 변환

## 🚀 배포 정보

**커밋 해시**: `6046875`  
**커밋 메시지**: `fix: 층 필터링 타입 안전성 개선`

**변경 파일**:
- `js/inspection.js` (1줄 수정)
- `js/equipment-search.js` (1줄 수정)

**브랜치**: `main`  
**배포 URL**: 
- 점검 페이지: https://noyorc.github.io/hvac-management/inspection.html
- 장비 검색: https://noyorc.github.io/hvac-management/equipment-search.html

## 🆔 Firestore ID 생성 방식 안내

### 질문: "시스템 관리자로 로그인해서 현장이나 건물 추가를 하면 building_id나 site_id가 새롭게 배정되는거야?"

**답변**: ✅ **네, 자동으로 고유 ID가 생성됩니다.**

### 자동 ID 생성 메커니즘

#### 1. **addDoc() 사용 시** (관리자 페이지)

**파일**: `js/firebase-config.js` (라인 69~97)

```javascript
async addDocument(collectionName, data) {
    try {
        const { collection, addDoc, Timestamp } = this.firestoreFunctions;
        const db = this.db;
        
        // installation_date 필드 처리
        if (data.installation_date) {
            if (data.installation_date instanceof Timestamp) {
                // 이미 Timestamp 객체인 경우 그대로 사용
            } else if (data.installation_date instanceof Date) {
                data.installation_date = Timestamp.fromDate(data.installation_date);
            } else if (typeof data.installation_date === 'string') {
                const date = new Date(data.installation_date);
                data.installation_date = Timestamp.fromDate(date);
            }
        }
        
        // Firestore가 자동으로 고유 ID 생성
        const docRef = await addDoc(collection(db, collectionName), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('문서 추가 오류:', error);
        return { success: false, error: error.message };
    }
}
```

**ID 생성 방식**:
- Firestore의 `addDoc()` 함수가 **20자리 랜덤 문자열** 생성
- 형식: `[a-zA-Z0-9]{20}`
- 예시: `Kj9mN8pQr2sT3uV4wX5y`, `Ab1cD2eF3gH4iJ5kL6m`

**생성 프로세스**:
```
1. 사용자: 관리자 페이지에서 "새 현장 추가" 클릭
   ↓
2. admin.js: handleSiteSubmit() 실행
   ↓
3. CachedFirestoreHelper.addDocument('sites', data) 호출
   ↓
4. FirestoreHelper.addDocument() 실행
   ↓
5. Firestore: addDoc(collection(db, 'sites'), data)
   ↓
6. Firestore 서버: 고유 ID 생성 (예: Kj9mN8pQr2sT3uV4wX5y)
   ↓
7. 반환: { success: true, id: 'Kj9mN8pQr2sT3uV4wX5y' }
```

#### 2. **setDocument() 사용 시** (엑셀 가져오기)

**파일**: `js/firebase-config.js` (라인 99~125)

```javascript
async setDocument(collectionName, documentId, data) {
    try {
        const { doc, setDoc } = this.firestoreFunctions;
        const db = this.db;
        await setDoc(doc(db, collectionName, documentId), data);
        return { success: true, id: documentId };
    } catch (error) {
        console.error('문서 설정 오류:', error);
        return { success: false, error: error.message };
    }
}
```

**ID 지정 방식**:
- 엑셀 파일의 `id` 컬럼 값을 **직접 사용**
- 사용자가 지정한 ID로 문서 생성
- 예시: `SITE-001`, `BLDG-HQ-01`, `EQ-AHU-2024-001`

### ID 생성 비교

| 방법 | 함수 | ID 결정 주체 | ID 형식 | 사용 위치 |
|------|------|-------------|---------|----------|
| **자동 생성** | `addDoc()` | Firestore 서버 | 20자 랜덤 문자열 | 관리자 페이지 (수동 추가) |
| **수동 지정** | `setDoc()` | 사용자 (엑셀) | 사용자 정의 | 엑셀 가져오기 |

### 예시 시나리오

#### 시나리오 1: 관리자 페이지에서 수동 추가

```javascript
// 입력 데이터
{
    site_name: "본사 빌딩",
    address: "서울시 강남구 테헤란로 123",
    contact_name: "김철수",
    contact_phone: "02-1234-5678"
}

// Firestore에 저장된 최종 데이터
{
    id: "Kj9mN8pQr2sT3uV4wX5y",  // ← Firestore가 자동 생성
    site_name: "본사 빌딩",
    address: "서울시 강남구 테헤란로 123",
    contact_name: "김철수",
    contact_phone: "02-1234-5678",
    created_at: Timestamp(2026, 2, 23, 10, 30, 0)  // ← 서버 시간
}
```

#### 시나리오 2: 엑셀 파일로 일괄 가져오기

**엑셀 파일 (Sites 시트)**:
| id | site_name | address | contact_name | contact_phone |
|----|-----------|---------|--------------|---------------|
| SITE-001 | 본사 빌딩 | 서울시 강남구 테헤란로 123 | 김철수 | 02-1234-5678 |
| SITE-002 | 지사 건물 | 부산시 해운대구 센텀로 456 | 이영희 | 051-9876-5432 |

**Firestore에 저장된 데이터**:
```javascript
{
    id: "SITE-001",  // ← 엑셀의 id 컬럼 값 사용
    site_name: "본사 빌딩",
    address: "서울시 강남구 테헤란로 123",
    contact_name: "김철수",
    contact_phone: "02-1234-5678",
    created_at: Timestamp(2026, 2, 23, 10, 30, 0)
}
```

## 📅 installation_date 자동 배정 안내

### 질문: "installation_date도 자동으로 배정되는 것이고?"

**답변**: ⚠️ **부분적으로 맞습니다. 상황에 따라 다릅니다.**

### installation_date 처리 방식

#### 1. **관리자 페이지에서 추가 시** (수동 입력)

**파일**: `js/admin.js` (라인 371~397)

```javascript
async function handleEquipmentSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const equipmentData = {
        equipment_type: formData.get('equipment_type'),
        site_id: formData.get('site_id'),
        building_id: formData.get('building_id'),
        model: formData.get('model'),
        location: formData.get('location'),
        floor: formData.get('floor'),
        capacity: formData.get('capacity') ? parseFloat(formData.get('capacity')) : null,
        installation_date: formData.get('installation_date') || null  // ← 여기!
    };
    
    // ... 저장 로직
}
```

**동작**:
- 사용자가 날짜를 **입력한 경우**: 입력한 날짜 사용
- 사용자가 날짜를 **비운 경우**: `null` 저장

**HTML 폼**:
```html
<label for="equipmentInstallationDate">설치일</label>
<input type="date" 
       id="equipmentInstallationDate" 
       name="installation_date" 
       placeholder="2024-01-15">
```

#### 2. **엑셀 가져오기 시** (자동 변환)

**파일**: `js/excel-import.js` (라인 695~714)

```javascript
function processItemData(type, item) {
    const processed = { ...item };
    processed.created_at = window.FirestoreTimestamp.now();
    
    // 장비 데이터 처리
    if (type === 'equipment') {
        // capacity 처리
        if (processed.capacity) {
            processed.capacity = parseFloat(processed.capacity);
        }
        
        // installation_date 처리
        if (processed.installation_date) {
            // 숫자인 경우 (Excel 시리얼 날짜)
            if (typeof processed.installation_date === 'number') {
                const date = new Date((processed.installation_date - 25569) * 86400 * 1000);
                processed.installation_date = window.FirestoreTimestamp.fromDate(date);
                console.log('✅ installation_date 변환 (Excel serial):', date);
            }
            // 문자열인 경우
            else if (typeof processed.installation_date === 'string') {
                const date = new Date(processed.installation_date);
                if (!isNaN(date.getTime())) {
                    processed.installation_date = window.FirestoreTimestamp.fromDate(date);
                    console.log('✅ installation_date 변환 (string):', date);
                }
            }
            // Date 객체인 경우
            else if (processed.installation_date instanceof Date) {
                processed.installation_date = window.FirestoreTimestamp.fromDate(processed.installation_date);
                console.log('✅ installation_date 변환 (Date):', processed.installation_date);
            }
        } else {
            // installation_date가 없으면 현재 시간으로 설정
            processed.installation_date = window.FirestoreTimestamp.now();
            console.log('ℹ️ installation_date 없음 → 현재 시간으로 설정');
        }
    }
    
    return processed;
}
```

**동작**:
1. **엑셀에 날짜가 있는 경우**:
   - Excel 시리얼 날짜 (예: 45321) → JavaScript Date → Firestore Timestamp
   - 문자열 날짜 (예: "2024-01-15") → Date 파싱 → Timestamp
   - Date 객체 → Timestamp 변환

2. **엑셀에 날짜가 없는 경우**:
   - **자동으로 현재 시간**(`Timestamp.now()`)으로 설정
   - 예: 2026년 2월 23일 오전 10시 30분에 가져오기 실행 시 → `2026-02-23 10:30:00` 저장

### installation_date 자동 배정 요약

| 입력 방법 | installation_date 입력 | 저장되는 값 | 자동 배정 여부 |
|----------|------------------------|------------|---------------|
| **관리자 페이지** | ✅ 날짜 선택 | 선택한 날짜 | ❌ (수동 입력) |
| **관리자 페이지** | ❌ 비워둠 | `null` | ❌ (null 저장) |
| **엑셀 가져오기** | ✅ 날짜 입력 (2024-01-15) | 입력한 날짜 | ❌ (엑셀 값 사용) |
| **엑셀 가져오기** | ❌ 빈 셀 | **현재 시간** | ✅ **자동 배정** |

**핵심 차이점**:
- **관리자 페이지**: 비우면 `null` 저장 (자동 배정 ❌)
- **엑셀 가져오기**: 비우면 **현재 시간** 자동 설정 (자동 배정 ✅)

### Firestore Timestamp 형식

```javascript
// Timestamp 객체 구조
{
    seconds: 1708665000,        // Unix timestamp (초 단위)
    nanoseconds: 123456000      // 나노초
}

// JavaScript Date로 변환
const date = timestamp.toDate();  // Wed Feb 23 2026 10:30:00 GMT+0900

// 표시용 포맷팅
const formatted = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});  // "2026. 02. 23."
```

## 📚 관련 커밋 이력

1. **6046875** - `fix: 층 필터링 타입 안전성 개선` (현재)
2. **c2a5e52** - `fix: 층 필터링 디버깅 및 장비 입력 필드 개선`
3. **d254109** - `fix: 엑셀 가져오기 필드 누락 및 날짜 변환 문제 해결`
4. **d841a5a** - `fix: 층(floor) 표시 통일 및 건물 선택 카드 개선`
5. **e2e4a2e** - `fix: 관리자 페이지 현장 추가/수정 시 담당자 정보 처리`

## 🎯 결론

1. ✅ **층 필터링 문제 해결**: `String()` 비교로 타입 안전성 확보
2. ✅ **null/undefined 처리**: TypeError 방지
3. ✅ **ID 자동 생성**: Firestore `addDoc()`가 고유 ID 생성
4. ⚠️ **installation_date**: 엑셀 가져오기 시만 자동 배정, 관리자 페이지는 수동 입력

---

**작성일**: 2026-02-23  
**작성자**: GenSpark AI Developer  
**커밋**: 6046875  
**상태**: ✅ 배포 완료
