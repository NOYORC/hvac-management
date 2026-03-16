# 📸 사진 첨부 시스템 설계 및 비용 분석

## 🏗️ 시스템 구조

### Firebase Storage 기반 (권장)

```
[사용자 앱] 
    ↓ 사진 촬영/선택
[Firebase Storage] ← 사진 파일 업로드 (JPG/PNG)
    ↓ 업로드 완료
[Firestore] ← 사진 URL 저장 (점검 기록에 포함)
    ↓ 
[앱에서 조회] ← URL로 사진 표시
```

### 데이터 구조

#### Firestore (inspections 컬렉션)
```javascript
{
  inspection_id: "INS20240316001",
  equipment_id: "EQ0001",
  inspector_name: "김점검",
  status: "정상",
  notes: "특이사항 없음",
  
  // 📸 사진 정보 추가
  photos: [
    {
      url: "https://firebasestorage.googleapis.com/.../photo1.jpg",
      thumbnail_url: "https://firebasestorage.googleapis.com/.../photo1_thumb.jpg",
      filename: "inspection_20240316_143022.jpg",
      size: 2457600, // bytes (2.4MB)
      uploaded_at: "2024-03-16T14:30:22Z"
    },
    {
      url: "https://firebasestorage.googleapis.com/.../photo2.jpg",
      thumbnail_url: "https://firebasestorage.googleapis.com/.../photo2_thumb.jpg", 
      filename: "inspection_20240316_143045.jpg",
      size: 1843200, // bytes (1.8MB)
      uploaded_at: "2024-03-16T14:30:45Z"
    }
  ],
  
  inspection_date: Timestamp,
  ...
}
```

#### Firebase Storage 폴더 구조
```
/inspections/
  /2024/
    /03/
      /EQ0001/
        - inspection_20240316_143022.jpg        (원본 2.4MB)
        - inspection_20240316_143022_thumb.jpg  (썸네일 100KB)
        - inspection_20240316_143045.jpg        (원본 1.8MB)
        - inspection_20240316_143045_thumb.jpg  (썸네일 80KB)
  /2024/
    /04/
      /EQ0002/
        ...
```

---

## 💰 비용 분석 (Firebase Storage)

### 1. Firebase Storage 가격 (2024년 기준)

| 항목 | 무료 할당량 | 초과 시 가격 |
|------|------------|-------------|
| **저장 용량** | 5 GB | $0.026/GB/월 (약 35원/GB/월) |
| **다운로드 대역폭** | 1 GB/일 | $0.12/GB (약 160원/GB) |
| **업로드 대역폭** | 무제한 | 무료 |
| **작업 횟수** | 50,000회/일 (업로드/삭제) | $0.05/만회 (약 65원/만회) |

### 2. 실제 사용 예상

#### 시나리오 1: 소규모 운영 (월 100건 점검)
```
월 점검 건수: 100건
사진/점검: 2장 (평균)
총 사진: 200장/월

원본 용량: 2MB/장 × 200장 = 400MB/월
썸네일: 100KB/장 × 200장 = 20MB/월
총 저장: 420MB/월

1년 누적: 420MB × 12 = 5,040MB ≈ 5GB

💰 예상 비용:
- 저장 비용: 처음 12개월 무료 (5GB 이내)
- 13개월부터: ~35원/월 (초과분 1GB 기준)
```

#### 시나리오 2: 중규모 운영 (월 500건 점검)
```
월 점검 건수: 500건
사진/점검: 2장 (평균)
총 사진: 1,000장/월

원본 용량: 2MB/장 × 1,000장 = 2,000MB/월
썸네일: 100KB/장 × 1,000장 = 100MB/월
총 저장: 2,100MB/월 ≈ 2.1GB/월

1년 누적: 2.1GB × 12 = 25.2GB

💰 예상 비용:
- 저장 비용: (25.2GB - 5GB무료) × 35원 = 약 700원/월
- 다운로드: 일 30GB 이내면 무료 (1GB/일 × 30일)
- 총 비용: 약 700~1,000원/월
```

#### 시나리오 3: 대규모 운영 (월 2,000건 점검)
```
월 점검 건수: 2,000건
사진/점검: 3장 (평균)
총 사진: 6,000장/월

원본 용량: 2MB/장 × 6,000장 = 12,000MB/월
썸네일: 100KB/장 × 6,000장 = 600MB/월
총 저장: 12,600MB/월 ≈ 12.6GB/월

1년 누적: 12.6GB × 12 = 151.2GB

💰 예상 비용:
- 저장 비용: (151.2GB - 5GB무료) × 35원 = 약 5,120원/월
- 다운로드: 50GB/월 가정 (1GB무료 제외) × 160원 = 약 7,840원/월
- 총 비용: 약 13,000원/월 (연 15만원)
```

---

## 🎯 비용 절감 전략

### 1. 이미지 압축 ⭐⭐⭐ (가장 효과적)
```javascript
// 업로드 전 클라이언트 사이드 압축
// 2MB → 300KB (85% 절감)

// 원본: 2MB/장
// 압축 후: 300KB/장

월 1,000장 기준:
- 압축 전: 2,000MB
- 압축 후: 300MB
💰 비용: 700원 → 무료 (5GB 이내)
```

