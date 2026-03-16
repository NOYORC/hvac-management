# 현장 선택 UI/UX 개선 가이드

## 📌 변경 사항 요약

**목적**: 현장 선택 화면의 가독성을 높이고, 현장명을 간소화할 수 있도록 `site_group` 필드를 추가했습니다.

---

## 🎨 UI 변경 사항

### **Before (이전)**
```
┌─────────────────────────┐
│   🏢 [아이콘]           │
│                         │
│   옥산 - 옥산           │  ← site_name
│   📍 경기도 화성시...   │  ← address
│   👤 담당자명           │
│   📞 010-xxxx-xxxx     │
└─────────────────────────┘
```

### **After (이후)**
```
┌─────────────────────────┐
│   🏢 [아이콘]           │
│                         │
│   OKSAN                 │  ← site_group (새로 추가, 간소화된 그룹명)
│   옥산 - 옥산           │  ← site_name (기존과 동일)
│   📍 경기도 화성시...   │  ← address (기존과 동일)
│   👤 담당자명           │
│   📞 010-xxxx-xxxx     │
└─────────────────────────┘
```

---

## 🔧 기술적 변경 사항

### 1. **Firebase 데이터 구조 변경**

#### Sites 컬렉션에 새 필드 추가:
```javascript
// /sites/{site_id}
{
  site_name: "옥산 - 옥산",           // 기존 필드 (그대로 유지)
  site_group: "OKSAN",               // 🆕 새로 추가된 필드 (선택 사항)
  address: "경기도 화성시...",
  contact_name: "홍길동",
  contact_phone: "010-1234-5678"
}
```

#### 예시 데이터:
```javascript
// 옥산 현장
{
  site_name: "옥산 - 옥산",
  site_group: "OKSAN",               // 간소화된 영문명
  address: "경기도 화성시 옥산동..."
}

// 본사
{
  site_name: "본사 - 강남 빌딩",
  site_group: "본사",                 // 한글도 가능
  address: "서울시 강남구..."
}

// 지점
{
  site_name: "부산 지점 - 해운대 센터",
  site_group: "부산지점",
  address: "부산시 해운대구..."
}

// site_group 미입력 시
{
  site_name: "테스트 현장",
  site_group: "",                     // 빈 문자열 또는 미입력
  address: "서울시 중구..."
  // → UI에서 site_group 영역 숨김 처리됨
}
```

---

### 2. **CSS 스타일 추가** (`css/inspection.css`)

```css
/* ===== 현장 카드 레이아웃 개선 ===== */
.selection-card .site-group {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
    text-transform: uppercase;         /* 영문 자동 대문자 변환 */
    letter-spacing: 0.5px;             /* 글자 간격 */
    font-weight: 600;
}

.selection-card .site-name {
    font-size: 18px;
    color: #333;
    margin-bottom: 10px;
    font-weight: 700;
}

.selection-card .site-address {
    font-size: 14px;
    color: #666;
    margin: 5px 0;
    display: flex;
    align-items: center;
    gap: 5px;
}
```

---

### 3. **JavaScript 렌더링 로직 수정** (`js/inspection.js`)

#### Before:
```javascript
card.innerHTML = `
    <div class="icon"><i class="fas fa-building"></i></div>
    <h3>${site.site_name}</h3>
    <p><i class="fas fa-map-marker-alt"></i> ${site.address}</p>
    <p><i class="fas fa-user"></i> ${site.contact_name || '담당자 미등록'}</p>
    <p><i class="fas fa-phone"></i> ${site.contact_phone || '연락처 미등록'}</p>
`;
```

#### After:
```javascript
card.innerHTML = `
    <div class="icon"><i class="fas fa-building"></i></div>
    ${site.site_group ? `<div class="site-group">${site.site_group}</div>` : ''}
    <h3 class="site-name">${site.site_name}</h3>
    <p class="site-address"><i class="fas fa-map-marker-alt"></i> ${site.address}</p>
    <p><i class="fas fa-user"></i> ${site.contact_name || '담당자 미등록'}</p>
    <p><i class="fas fa-phone"></i> ${site.contact_phone || '연락처 미등록'}</p>
