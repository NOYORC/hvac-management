# 🔒 ADMIN 전용 데이터 등록 규칙 적용 가이드

## ⚡ 빠른 적용 (5분)

### 1단계: 규칙 파일 열기

프로젝트 폴더에서 다음 파일을 엽니다:
```
📁 hvac-management/
  └─ FIRESTORE_RULES_ADMIN_ONLY.txt  ← 이 파일!
```

### 2단계: 전체 복사

파일 내용 **전체**를 복사합니다 (Ctrl + A → Ctrl + C)

### 3단계: Firebase Console 접속

1. 브라우저에서 열기: https://console.firebase.google.com/
2. 프로젝트 선택: **hvac-management-477fb**
3. 왼쪽 메뉴: **Firestore Database** 클릭
4. 상단 탭: **규칙(Rules)** 클릭

### 4단계: 규칙 붙여넣기

1. 기존 규칙 **전체 삭제** (Ctrl + A → Delete)
2. 복사한 규칙 **붙여넣기** (Ctrl + V)
3. **"게시(Publish)"** 버튼 클릭 ⭐
4. 확인 대화상자 → **"게시"** 클릭

### 5단계: 완료!

✅ 이제 ADMIN 계정만 데이터를 등록할 수 있습니다.

---

## 📊 권한 정리

| 역할 | 데이터 읽기 | 데이터 등록/수정 | 데이터 삭제 |
|------|-------------|------------------|-------------|
| **VIEWER** | ✅ | ❌ | ❌ |
| **INSPECTOR** | ✅ | ❌ (점검 기록만 ✅) | ❌ |
| **MANAGER** | ✅ | ❌ (점검 기록만 ✅) | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ |

**핵심 변경사항**:
- ❌ MANAGER는 더 이상 장비/사이트/건물 등록 불가
- ✅ ADMIN만 모든 데이터 등록 가능
- ✅ MANAGER는 단순히 직책 이름 (특별 권한 없음)

---

## 📍 엑셀 데이터 가져오기 페이지 위치

### 방법 1: 직접 URL 접속

브라우저 주소창에 입력:
```
https://noyorc.github.io/hvac-management/excel-import.html
```

### 방법 2: 로컬 테스트

프로젝트 폴더에서:
```
📁 hvac-management/
  └─ excel-import.html  ← 이 파일을 브라우저로 열기
```

### 방법 3: 메인 메뉴에 추가 (선택)

**참고**: 현재는 메인 화면에 링크가 없습니다. 
ADMIN만 사용하는 페이지이므로 URL을 직접 북마크하시면 편리합니다.

---

## 🧪 테스트 방법

### ADMIN 계정 테스트

```
1. ADMIN 계정으로 로그인
   ↓
2. 주소창에 입력:
   https://noyorc.github.io/hvac-management/excel-import.html
   ↓
3. 엑셀 파일 업로드
   ↓
4. ✅ "데이터를 성공적으로 저장했습니다" 메시지 확인
```

### 일반 사용자(MANAGER/INSPECTOR) 테스트

```
1. MANAGER 또는 INSPECTOR 계정으로 로그인
   ↓
2. 주소창에 입력:
   https://noyorc.github.io/hvac-management/excel-import.html
   ↓
3. 엑셀 파일 업로드
   ↓
4. ❌ "Missing or insufficient permissions" 오류 발생
   (정상 동작 - 권한 없음)
```

---

## ⚠️ 주의사항

### 반드시 "게시" 버튼 클릭!

규칙을 붙여넣은 후 **반드시 "게시" 버튼을 클릭**해야 적용됩니다!

### 브라우저 캐시 삭제

규칙 적용 후 브라우저 새로고침:
- **Windows**: Ctrl + F5
- **Mac**: Cmd + Shift + R

### ADMIN 계정 확인

Firestore에서 확인:
```
Firestore Database → users 컬렉션 → 본인 UID 문서
→ role 필드가 "admin"인지 확인
```

---

## 🔍 문제 해결

### Q1: 여전히 권한 오류가 발생해요

**체크리스트**:
- [ ] Firestore Rules를 **게시**했나요?
- [ ] 브라우저 **캐시를 삭제**했나요?
- [ ] **ADMIN 계정**으로 로그인했나요?
- [ ] Firestore에서 `role` 필드가 `'admin'`인가요?

**디버깅**:
```javascript
// 브라우저 콘솔(F12)에서 실행
const user = JSON.parse(sessionStorage.getItem('auth_user'));
console.log('현재 역할:', user?.role);
```

### Q2: MANAGER도 데이터를 등록하고 싶어요

**방법**: MANAGER에게도 쓰기 권한 부여

규칙 수정 (ADMIN만 → ADMIN/MANAGER):
```javascript
// 변경 전
allow create, update: if isAdmin();

// 변경 후
allow create, update: if isAuthenticated() && 
                          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
```

---

## ✅ 완료 확인

모든 단계를 완료했다면:
- ✅ Firestore Rules 게시 완료
- ✅ ADMIN 계정으로 로그인
- ✅ excel-import.html 페이지 접속 가능
- ✅ 데이터 업로드 성공

---

## 📞 추가 지원

문제가 계속되면 다음 정보를 제공해주세요:
1. 브라우저 콘솔 로그 (F12 → Console 탭)
2. 현재 로그인한 사용자의 역할
3. Firestore Rules 전체 내용

더 정확한 도움을 드릴 수 있습니다!
