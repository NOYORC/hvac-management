# 🔐 Firebase Admin SDK를 사용한 안전한 데이터 가져오기

## 📋 문제 상황

엑셀 데이터를 Firestore에 등록할 때 권한 오류가 발생합니다:
```
FirebaseError: Missing or insufficient permissions.
```

**임시 해결책** (현재): 모든 권한 허용
```javascript
// ❌ 위험한 규칙 (절대 프로덕션에서 사용 금지!)
match /{document=**} {
  allow read, write: if true;
}
```

**문제점**:
- 🚨 누구나 모든 데이터 읽기/쓰기/삭제 가능
- 🚨 악의적인 사용자가 데이터 전체 삭제 가능
- 🚨 개인정보 유출 위험

---

## ✅ 권장 해결 방법

### 방법 1: Firebase Admin SDK (서버 측) - 가장 안전 ⭐

Admin SDK는 모든 보안 규칙을 우회하여 서버에서 안전하게 데이터를 관리할 수 있습니다.

#### 장점
- ✅ 보안 규칙 우회 (Admin 권한)
- ✅ 클라이언트 노출 없음
- ✅ 대량 데이터 처리 최적화
- ✅ 프로덕션 환경에 적합

#### 구현 단계

**1단계: Node.js 서버 설정**

```bash
# 프로젝트 디렉토리 생성
mkdir hvac-admin-server
cd hvac-admin-server

# package.json 초기화
npm init -y

# Firebase Admin SDK 설치
npm install firebase-admin express multer xlsx cors
```

**2단계: Firebase 서비스 계정 키 생성**

1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 설정 → 서비스 계정
3. "새 비공개 키 생성" 클릭
4. JSON 파일 다운로드 → `serviceAccountKey.json`으로 저장

⚠️ **중요**: 이 파일은 절대 Git에 커밋하지 마세요!

**3단계: 서버 코드 작성 (`server.js`)**

```javascript
const admin = require('firebase-admin');
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');

// Firebase Admin 초기화
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// CORS 허용
app.use(cors());
app.use(express.json());

// 파일 업로드 설정
const upload = multer({ storage: multer.memoryStorage() });

// 엑셀 데이터 가져오기 API
app.post('/api/import-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }

    // 엑셀 파일 읽기
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 ${data.length}개의 데이터를 처리합니다...`);

    // Firestore에 배치로 저장
    const batch = db.batch();
    let count = 0;

    for (const item of data) {
      if (!item.id) {
        console.warn('⚠️ ID가 없는 항목 건너뜀:', item);
        continue;
      }

      const docRef = db.collection('equipment').doc(item.id);
      batch.set(docRef, {
        ...item,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      count++;

      // 500개마다 배치 커밋 (Firestore 제한)
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`✅ ${count}개 저장 완료...`);
      }
    }

    // 남은 데이터 커밋
    if (count % 500 !== 0) {
      await batch.commit();
    }

    console.log(`✅ 총 ${count}개의 데이터를 저장했습니다.`);

    res.json({
      success: true,
      message: `${count}개의 데이터를 성공적으로 저장했습니다.`,
      count: count
    });

  } catch (error) {
    console.error('❌ 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📡 엔드포인트: http://localhost:${PORT}/api/import-excel`);
});
```

**4단계: 서버 실행**

```bash
node server.js
```

**5단계: 클라이언트(excel-import.html) 수정**

기존 Firestore 직접 호출 대신 서버 API 호출:

```javascript
// 기존 코드
// const result = await window.FirestoreHelper.setDocument(type, item.id, processedItem);