**구현 방법:**
```javascript
// Browser Image Compression 라이브러리 사용
import imageCompression from 'browser-image-compression';

async function compressImage(file) {
    const options = {
        maxSizeMB: 0.5,           // 최대 500KB
        maxWidthOrHeight: 1920,   // 최대 1920px
        useWebWorker: true,
        fileType: 'image/jpeg'
    };
    
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
}
```

### 2. 썸네일 생성 ⭐⭐
```javascript
// 목록 표시용 작은 썸네일
// 100KB → 20KB (80% 절감)

썸네일 옵션:
- 크기: 200x200px
- 품질: 70%
- 용량: ~20KB
```

### 3. 오래된 사진 정리 정책 ⭐
```javascript
// 3년 이상 된 점검 사진 자동 삭제
// 또는 저해상도 버전으로 대체

정책 예시:
- 1년 이내: 원본 + 썸네일 유지
- 1~3년: 압축본 + 썸네일 유지
- 3년 이상: 썸네일만 유지 또는 삭제
```

### 4. CDN 캐싱 활용 (Firebase 기본 제공)
```
- 자주 보는 사진은 CDN 캐시에서 로드
- 다운로드 대역폭 비용 절감
- Firebase Storage가 자동으로 처리
```

---

## 🔒 보안 규칙 (Firebase Storage)

### storage.rules 설정
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 점검 사진 업로드/다운로드 규칙
    match /inspections/{year}/{month}/{equipmentId}/{filename} {
      // 인증된 사용자만 업로드 가능
      allow create: if request.auth != null 
                    && request.resource.size < 5 * 1024 * 1024  // 5MB 제한
                    && request.resource.contentType.matches('image/.*');
      
      // 인증된 사용자만 읽기 가능
      allow read: if request.auth != null;
      
      // 관리자만 삭제 가능
      allow delete: if request.auth != null 
                    && request.auth.token.role == 'admin';
    }
  }
}
```

---

## 🚀 대안 (비용이 걱정된다면)

### Option 1: Cloudflare R2 (추천) ⭐⭐⭐
```
장점:
✅ 저장 비용: $0.015/GB/월 (Firebase의 58%)
✅ 다운로드: 무료! (무제한)
✅ 업로드: 무료 (무제한)

단점:
⚠️ Firebase와 별도 설정 필요
⚠️ S3 호환 API 사용

예상 비용 (월 2,000건 점검):
- 저장 150GB: 150GB × $0.015 × 1,350원 = 약 3,000원/월
- 다운로드: 무료
💰 총 비용: 약 3,000원/월 (Firebase의 23%)
```

### Option 2: 자체 서버 (권장하지 않음)
```
장점:
✅ 초기 비용 없음 (기존 서버 활용 시)

단점:
❌ 서버 관리 부담
❌ 백업/복구 직접 구현
❌ CDN 없음 (속도 느림)
❌ 확장성 낮음
```

### Option 3: 사진 없이 운영
```
대안:
- 사진 대신 체크리스트 강화
- 상태 코드 세분화
- 텍스트 메모 상세화

장점: 비용 0원
단점: 증빙 능력 부족
```

---

## 📊 최종 추천

### 🥇 1순위: Firebase Storage + 이미지 압축
```
이유:
✅ Firebase 프로젝트 이미 사용 중
✅ 통합 관리 편리 (Firestore + Storage)
✅ 보안 규칙 일관성
✅ 무료 할당량으로 1~2년 운영 가능
✅ 클라이언트 사이드 압축으로 비용 최소화

예상 비용:
- 소규모 (월 100건): 무료
- 중규모 (월 500건): ~500원/월
- 대규모 (월 2,000건): ~3,000원/월
```

### 🥈 2순위: Cloudflare R2 (대규모 시)
```
전환 시점: 월 사진 10,000장 이상
비용 절감: Firebase 대비 70~80%
```

---

## 💻 구현 단계

### Phase 1: 기본 구현 (2-3시간)
```
✅ 1. Firebase Storage 설정
✅ 2. 사진 업로드 UI (inspection.html)
✅ 3. 이미지 압축 (browser-image-compression)
✅ 4. Firestore에 URL 저장
✅ 5. 썸네일 표시
```

### Phase 2: 최적화 (1-2시간)
```
🎯 1. 썸네일 자동 생성
🎯 2. 업로드 진행률 표시
🎯 3. 여러 장 사진 업로드
🎯 4. 사진 삭제 기능
```

### Phase 3: 고급 기능 (선택)
```
🚀 1. 사진 확대 뷰어
🚀 2. 사진 주석 (낙서 기능)
🚀 3. 사진 비교 (이전/현재)
```

---

## 💬 다음 단계 질문

**사진 첨부 기능을 구현하시겠습니까?**

1. **YES, Firebase Storage** (추천) → 2-3시간 소요
2. **YES, but 비용 걱정** → 압축 강화 전략 제시
3. **NO, 나중에** → 다른 기능 우선
4. **다른 대안 검토** → Cloudflare R2 등

---

## 📌 참고 링크

- [Firebase Storage 가격](https://firebase.google.com/pricing)
- [Cloudflare R2 가격](https://developers.cloudflare.com/r2/pricing/)
- [browser-image-compression](https://www.npmjs.com/package/browser-image-compression)