`;
```

**핵심 로직**:
- `${site.site_group ? ... : ''}` → `site_group`이 있을 때만 표시
- `site_group`이 빈 문자열 또는 `null`이면 해당 영역 자동 숨김

---

### 4. **Admin 페이지 수정** (`admin.html`, `js/admin.js`)

#### admin.html - 현장 추가/수정 폼:
```html
<div class="form-group">
    <label for="siteGroup">현장 그룹 (선택)</label>
    <input type="text" id="siteGroup" name="site_group" placeholder="예: 옥산, 본사, 지점 등">
    <small style="color: #999; font-size: 12px;">현장명 상단에 표시될 그룹명 (간소화용)</small>
</div>

<div class="form-group">
    <label for="siteName">현장명 *</label>
    <input type="text" id="siteName" name="site_name" required placeholder="본사 빌딩">
</div>
```

#### admin.js - 저장 로직:
```javascript
const siteData = {
    site_name: formData.get('site_name'),
    site_group: formData.get('site_group') || '',  // 🆕 추가
    address: formData.get('address'),
    contact_name: formData.get('contact_name'),
    contact_phone: formData.get('contact_phone')
};
```

#### admin.js - 수정 모달 로드:
```javascript
document.getElementById('siteGroup').value = site.site_group || '';  // 🆕 추가
document.getElementById('siteName').value = site.site_name;
```

---

## 📝 사용 가이드

### 1. **새 현장 추가 시**

1. **관리자 페이지 접속**: https://noyorc.github.io/hvac-management/admin.html
2. **현장 관리 탭** → **"+ 현장 추가"** 클릭
3. **현장 그룹** 입력 (선택 사항):
   ```
   예시:
   - "OKSAN"          (영문 대문자)
   - "본사"           (한글)
   - "부산지점"       (한글)
   - 비워두기 가능     (입력하지 않으면 UI에서 숨김)
   ```
4. **현장명** 입력 (필수):
   ```
   예시:
   - "옥산 - 옥산"
   - "본사 - 강남 빌딩"
   - "부산 지점 - 해운대 센터"
   ```
5. **저장** 버튼 클릭

---

### 2. **기존 현장 수정**

1. **관리자 페이지** → **현장 관리 탭**
2. 수정할 현장 카드의 **"수정"** 버튼 클릭
3. **현장 그룹** 필드에 값 입력 또는 수정
4. **저장** 버튼 클릭

---

### 3. **점검 페이지에서 확인**

1. **장비 점검** 페이지 접속: https://noyorc.github.io/hvac-management/inspection.html
2. **Step 1: 현장 선택** 화면에서 확인:
   - `site_group`이 입력된 현장 → 상단에 작은 글씨로 표시
   - `site_group`이 비어있는 현장 → 기존과 동일하게 `site_name`부터 표시

---

## 🔄 기존 데이터 마이그레이션

### **방법 1: Firebase Console에서 직접 수정**

1. **Firebase Console** 접속: https://console.firebase.google.com/
2. **프로젝트 선택**: `hvac-management-477fb`
3. **Firestore Database** → **sites** 컬렉션
4. 각 문서 클릭 → **"필드 추가"** 버튼
   - **필드명**: `site_group`
   - **유형**: `string`
   - **값**: 원하는 그룹명 (예: "OKSAN", "본사", "부산지점")
5. **업데이트** 버튼 클릭

---

### **방법 2: Admin 페이지에서 수정**

1. **관리자 페이지** → **현장 관리 탭**
2. 기존 현장 카드의 **"수정"** 버튼 클릭
3. **현장 그룹** 필드에 값 입력
4. **저장** 버튼 클릭
5. 모든 현장에 대해 반복

---

### **방법 3: 일괄 업데이트 스크립트 (개발자용)**

