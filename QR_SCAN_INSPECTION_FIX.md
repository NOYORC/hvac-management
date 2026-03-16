# QR 스캔 후 점검 시 현장/건물 정보 로드 문제 해결

## 🐛 문제 상황
QR 코드 스캔 후 "점검 시작하기" 버튼을 눌렀을 때:
- ❌ 장비 정보를 받아오지 못함
- ❌ "Missing or insufficient permissions" 오류 발생
- ❌ 점검 페이지에서 현장/건물 정보 표시 안 됨

## 🔍 원인 분석

### 1. Firebase Auth 모듈 누락
**inspection.html**에 Firebase Auth 모듈이 import되지 않음
```javascript
// ❌ 문제: getAuth가 없음
import { getFirestore, Timestamp } from "firebase-firestore.js";

// ✅ 해결: getAuth 추가
import { getAuth } from "firebase-auth.js";
```

### 2. CachedFirestoreHelper 사용 문제
**js/inspection.js**에서 `CachedFirestoreHelper`를 사용했는데, 인증 정보가 제대로 전달되지 않음
```javascript
// ❌ 문제
const result = await window.CachedFirestoreHelper.getDocument('equipment', equipmentId);

// ✅ 해결: FirestoreHelper 직접 사용
const result = await window.FirestoreHelper.getDocument('equipment', equipmentId);
```

### 3. 현장/건물 ID 누락
장비 데이터에 `site_id`, `building_id`가 없고 `site_name`, `building_name`만 있음

## ✅ 해결 방법

### 1. inspection.html에 Firebase Auth 추가
```javascript
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const auth = getAuth(app);
window.auth = auth;
window.firebaseReady = true;
```

### 2. FirestoreHelper 직접 사용
```javascript
// 장비 로드
const result = await window.FirestoreHelper.getDocument('equipment', equipmentId);

// 점검 제출
const result = await window.FirestoreHelper.addDocument('inspections', inspectionData);
```

### 3. 현장/건물 정보 역조회
```javascript
// site_id가 있으면 ID로 조회
if (selectedEquipment.site_id) {
    const siteResult = await window.FirestoreHelper.getDocument('sites', selectedEquipment.site_id);
    if (siteResult.success) selectedSite = siteResult.data;
}
// site_name으로 역조회
else if (selectedEquipment.site_name) {
    const sitesResult = await window.FirestoreHelper.getAllDocuments('sites');
    if (sitesResult.success && sitesResult.data) {
        selectedSite = sitesResult.data.find(s => s.site_name === selectedEquipment.site_name);
    }
}
```

### 4. 점검 데이터 보강
```javascript
const inspectionData = {
    equipment_id: selectedEquipment.id,
    site_name: selectedSite?.site_name || selectedEquipment.site_name || '알 수 없음',
    building_name: selectedBuilding?.building_name || selectedEquipment.building_name || '알 수 없음',
    equipment_type: selectedEquipment.equipment_type || '알 수 없음',
    location: selectedEquipment.location || '',
    floor: selectedEquipment.floor || '',
    inspector_email: currentUser?.email || '',
    inspector_role: currentUser?.role || '',
    // ... 나머지 필드
};
```

## 📝 수정된 파일

### 1. inspection.html
- ✅ Firebase Auth 모듈 import 추가
- ✅ `window.auth` 전역 변수 노출
- ✅ `firebaseReady` 플래그 추가

### 2. js/inspection.js
- ✅ `CachedFirestoreHelper` → `FirestoreHelper` 변경
- ✅ 현장/건물 역조회 로직 추가
- ✅ 점검 데이터에 현장/건물/장비 정보 추가
- ✅ 점검 데이터에 점검자 이메일/역할 추가
- ✅ Null 안전성 강화

## 🧪 테스트 절차

1. **로그인**
   - https://noyorc.github.io/hvac-management/login.html
   - admin@hvac.com / hvac1234

2. **QR 스캐너**
   - https://noyorc.github.io/hvac-management/qr-scanner.html
   - QR 코드 스캔 또는 수동 입력 (예: EQ0001)

3. **점검 시작**
   - "점검 시작하기" 버튼 클릭
   - ✅ 현장 이름 표시 확인
   - ✅ 건물 이름 표시 확인
   - ✅ 장비 상세 정보 표시 확인

4. **점검 제출**
   - 점검 데이터 입력
   - "점검 완료" 버튼 클릭
   - ✅ 성공 메시지 확인

## 📊 관련 커밋

```
2f66a15 - fix: inspection.html에 Firebase Auth 모듈 추가
d636c93 - fix: CachedFirestoreHelper 대신 FirestoreHelper 직접 사용
1e0100d - fix: QR 스캔 후 점검 시 현장/건물 정보 로드 개선
```

## 🔗 관련 문서
- [FIREBASE_AUTH_GUIDE.md](./FIREBASE_AUTH_GUIDE.md)
- [FIREBASE_AUTH_IMPLEMENTATION_SUMMARY.md](./FIREBASE_AUTH_IMPLEMENTATION_SUMMARY.md)
- [QR_GENERATOR_AUTH_FIX.md](./QR_GENERATOR_AUTH_FIX.md)
