# 🔧 Equipment 필드 규정 및 가이드

## 📋 현재 상태 분석

현재 `model`과 `location` 필드는 **명확한 규정 없이 임시 값으로 사용**되고 있습니다.

---

## 🔍 현재 사용 중인 값

### 1️⃣ **자동 생성 도구** (`structured-data-generator.js`)

#### Model 필드
```javascript
model: `MODEL-${equipmentId}`
// 예시: MODEL-EQ0001, MODEL-EQ0002, MODEL-EQ1000
```
**문제점**:
- ❌ 실제 제조사 모델명이 아님
- ❌ 장비 사양 정보 없음
- ❌ 테스트용 더미 데이터

#### Location 필드
```javascript
// 공식: R-층수-번호
const locationNum = String(eqOffset % 100 + 1).padStart(2, '0');
const location = `R-${floor.replace('F', '')}-${locationNum}`;
// 예시: R-5-12, R-10-05, R-1-01
```
**의미**:
- `R`: Room (방)
- `5`: 5층
- `12`: 12번 방

**문제점**:
- ❌ "Room"이 HVAC 장비 위치로 적합하지 않음
- ❌ 실제 건물 평면도와 무관
- ❌ 테스트용 자동 생성 값

---

### 2️⃣ **템플릿 예시** (`excel-import.js`)

```javascript
model: 'MODEL-001'
location: 'R-5-12'
```

**문제점**: 동일하게 임시 값

---

### 3️⃣ **실제 사용 예시** (`setup-firebase-data.html`)

```javascript
// 실제로 의미 있는 값들:
{ model: 'AHU-1000', location: '기계실' }
{ model: 'CHILLER-2000', location: '지하 기계실' }
{ model: 'FCU-300', location: '사무실' }
{ model: 'CT-5000', location: '옥상' }
{ model: 'BOILER-800', location: '보일러실' }
```

**특징**: ✅ 실제 제조사 모델명 + 구체적인 위치 설명

---

## ✅ 권장 규정

### 📦 **Model 필드**

#### 목적
장비의 **제조사 모델명 및 사양**을 저장합니다.

#### 형식
```
{제조사코드}-{모델시리즈}-{용량}
또는
{제조사명} {모델명}
```

#### 예시

| 장비 유형 | Model 예시 | 설명 |
|----------|-----------|------|
| 냉동기 | CARRIER-30XA-500RT | Carrier 30XA 시리즈 500RT |
| AHU | TRANE-AHU1000 | Trane AHU 1000 시리즈 |
| FCU | DAIKIN-FCU300 | Daikin FCU 300 모델 |
| 보일러 | NAVIEN-NBH800 | 나비엔 NBH 800kW |
| 냉각탑 | BAC-CT5000 | BAC 냉각탑 5000RT |
| 펌프 | GRUNDFOS-CR400 | Grundfos CR 400 LPM |

#### 실제 제조사별 예시

**국내 제조사**:
- LG: `LG-ARUN500`, `LG-MHU300`
- 삼성: `SAMSUNG-DVM-S`, `SAMSUNG-EHS`
- 나비엔: `NAVIEN-NBH800`, `NAVIEN-NCB700`
- 경동: `KD-NAVIEN-BH350`

**해외 제조사**:
- Carrier: `CARRIER-30XA-500RT`, `CARRIER-19XR-1000RT`
- Trane: `TRANE-CVHE-800RT`, `TRANE-AHU1000`
- Daikin: `DAIKIN-VRV-X`, `DAIKIN-FCU300`
- York: `YORK-YCIV-600RT`
- BAC: `BAC-CT5000`, `BAC-CT3000`

---

### 📍 **Location 필드**

#### 목적
장비의 **물리적 설치 위치**를 명확하게 표시합니다.

#### 형식 옵션

**옵션 1: 한글 설명** (권장)
```
{공간명} 또는 {공간명} {상세위치}
```

**옵션 2: 코드 기반**
```
{건물코드}-{층}-{구역}-{번호}
```

#### 예시

**옵션 1: 한글 설명 (권장)** ✅
| 장비 유형 | Location 예시 | 설명 |
|----------|--------------|------|
| 냉동기 | 지하 기계실 | 지하층 기계실 |
| 냉동기 | 지하1층 기계실 A구역 | 더 구체적 |
| AHU | 10층 기계실 | 10층 기계실 |
| FCU | 5층 사무실 | 5층 사무실 |
| 냉각탑 | 옥상 | 옥상 |
| 냉각탑 | 옥상 동쪽 | 위치 세부화 |
| 보일러 | 지하2층 보일러실 | 전용 공간 |
| 펌프 | 지하1층 펌프실 | 전용 공간 |
| 배기팬 | 옥상 중앙 | 옥상 중앙부 |

