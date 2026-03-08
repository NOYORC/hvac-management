# 장비 관리 페이지 현장/건물 정보 표시 문제 해결 보고서

## 📋 문제 요약

**발견 일시**: 2026-02-23  
**보고자**: 사용자  
**증상**: 
- 시스템 관리 → 장비 관리 탭에서 장비 타입은 정상 표시됨
- 하지만 현장과 건물 정보가 "현장 없음 > 건물 없음"으로 표시됨
- 실제로는 Firestore에 현장/건물 데이터가 존재함

## 🔍 문제 원인 분석

### 데이터 로드 순서 문제

**초기 코드 (`loadAllData` 함수)**:
```javascript
async function loadAllData() {
    await Promise.all([
        loadUsers(),
        loadEquipment()  // ← 여기서 loadEquipment() 완료 즉시 renderEquipment() 호출
    ]);
    
    // 현장과 건물은 순서대로 로드 후 렌더링
    await loadSites();
    await loadBuildings();
    renderSites();
}
```

**`loadEquipment` 함수**:
```javascript
async function loadEquipment() {
    console.log('🔧 장비 데이터 로드 시작...');
    const result = await window.CachedFirestoreHelper.getAllDocuments('equipment');
    
    if (result.success) {
        equipment = result.data;
        renderEquipment();  // ← 즉시 렌더링 호출!
    }
}
```

### 문제 발생 프로세스

```
1. loadAllData() 시작
   ↓
2. Promise.all 시작
   ├─ loadUsers() 실행
   └─ loadEquipment() 실행
       ├─ equipment = [장비1, 장비2, ...]  ✅
       └─ renderEquipment() 호출  ← 문제!
           ├─ sites.find(s => s.id === eq.site_id)
           │   → sites 배열이 비어있음! (아직 로드 안 됨)
           └─ buildings.find(b => b.id === eq.building_id)
               → buildings 배열이 비어있음! (아직 로드 안 됨)
   ↓
3. Promise.all 완료
   ↓
4. loadSites() 실행 및 완료
   └─ sites = [현장1, 현장2, ...]  ← 너무 늦음!
   ↓
5. loadBuildings() 실행 및 완료
   └─ buildings = [건물1, 건물2, ...]  ← 너무 늦음!
```

**결과**:
- `renderEquipment()` 실행 시점에 `sites` 배열 = `[]` (빈 배열)
- `buildings` 배열 = `[]` (빈 배열)
- `site?.site_name || '현장 없음'` → **"현장 없음"**
- `building?.building_name || '건물 없음'` → **"건물 없음"**

### 렌더링 코드 (admin.js 라인 270-293)

```javascript
equipmentList.innerHTML = equipment.map(eq => {
    const site = sites.find(s => s.id === eq.site_id);
    const building = buildings.find(b => b.id === eq.building_id);
    
    return `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-title">${eq.equipment_type || eq.type || 'undefined'}</div>
                    <div class="item-subtitle">${eq.id}</div>
                </div>
                <!-- ... -->
            </div>
            <div class="item-details">
                <div class="item-detail">
                    <i class="fas fa-building"></i>
                    ${site?.site_name || '현장 없음'} > ${building?.building_name || '건물 없음'}
                    <!-- ↑ sites와 buildings가 비어있어서 '현장 없음 > 건물 없음' 표시 -->
                </div>
                <!-- ... -->
            </div>
        </div>
    `;
}).join('');
```

---

## ✅ 해결 방법

### 1. 데이터 로드 순서 재설계

**수정된 `loadAllData` 함수**:
```javascript
async function loadAllData() {
    // 모든 데이터 병렬 로드 (렌더링은 아직 하지 않음)
    await Promise.all([
        loadUsers(),
        loadEquipment(),  // ← 이제 renderEquipment() 호출 안 함
        loadSites(),      // ← 병렬로 같이 로드
        loadBuildings()   // ← 병렬로 같이 로드
    ]);
    
    // 모든 데이터 로드 완료 후 렌더링
    renderSites();
    renderEquipment();  // ← 이 시점에는 sites, buildings 모두 준비됨
}
```

**핵심 개선**:
- 모든 데이터를 `Promise.all`로 병렬 로드 (빠른 로딩)
- 로드 함수에서 즉시 렌더링하지 않음 (데이터 수집만)
- 모든 데이터 준비 완료 후 렌더링 함수 순차 호출

---

### 2. `loadEquipment` 함수 수정

**수정 전**:
```javascript
async function loadEquipment() {
    console.log('🔧 장비 데이터 로드 시작...');
    const result = await window.CachedFirestoreHelper.getAllDocuments('equipment');
    
    if (result.success) {
        equipment = result.data;
        console.log('✅ 장비 수:', equipment.length, '개');
        renderEquipment();  // ← 즉시 렌더링 (문제!)
    }
}
```

