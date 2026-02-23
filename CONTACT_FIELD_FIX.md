# 현장 담당자 정보 표시 및 입력 문제 해결

## 📋 문제 상황

### **사용자 보고**
1. **현장 선택 페이지**: 현장명과 주소는 표시되지만 담당자명과 연락처가 "undefined"로 표시됨
2. **Firestore 확인**: contact_name, contact_phone 필드는 Firestore에 정상 저장되어 있음
3. **관리자 페이지**: 현장 추가/수정 모달에 담당자 정보 입력 필드가 없음

### **스크린샷 증거**
- 현장 선택 화면: 담당자 정보 "undefined" 표시
- Firestore 콘솔: contact_name="김수진", contact_phone="010-6281-7620" 정상 저장됨

---

## 🔍 원인 분석

### **1. inspection.js - 필드명 불일치**

**문제 코드 (184-185줄):**
```javascript
<p><i class="fas fa-user"></i> ${site.manager}</p>
<p><i class="fas fa-phone"></i> ${site.phone}</p>
```

**실제 Firestore 필드:**
```javascript
{
  id: "SITE001",
  site_name: "하남열병합발전소(나래에너지서비스)",
  address: "경기도 하남시 초정대로 77",
  contact_name: "김수진",        // ← manager가 아님!
  contact_phone: "010-6281-7620"  // ← phone이 아님!
}
```

**결과:** `site.manager`와 `site.phone`은 undefined → 화면에 "undefined" 표시

---

### **2. admin.html - 입력 필드 누락**

**기존 현장 모달 (590-596줄):**
```html
<div class="form-group">
    <label for="siteName">현장명 *</label>
    <input type="text" id="siteName" name="site_name" required>
</div>
<div class="form-group">
    <label for="siteAddress">주소</label>
    <input type="text" id="siteAddress" name="address">
</div>
<!-- contact_name, contact_phone 필드 없음! -->
```

**결과:** 현장 등록/수정 시 담당자 정보를 입력할 방법 자체가 없음

---

### **3. admin.js - 데이터 처리 누락**

**기존 저장 코드 (519-522줄):**
```javascript
const siteData = {
    site_name: formData.get('site_name'),
    address: formData.get('address')
    // contact_name, contact_phone 없음!
};
```

**기존 수정 로드 코드 (504-505줄):**
```javascript
document.getElementById('siteName').value = site.site_name;
document.getElementById('siteAddress').value = site.address || '';
// contact_name, contact_phone 로드 안 함!
```

**결과:** HTML에 필드를 추가해도 JavaScript에서 처리하지 않아 저장 안 됨

---

## 🔧 해결 방법

### **1. inspection.js 수정**

**파일:** `js/inspection.js` (184-185줄)

**수정 전:**
```javascript
<p><i class="fas fa-user"></i> ${site.manager}</p>
<p><i class="fas fa-phone"></i> ${site.phone}</p>
```

**수정 후:**
```javascript
<p><i class="fas fa-user"></i> ${site.contact_name || '담당자 미등록'}</p>
<p><i class="fas fa-phone"></i> ${site.contact_phone || '연락처 미등록'}</p>
```

**변경 사항:**
- ✅ `site.manager` → `site.contact_name`
- ✅ `site.phone` → `site.contact_phone`
- ✅ 기본값 추가 (데이터 없을 때 "미등록" 표시)

---

### **2. admin.html 수정**

**파일:** `admin.html` (593-596줄 뒤)

**추가된 코드:**
```html
<div class="form-group">
    <label for="siteAddress">주소</label>
    <input type="text" id="siteAddress" name="address" placeholder="서울시 강남구...">
</div>

<!-- ✅ 새로 추가된 필드 -->
<div class="form-group">
    <label for="siteContactName">담당자명</label>
    <input type="text" id="siteContactName" name="contact_name" placeholder="홍길동">
</div>

<div class="form-group">
    <label for="siteContactPhone">담당자 연락처</label>
    <input type="tel" id="siteContactPhone" name="contact_phone" placeholder="010-1234-5678">
</div>

<div class="modal-footer">
```

**변경 사항:**
- ✅ 담당자명 입력 필드 추가 (`id="siteContactName"`, `name="contact_name"`)
- ✅ 담당자 연락처 필드 추가 (`id="siteContactPhone"`, `name="contact_phone"`)
- ✅ 적절한 placeholder 제공