**옵션 2: 코드 기반** (대규모 빌딩용)
```
A-B1-M01    (A동-지하1층-기계실01)
A-10-E02    (A동-10층-전기실02)
B-RF-C01    (B동-옥상-냉각탑01)
A-05-O12    (A동-5층-사무실12)
```

---

## 🎯 프로젝트별 권장 사항

### 소규모 프로젝트 (1~3개 건물)
**Model**: 제조사명 + 모델명 (간단)
```
예: LG-ARUN500, DAIKIN-FCU300
```

**Location**: 한글 설명 (직관적)
```
예: 지하 기계실, 10층 기계실, 옥상
```

---

### 중규모 프로젝트 (3~10개 건물)
**Model**: 제조사코드-모델시리즈-용량
```
예: CARRIER-30XA-500RT, TRANE-AHU1000
```

**Location**: 층수 + 공간명
```
예: 지하1층 기계실, 10층 기계실 A구역, 옥상 동쪽
```

---

### 대규모 프로젝트 (10개 이상 건물)
**Model**: 제조사코드-모델시리즈-용량
```
예: CARRIER-30XA-500RT
```

**Location**: 코드 기반 체계
```
예: A-B1-M01, B-10-E02, C-RF-C01
```

**코드 체계 설명**:
```
{건물코드}-{층코드}-{구역코드}{번호}

건물코드: A, B, C, ... (건물별)
층코드: B2(지하2), B1(지하1), 01~99(지상), RF(옥상)
구역코드:
  M: 기계실 (Mechanical)
  E: 전기실 (Electrical)
  O: 사무실 (Office)
  C: 냉각탑 (Cooling Tower)
  P: 펌프실 (Pump)
  B: 보일러실 (Boiler)
번호: 01, 02, 03, ...
```

---

## 📊 필드 규정 요약

### Model 필드

| 항목 | 내용 |
|------|------|
| **필수 여부** | ✅ 필수 |
| **데이터 타입** | String |
| **최대 길이** | 50자 |
| **권장 형식** | `{제조사}-{모델명}-{용량}` |
| **예시** | `CARRIER-30XA-500RT` |
| **유효성 검사** | 영문, 숫자, 하이픈(-) 허용 |

### Location 필드

| 항목 | 내용 |
|------|------|
| **필수 여부** | ✅ 필수 |
| **데이터 타입** | String |
| **최대 길이** | 100자 |
| **권장 형식 1** | `{층수} {공간명}` (한글) |
| **권장 형식 2** | `{건물}-{층}-{구역}-{번호}` (코드) |
| **예시 1** | `지하1층 기계실` |
| **예시 2** | `A-B1-M01` |
| **유효성 검사** | 한글, 영문, 숫자, 하이픈(-), 공백 허용 |

---

## 🔄 기존 데이터 마이그레이션 제안

### 문제: 현재 임시 값 사용 중
```javascript
// 현재 (의미 없음)
model: 'MODEL-EQ0001'
location: 'R-5-12'
```

### 해결 방안

#### 1️⃣ **일괄 업데이트 스크립트** (권장)
Firestore에서 모든 장비 데이터를 읽어서:
```javascript
// 예시 변환 로직
if (equipment.model.startsWith('MODEL-')) {
  // 장비 타입에 따라 적절한 모델명 할당
  switch(equipment.equipment_type) {
    case 'PACKAGED AIR CONDITIONER UNIT':
      equipment.model = 'LG-ARUN500';
      break;
    case 'TURBO CHILLER':
      equipment.model = 'CARRIER-30XA-500RT';
      break;
    // ... 기타
  }
}

if (equipment.location.startsWith('R-')) {
  // floor 정보를 활용해 위치 변환
  equipment.location = `${equipment.floor} 기계실`;
}
```

#### 2️⃣ **수동 업데이트**
관리자 페이지에서:
1. 장비 목록 조회
2. 각 장비의 Model과 Location을 실제 값으로 수정
3. 저장

#### 3️⃣ **점진적 업데이트**
- 새 데이터는 올바른 형식으로 입력
- 기존 데이터는 필요시 수정

---

## 🛠️ 구현 제안

### 1️⃣ **템플릿 업데이트**

현재:
```javascript
model: 'MODEL-001'
location: 'R-5-12'
```