**수정 후**:
```javascript
async function loadEquipment() {
    console.log('🔧 장비 데이터 로드 시작...');
    const result = await window.CachedFirestoreHelper.getAllDocuments('equipment');
    
    if (result.success) {
        equipment = result.data;
        console.log('✅ 장비 수:', equipment.length, '개');
        // renderEquipment() 제거 - loadAllData()에서 호출
    }
}
```

**개선 사항**:
- 데이터 로드와 렌더링 분리
- 로드 함수는 데이터 수집만 담당
- 렌더링은 상위 함수(`loadAllData`)에서 제어

---

### 3. 장비 추가/수정/삭제 후 렌더링 추가

**문제**: 장비 저장/삭제 후 `loadEquipment()`만 호출하면 렌더링이 안 됨

**수정 전**:
```javascript
async function handleEquipmentSubmit(event) {
    // ... 저장 로직
    
    if (result.success) {
        alert('장비가 추가되었습니다.');
        closeEquipmentModal();
        await loadEquipment();  // ← 로드만 하고 렌더링 안 함
    }
}

async function deleteEquipment(equipmentId) {
    // ... 삭제 로직
    
    if (result.success) {
        alert('삭제되었습니다.');
        await loadEquipment();  // ← 로드만 하고 렌더링 안 함
    }
}
```

**수정 후**:
```javascript
async function handleEquipmentSubmit(event) {
    // ... 저장 로직
    
    if (result.success) {
        alert('장비가 추가되었습니다.');
        closeEquipmentModal();
        await loadEquipment();
        renderEquipment();  // ← 명시적으로 렌더링 호출
    }
}

async function deleteEquipment(equipmentId) {
    // ... 삭제 로직
    
    if (result.success) {
        alert('삭제되었습니다.');
        await loadEquipment();
        renderEquipment();  // ← 명시적으로 렌더링 호출
    }
}
```

---

## 📊 수정 전후 비교

### 데이터 로드 흐름 비교

#### 수정 전 (문제 있음)

```
┌─────────────────────────────────────────┐
│ loadAllData() 시작                      │
└────────────┬────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ Promise.all([                          │
│   loadUsers(),                         │
│   loadEquipment() ──► renderEquipment()│  ← sites, buildings 비어있음!
│ ])                                     │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ loadSites() ──► sites = [...]         │  ← 너무 늦음!
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ loadBuildings() ──► buildings = [...]  │  ← 너무 늦음!
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ renderSites()                          │
└────────────────────────────────────────┘

결과: 장비 목록에 "현장 없음 > 건물 없음" ❌
```

#### 수정 후 (정상 동작)

```
┌─────────────────────────────────────────┐
│ loadAllData() 시작                      │
└────────────┬────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ Promise.all([                          │
│   loadUsers(),                         │
│   loadEquipment(),      ← 렌더링 안 함 │
│   loadSites(),          ← 병렬 로드   │
│   loadBuildings()       ← 병렬 로드   │
│ ])                                     │
└────────────┬───────────────────────────┘
             │
             ▼ 모든 데이터 준비 완료
┌────────────────────────────────────────┐
│ renderSites()                          │
│ - sites ✅                             │
│ - buildings ✅                         │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ renderEquipment()                      │
│ - equipment ✅                         │
│ - sites ✅      ← 준비됨!              │
│ - buildings ✅  ← 준비됨!              │
└────────────────────────────────────────┘

결과: 장비 목록에 "본사 빌딩 > A동" ✅
```

---

### 장비 카드 표시 비교

#### 수정 전

```
┌─────────────────────────────────┐
│ AHU(공조기)               [✏️][🗑️]│
│ EQ-001                          │
├─────────────────────────────────┤
│ 🏢 현장 없음 > 건물 없음        │  ← 문제!
│ 🏷️ LG-AC-001                    │
│ 📍 3층 기계실                   │
└─────────────────────────────────┘
```

#### 수정 후

```
┌─────────────────────────────────┐
│ AHU(공조기)               [✏️][🗑️]│
│ EQ-001                          │
├─────────────────────────────────┤
│ 🏢 본사 빌딩 > A동              │  ← 정상!
│ 🏷️ LG-AC-001                    │
│ 📍 3층 기계실                   │
└─────────────────────────────────┘
```

---

## 🔧 코드 변경 상세

### 1. loadAllData() 함수 수정

**파일**: `js/admin.js`  
**라인**: 66-76