---

### **3. admin.js 수정**

**파일:** `js/admin.js`

#### **(1) editSite() 함수 수정 (498-508줄)**

**수정 전:**
```javascript
function editSite(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    document.getElementById('siteModalTitle').textContent = '현장 수정';
    document.getElementById('siteId').value = site.id;
    document.getElementById('siteName').value = site.site_name;
    document.getElementById('siteAddress').value = site.address || '';
    document.getElementById('siteModal').classList.add('active');
    currentEditId = siteId;
}
```

**수정 후:**
```javascript
function editSite(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    document.getElementById('siteModalTitle').textContent = '현장 수정';
    document.getElementById('siteId').value = site.id;
    document.getElementById('siteName').value = site.site_name;
    document.getElementById('siteAddress').value = site.address || '';
    // ✅ 담당자 정보 로드
    document.getElementById('siteContactName').value = site.contact_name || '';
    document.getElementById('siteContactPhone').value = site.contact_phone || '';
    document.getElementById('siteModal').classList.add('active');
    currentEditId = siteId;
}
```

#### **(2) handleSiteSubmit() 함수 수정 (519-522줄)**

**수정 전:**
```javascript
const formData = new FormData(e.target);
const siteData = {
    site_name: formData.get('site_name'),
    address: formData.get('address')
};
```

**수정 후:**
```javascript
const formData = new FormData(e.target);
const siteData = {
    site_name: formData.get('site_name'),
    address: formData.get('address'),
    // ✅ 담당자 정보 저장
    contact_name: formData.get('contact_name'),
    contact_phone: formData.get('contact_phone')
};
```

---

## 📊 수정 결과

### **파일 변경 사항**

| 파일 | 변경 내용 | 라인 수 |
|------|----------|---------|
| `js/inspection.js` | 필드명 수정 (manager→contact_name, phone→contact_phone) | +2, -2 |
| `admin.html` | 담당자 입력 필드 2개 추가 | +10 |
| `js/admin.js` | editSite()에 필드 로드 추가, handleSiteSubmit()에 필드 저장 추가 | +5, -1 |

### **커밋 정보**

1. **1d61250** - `fix: 현장 선택 페이지에서 담당자 정보 표시 오류 수정`
   - inspection.js 필드명 수정
   
2. **e2e4a2e** - `fix: 관리자 페이지 현장 추가/수정 시 담당자 정보 처리`
   - admin.html에 입력 필드 추가
   - admin.js에 처리 로직 추가

---

## ✅ 해결 효과

### **Before (문제 상황)**
```
[현장 선택 화면]
📍 하남열병합발전소(나래에너지서비스)
📍 경기도 하남시 초정대로 77
👤 undefined          ← 문제!
📞 undefined          ← 문제!

[관리자 페이지 - 현장 모달]
현장명: [_______________]
주소:   [_______________]
(담당자 입력 필드 없음)  ← 문제!
```

### **After (수정 후)**
```
[현장 선택 화면]
📍 하남열병합발전소(나래에너지서비스)
📍 경기도 하남시 초정대로 77
👤 김수진             ← 정상 표시!
📞 010-6281-7620      ← 정상 표시!

[관리자 페이지 - 현장 모달]
현장명:       [_______________]
주소:         [_______________]
담당자명:     [_______________]  ← 추가됨!
담당자 연락처: [_______________]  ← 추가됨!
```

---

## 🧪 테스트 방법

### **1. 현장 선택 페이지 표시 확인**

**URL:** https://noyorc.github.io/hvac-management/inspection.html

**테스트 절차:**
1. 점검 페이지 접속
2. 현장 선택 화면에서 기존 현장 카드 확인
3. 담당자명과 연락처가 정상 표시되는지 확인

**예상 결과:**
- ✅ 담당자명: "김수진" (또는 "담당자 미등록")
- ✅ 연락처: "010-6281-7620" (또는 "연락처 미등록")
- ❌ ~~"undefined"~~ 표시 없음

---

### **2. 관리자 페이지 신규 현장 등록**

**URL:** https://noyorc.github.io/hvac-management/admin.html

**테스트 절차:**
1. 관리자 페이지 접속
2. "현장/건물 관리" 탭 선택
3. "+ 현장 추가" 버튼 클릭
4. 모달에 다음 정보 입력:
   - 현장명: 테스트 현장
   - 주소: 서울시 강남구 테헤란로 123
   - 담당자명: 홍길동
   - 담당자 연락처: 010-1234-5678