```javascript
// Browser Console에서 실행 (admin.html 페이지에서)

// 예시 매핑
const siteGroupMapping = {
  "옥산 - 옥산": "OKSAN",
  "본사 - 강남 빌딩": "본사",
  "부산 지점 - 해운대 센터": "부산지점"
};

// 일괄 업데이트
async function bulkUpdateSiteGroups() {
  const sitesData = await window.CachedFirestoreHelper.getAllDocuments('sites');
  
  for (const site of sitesData.data) {
    const siteGroup = siteGroupMapping[site.site_name];
    
    if (siteGroup) {
      await window.CachedFirestoreHelper.updateDocument('sites', site.id, {
        site_group: siteGroup
      });
      console.log(`✅ Updated: ${site.site_name} → ${siteGroup}`);
    }
  }
  
  console.log('🎉 일괄 업데이트 완료!');
}

bulkUpdateSiteGroups();
```

---

## 🎯 실제 사용 예시

### **현재 데이터 (예상)**
```javascript
// Firebase sites 컬렉션
{
  id: "abc123",
  site_name: "옥산 - 옥산",
  address: "경기도 화성시 옥산동...",
  contact_name: "홍길동",
  contact_phone: "010-1234-5678"
}
```

### **수정 후 데이터**
```javascript
{
  id: "abc123",
  site_name: "옥산 - 옥산",
  site_group: "OKSAN",               // 🆕 추가
  address: "경기도 화성시 옥산동...",
  contact_name: "홍길동",
  contact_phone: "010-1234-5678"
}
```

### **UI 표시**
```
┌─────────────────────────┐
│   🏢                    │
│                         │
│   OKSAN                 │  ← site_group (회색, 작은 글씨)
│   옥산 - 옥산           │  ← site_name (검은색, 큰 글씨)
│   📍 경기도 화성시...   │
│   👤 홍길동             │
│   📞 010-1234-5678     │
└─────────────────────────┘
```

---

## ✅ 테스트 체크리스트

- [x] CSS 스타일 추가 (`inspection.css`)
- [x] JavaScript 렌더링 로직 수정 (`inspection.js`)
- [x] Admin 페이지 폼 수정 (`admin.html`)
- [x] Admin 페이지 저장 로직 수정 (`admin.js`)
- [ ] Firebase에 `site_group` 필드 추가 (사용자 작업)
- [ ] 점검 페이지에서 UI 확인
- [ ] Admin 페이지에서 저장/수정 테스트

---

## 📱 반응형 디자인

모바일 화면에서도 동일하게 작동하며, 기존 CSS 반응형 스타일이 자동 적용됩니다:

```css
@media (max-width: 768px) {
    .selection-grid {
        grid-template-columns: 1fr;  /* 모바일: 1열 */
    }
}
```

---

## 🔗 관련 파일

- **UI 스타일**: `css/inspection.css` (라인 163-189)
- **렌더링 로직**: `js/inspection.js` (라인 237-249)
- **Admin 폼**: `admin.html` (라인 598-606)
- **Admin 로직**: `js/admin.js` (라인 532-556)

---

## 🚀 다음 단계

1. **코드 배포**: GitHub에 푸시 후 GitHub Pages 배포 대기 (2-3분)
2. **Firebase 데이터 업데이트**: Admin 페이지 또는 Firebase Console에서 `site_group` 추가
3. **테스트**: 점검 페이지에서 UI 확인
4. **추가 개선 (선택)**:
   - `site_group`별 필터링 기능
   - 그룹별 통계 대시보드
   - 그룹 색상 커스터마이징

---

## 💡 팁

- **site_group은 선택 사항**입니다. 입력하지 않아도 기존처럼 정상 작동합니다.
- **영문 입력 시 자동 대문자 변환**됩니다 (`text-transform: uppercase`).
- **한글, 숫자, 특수문자 모두 사용 가능**합니다.
- **기존 데이터 호환성 100%**: `site_group`이 없는 현장도 정상 표시됩니다.

---

## 📞 문의

추가 UI/UX 개선이나 기능 요청이 있으면 언제든지 말씀해주세요!