// 새 코드: Admin API 호출
async function uploadToAdmin(type, data) {
    const formData = new FormData();
    
    // 데이터를 엑셀 형식으로 변환
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    
    // Blob으로 변환
    const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    formData.append('file', blob, `${type}.xlsx`);
    formData.append('collection', type);

    const response = await fetch('http://localhost:3000/api/import-excel', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}
```

---

### 방법 2: Cloud Functions (서버리스) - 중간 복잡도

Firebase Cloud Functions를 사용하여 서버 없이 Admin 권한으로 실행합니다.

#### 장점
- ✅ 서버 관리 불필요
- ✅ 자동 스케일링
- ✅ Firebase와 완벽 통합

#### 단점
- ⚠️ 무료 플랜 제한적 (Blaze 플랜 필요)
- ⚠️ 콜드 스타트 지연

#### 구현 예시

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.importExcelData = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  // 관리자 권한 확인
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  const userRole = userDoc.data()?.role;

  if (userRole !== 'admin' && userRole !== 'manager') {
    throw new functions.https.HttpsError('permission-denied', '권한이 없습니다.');
  }

  // 데이터 저장 (Admin 권한으로 보안 규칙 우회)
  const batch = admin.firestore().batch();
  
  for (const item of data.items) {
    const docRef = admin.firestore().collection(data.collection).doc(item.id);
    batch.set(docRef, item, { merge: true });
  }

  await batch.commit();

  return { success: true, count: data.items.length };
});
```

---

### 방법 3: 특정 시간만 권한 허용 (임시 해결책) - 간단하지만 위험

데이터 가져오기 작업 시에만 규칙을 일시적으로 완화합니다.

#### 규칙 예시

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 헬퍼 함수들...
    
    // 장비 컬렉션
    match /equipment/{equipmentId} {
      allow read: if isAuthenticated();
      
      // ⚠️ 데이터 가져오기 시에만 임시 허용
      // 작업 완료 후 즉시 다시 제한해야 함!
      allow write: if isAuthenticated() && 
                      (isManagerOrAbove() || 
                       request.time < timestamp.date(2026, 4, 2)); // 임시 기한 설정
    }
  }
}
```

⚠️ **주의**: 
- 작업 완료 후 **반드시** 규칙을 다시 변경해야 함
- 깜빡하면 보안 위험!
- 프로덕션 환경에서는 권장하지 않음

---

## 🎯 권장 방식 비교

| 방법 | 보안 | 복잡도 | 비용 | 권장도 |
|------|------|--------|------|--------|
| **Admin SDK (Node.js)** | ⭐⭐⭐⭐⭐ | 중간 | 무료 (서버 필요) | ✅ 강력 추천 |
| **Cloud Functions** | ⭐⭐⭐⭐⭐ | 높음 | 유료 (Blaze) | ✅ 추천 |
| **임시 권한 허용** | ⭐⭐ | 낮음 | 무료 | ⚠️ 비추천 |
| **모든 권한 허용** | ❌ | 매우 낮음 | 무료 | 🚨 절대 금지 |

---

## 📝 최종 권장 사항

### 즉시 조치 (보안 강화)

현재 "모든 권한 허용" 상태라면 **즉시** 다음 규칙으로 변경하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isManagerOrAbove() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // 모든 컬렉션: 읽기는 로그인 사용자, 쓰기는 관리자만
    match /{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

### 장기 해결책

1. **Admin SDK 서버 구축** (1-2일 소요)
2. 데이터 가져오기 기능을 서버 API로 이동
3. 클라이언트는 파일만 서버로 전송
4. 서버가 Admin 권한으로 Firestore에 저장

---

## 🚀 빠른 시작 가이드

Admin SDK 서버를 빠르게 시작하려면:

```bash
# 1. 프로젝트 생성
mkdir hvac-admin-server && cd hvac-admin-server

# 2. 패키지 설치
npm init -y
npm install firebase-admin express multer xlsx cors

# 3. 서비스 계정 키 다운로드
# Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성

# 4. server.js 생성 (위 코드 복사)

# 5. 서버 실행
node server.js
```

---

## 📞 추가 지원이 필요하면

- Admin SDK 서버 코드 전체 작성
- Cloud Functions 구현
- 클라이언트 수정 코드 제공

언제든지 말씀해주세요!