```diff
  async function loadAllData() {
+     // 모든 데이터 병렬 로드 (렌더링은 아직 하지 않음)
      await Promise.all([
          loadUsers(),
-         loadEquipment()
+         loadEquipment(),
+         loadSites(),
+         loadBuildings()
      ]);
      
-     // 현장과 건물은 순서대로 로드 후 렌더링
-     await loadSites();
-     await loadBuildings();
+     // 모든 데이터 로드 완료 후 렌더링
      renderSites();
+     renderEquipment();
  }
```

---

### 2. loadEquipment() 함수 수정

**파일**: `js/admin.js`  
**라인**: 241-253

```diff
  async function loadEquipment() {
      console.log('🔧 장비 데이터 로드 시작...');
      const result = await window.CachedFirestoreHelper.getAllDocuments('equipment');
      console.log('🔧 장비 데이터 로드 결과:', result);
      
      if (result.success) {
          equipment = result.data;
          console.log('✅ 장비 수:', equipment.length, '개');
          console.log('📊 장비 목록:', equipment);
-         renderEquipment();
      } else {
          console.error('❌ 장비 로드 실패:', result.error);
      }
  }
```

---

### 3. handleEquipmentSubmit() 함수 수정

**파일**: `js/admin.js`  
**라인**: 420-426

```diff
      if (result.success) {
          alert(currentEditId ? '장비가 수정되었습니다.' : '새 장비가 추가되었습니다.');
          closeEquipmentModal();
          await loadEquipment();
+         renderEquipment();
      } else {
          alert('실패: ' + result.error);
      }
```

---

### 4. deleteEquipment() 함수 수정

**파일**: `js/admin.js`  
**라인**: 429-438

```diff
  async function deleteEquipment(equipmentId) {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      
      const result = await window.CachedFirestoreHelper.deleteDocument('equipment', equipmentId);
      if (result.success) {
          alert('삭제되었습니다.');
          await loadEquipment();
+         renderEquipment();
      } else {
          alert('삭제 실패: ' + result.error);
      }
  }
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 초기 로드 시 현장/건물 표시 확인

**테스트 URL**: https://noyorc.github.io/hvac-management/admin.html

**작업**:
1. 시스템 관리 페이지 접속
2. "장비 관리" 탭 클릭
3. 장비 목록 확인

**예상 결과**:
- ✅ 각 장비 카드에 장비 타입 표시 (예: "AHU(공조기)")
- ✅ 현장 및 건물 정보 표시 (예: "본사 빌딩 > A동")
- ❌ "현장 없음 > 건물 없음" 표시 없음

**Firestore 데이터 예시**:
```javascript
// equipment 컬렉션
{
    id: "EQ-001",
    equipment_type: "AHU(공조기)",
    site_id: "SITE-001",
    building_id: "BLDG-001",
    model: "LG-AC-001",
    floor: "3",
    location: "기계실"
}

// sites 컬렉션
{
    id: "SITE-001",
    site_name: "본사 빌딩",
    address: "서울시 강남구 테헤란로 123"
}

// buildings 컬렉션
{
    id: "BLDG-001",
    site_id: "SITE-001",
    building_name: "A동",
    floors: 10
}
```

**표시 결과**:
```
AHU(공조기)
EQ-001
🏢 본사 빌딩 > A동
🏷️ LG-AC-001
📍 3층 기계실
```

---

### 시나리오 2: 장비 추가 후 렌더링 확인

**작업**:
1. "장비 추가" 버튼 클릭
2. 장비 정보 입력 (종류, 현장, 건물, 모델, 층, 위치)
3. 저장 버튼 클릭

**예상 결과**:
- ✅ 알림: "새 장비가 추가되었습니다."
- ✅ 모달 닫힘
- ✅ 장비 목록에 새 장비 즉시 표시
- ✅ 새 장비의 현장/건물 정보 정상 표시

---

### 시나리오 3: 장비 수정 후 렌더링 확인

**작업**:
1. 기존 장비 카드의 "수정" 버튼 클릭
2. 정보 수정 (예: 모델명 변경)
3. 저장 버튼 클릭

**예상 결과**:
- ✅ 알림: "장비가 수정되었습니다."
- ✅ 모달 닫힘
- ✅ 장비 목록에 수정된 정보 즉시 반영
- ✅ 현장/건물 정보 유지 (변경 안 했을 경우)

---

### 시나리오 4: 장비 삭제 후 렌더링 확인

**작업**:
1. 장비 카드의 "삭제" 버튼 클릭
2. 확인 대화상자에서 "확인" 클릭

**예상 결과**:
- ✅ 알림: "삭제되었습니다."
- ✅ 해당 장비 카드가 목록에서 즉시 제거됨
- ✅ 나머지 장비들의 현장/건물 정보 정상 표시

---

## 💡 추가 개선 사항

### 1. 데이터 로드 성능 최적화

**현재 방식**: 모든 데이터를 병렬 로드 (빠름)
```javascript
await Promise.all([
    loadUsers(),
    loadEquipment(),
    loadSites(),
    loadBuildings()
]);
```

**장점**:
- 4개의 컬렉션을 동시에 로드하여 시간 절약
- 예: 각각 0.5초 소요 시, 순차 로드는 2초, 병렬 로드는 0.5초

---

### 2. 로딩 상태 표시 (향후 고려)

**현재**: 데이터 로드 중 화면 표시 없음

**개선안**:
```javascript
async function loadAllData() {
    showLoadingSpinner();  // 로딩 스피너 표시
    
    try {
        await Promise.all([
            loadUsers(),
            loadEquipment(),
            loadSites(),
            loadBuildings()
        ]);
        
        renderSites();
        renderEquipment();
    } catch (error) {
        showErrorMessage('데이터 로드 실패: ' + error.message);
    } finally {
        hideLoadingSpinner();  // 로딩 스피너 숨김
    }
}
```

---

### 3. 캐시 무효화 전략

**현재**: `CachedFirestoreHelper` 사용

**주의사항**:
- 캐시가 오래되면 최신 데이터가 표시 안 될 수 있음
- 다른 사용자가 데이터를 추가/수정한 경우 반영 안 됨

**권장 사항**:
- 페이지 새로고침 시 캐시 무효화
- 일정 시간 경과 후 자동 새로고침
- "새로고침" 버튼 추가 (사용자가 수동으로 최신 데이터 로드)

---

## 📚 관련 함수 흐름도

### 초기 로드 흐름

```
DOMContentLoaded
      ↓
  loadAllData()
      ↓