개선:
```javascript
model: 'CARRIER-30XA-500RT'
location: '지하1층 기계실'
```

### 2️⃣ **가이드 문서 추가**
템플릿 다운로드 페이지에 예시 추가:
- 제조사별 모델명 예시
- 위치 표기법 예시
- 장비 유형별 추천 형식

### 3️⃣ **유효성 검사 추가**
업로드 시 경고:
```javascript
if (equipment.model.startsWith('MODEL-')) {
  console.warn(`⚠️ ${equipment.id}: 임시 모델명입니다. 실제 제조사 모델명으로 변경을 권장합니다.`);
}

if (equipment.location.startsWith('R-')) {
  console.warn(`⚠️ ${equipment.id}: 임시 위치 코드입니다. 실제 위치명으로 변경을 권장합니다.`);
}
```

### 4️⃣ **드롭다운/자동완성 추가**
관리자 페이지에서:
- Model: 제조사 선택 → 모델 시리즈 선택
- Location: 건물 선택 → 층 선택 → 공간 선택

---

## 📝 엑셀 템플릿 업데이트 제안

### 현재 템플릿
| id | site_id | building_id | equipment_type | **model** | **location** | floor | capacity |
|----|---------|-------------|----------------|-----------|--------------|-------|----------|
| EQ0001 | SITE001 | BLD001 | PACKAGED AIR CONDITIONER UNIT | **MODEL-001** | **R-5-12** | 5F | 25 |

### 개선된 템플릿
| id | site_id | building_id | equipment_type | **model** | **location** | floor | capacity |
|----|---------|-------------|----------------|-----------|--------------|-------|----------|
| EQ0001 | SITE001 | BLD001 | PACKAGED AIR CONDITIONER UNIT | **CARRIER-30XA-500RT** | **지하1층 기계실** | B1 | 500RT |
| EQ0002 | SITE001 | BLD001 | TURBO CHILLER | **TRANE-CVHE-800RT** | **지하1층 기계실 A구역** | B1 | 800RT |
| EQ0003 | SITE001 | BLD002 | FCU (Fan Coil Unit) | **DAIKIN-FCU300** | **5층 사무실** | 5F | 3000CMH |
| EQ0004 | SITE001 | BLD001 | 냉각탑 | **BAC-CT5000** | **옥상 동쪽** | RF | 1000RT |

---

## 🎯 다음 단계 제안

### 즉시 적용 가능
1. ✅ 템플릿 예시를 실제 값으로 변경
2. ✅ 가이드 문서에 권장 형식 추가
3. ✅ 엑셀 템플릿에 설명 시트 추가

### 중기 개선
1. 🔄 자동 생성 도구에 의미 있는 값 사용
2. 🔄 유효성 검사 및 경고 추가
3. 🔄 관리자 페이지에 드롭다운 추가

### 장기 개선
1. 🚀 제조사 DB 구축
2. 🚀 건물 평면도 연동
3. 🚀 QR 코드로 위치 자동 입력

---

## ❓ 사용자 결정 사항

다음 사항을 결정해주시면 코드를 업데이트하겠습니다:

### 1️⃣ Model 형식
- [ ] **옵션 A**: `{제조사}-{모델명}-{용량}` (예: CARRIER-30XA-500RT)
- [ ] **옵션 B**: `{제조사} {모델명}` (예: CARRIER 30XA)
- [ ] **옵션 C**: 자유 형식 (제한 없음)

### 2️⃣ Location 형식
- [ ] **옵션 A**: 한글 설명 (예: 지하1층 기계실)
- [ ] **옵션 B**: 코드 기반 (예: A-B1-M01)
- [ ] **옵션 C**: 혼합 (한글 + 코드)

### 3️⃣ 기존 데이터 처리
- [ ] **옵션 A**: 일괄 변환 스크립트 실행
- [ ] **옵션 B**: 수동 업데이트
- [ ] **옵션 C**: 그대로 유지 (새 데이터만 올바른 형식)

---

## 🎉 결론

현재 `model`과 `location` 필드는:
- ❌ **명확한 규정 없이 테스트용 임시 값** 사용 중
- ✅ **실제 프로젝트에서는 의미 있는 값 필요**

위 권장 사항을 참고하여 프로젝트에 맞는 규정을 정하시면:
- ✅ 템플릿 업데이트
- ✅ 가이드 문서 추가
- ✅ 유효성 검사 구현
- ✅ 자동 생성 로직 개선

을 진행하겠습니다! 어떤 형식을 선호하시나요? 😊