5. "저장" 버튼 클릭
6. Firestore 콘솔에서 저장 확인
7. 점검 페이지에서 현장 선택 시 정보 확인

**예상 결과:**
- ✅ Firestore에 contact_name, contact_phone 저장됨
- ✅ 점검 페이지에서 "홍길동", "010-1234-5678" 표시

---

### **3. 기존 현장 수정**

**테스트 절차:**
1. 관리자 페이지 → 현장/건물 관리
2. 기존 현장 카드의 "수정" 버튼 (✏️) 클릭
3. 모달에 기존 데이터 로드 확인:
   - 현장명: (기존 값)
   - 주소: (기존 값)
   - 담당자명: (기존 값 또는 빈 칸)
   - 담당자 연락처: (기존 값 또는 빈 칸)
4. 담당자 정보 수정 후 저장
5. Firestore 확인
6. 점검 페이지에서 업데이트 확인

**예상 결과:**
- ✅ 기존 데이터 로드됨
- ✅ 수정 후 Firestore 업데이트됨
- ✅ 점검 페이지에 반영됨

---

## 🔗 관련 페이지

- **점검 페이지**: https://noyorc.github.io/hvac-management/inspection.html
- **관리자 페이지**: https://noyorc.github.io/hvac-management/admin.html
- **대시보드**: https://noyorc.github.io/hvac-management/dashboard.html

---

## 📝 Firestore 데이터 구조

### **Sites 컬렉션**

```javascript
{
  id: "SITE001",                                    // 문서 ID
  site_name: "하남열병합발전소(나래에너지서비스)",      // 필수
  address: "경기도 하남시 초정대로 77",               // 선택
  contact_name: "김수진",                           // ✅ 이제 처리됨!
  contact_phone: "010-6281-7620",                   // ✅ 이제 처리됨!
  created_at: Timestamp                             // 자동 생성
}
```

### **필드 설명**

| 필드 | 타입 | 필수 | 설명 | 표시 위치 |
|------|------|------|------|-----------|
| `id` | String | ✅ | 현장 고유 ID | 모든 페이지 |
| `site_name` | String | ✅ | 현장명 | 점검, 관리자, 대시보드 |
| `address` | String | - | 주소 | 점검, 관리자 |
| `contact_name` | String | - | 담당자명 | 점검 (이제 표시됨!) |
| `contact_phone` | String | - | 담당자 연락처 | 점검 (이제 표시됨!) |
| `created_at` | Timestamp | ✅ | 생성일시 | Firestore 콘솔 |

---

## 💡 추가 개선 사항

### **1. 데이터 검증 추가 (선택)**

**admin.js에 추가할 수 있는 검증:**
```javascript
// 전화번호 형식 검증
const phonePattern = /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/;
if (siteData.contact_phone && !phonePattern.test(siteData.contact_phone)) {
    alert('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
    return;
}
```

### **2. 현장 카드에 담당자 정보 강조 (선택)**

**inspection.js CSS 추가:**
```css
.selection-card .contact-info {
    background: #f0f4ff;
    padding: 8px;
    border-radius: 5px;
    margin-top: 8px;
}
```

### **3. 필수 필드 설정 (선택)**

**admin.html 수정:**
```html
<div class="form-group">
    <label for="siteContactName">담당자명 *</label>
    <input type="text" id="siteContactName" name="contact_name" required>
</div>
```

---

## ✅ 체크리스트

- [x] inspection.js 필드명 수정 (manager→contact_name, phone→contact_phone)
- [x] admin.html에 담당자 입력 필드 추가
- [x] admin.js editSite()에 담당자 로드 추가
- [x] admin.js handleSiteSubmit()에 담당자 저장 추가
- [x] 코드 커밋 및 푸시 완료
- [x] 문서 작성 완료
- [ ] 실제 현장 데이터로 표시 테스트
- [ ] 신규 현장 등록 테스트
- [ ] 기존 현장 수정 테스트
- [ ] Firestore 데이터 확인

---

**수정 완료!** 이제 현장 선택 페이지에서 담당자 정보가 정상적으로 표시되고, 관리자 페이지에서 담당자 정보를 입력/수정할 수 있습니다. 🎉