Promise.all([
  loadUsers()      ──► users = [...]
  loadEquipment()  ──► equipment = [...]
  loadSites()      ──► sites = [...]
  loadBuildings()  ──► buildings = [...]
])
      ↓ 모두 완료
  renderSites()
      ├─ sites + buildings 사용
      └─ 현장/건물 카드 렌더링
      ↓
  renderEquipment()
      ├─ equipment + sites + buildings 사용
      └─ 장비 카드 렌더링 (현장/건물 정보 포함)
```

### 장비 추가/수정 흐름

```
사용자 입력
      ↓
handleEquipmentSubmit(event)
      ↓
CachedFirestoreHelper.addDocument('equipment', data)
 또는
CachedFirestoreHelper.updateDocument('equipment', id, data)
      ↓
  success?
      ├─ Yes ──► alert('성공')
      │           ↓
      │      closeEquipmentModal()
      │           ↓
      │      loadEquipment()
      │           ↓
      │      renderEquipment()
      │
      └─ No ──► alert('실패: ' + error)
```

---

## 🚀 배포 정보

**커밋 해시**: `3377b9c`  
**커밋 메시지**: `fix: 장비 관리 페이지에서 현장/건물 정보 표시 안 되는 문제 해결`

**변경 파일**:
- `js/admin.js` (8줄 추가, 5줄 삭제)

**주요 변경**:
1. `loadAllData()` - 모든 데이터 병렬 로드 후 순차 렌더링
2. `loadEquipment()` - `renderEquipment()` 호출 제거
3. `handleEquipmentSubmit()` - `renderEquipment()` 명시적 호출 추가
4. `deleteEquipment()` - `renderEquipment()` 명시적 호출 추가

**브랜치**: `main`  
**저장소**: https://github.com/NOYORC/hvac-management

---

## 🎯 결론

### 해결된 문제

1. ✅ **장비 목록 현장/건물 표시**: "현장 없음 > 건물 없음" → "본사 빌딩 > A동"
2. ✅ **데이터 로드 순서**: sites, buildings 로드 후 renderEquipment() 호출
3. ✅ **장비 추가/수정/삭제**: 변경 후 즉시 렌더링 반영

### 기술적 개선

- **데이터 로드와 렌더링 분리**: 로드 함수는 데이터 수집만, 렌더링은 상위에서 제어
- **병렬 로드 유지**: 성능 최적화 (4개 컬렉션 동시 로드)
- **의존성 보장**: 렌더링 시점에 필요한 모든 데이터 준비 완료

### 사용자 경험 개선

- **정확한 정보 표시**: 장비의 소속 현장 및 건물 명확히 표시
- **실시간 업데이트**: 추가/수정/삭제 즉시 반영
- **일관된 UI**: 모든 페이지에서 동일한 정보 표시 방식

---

**작성일**: 2026-02-23  
**작성자**: GenSpark AI Developer  
**커밋**: 3377b9c  
**상태**: ✅ 배포 완료
