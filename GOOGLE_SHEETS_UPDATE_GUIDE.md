# Google Sheets 이름 필드 자동 업데이트 가이드

## 📋 개요

Google Sheets의 Buildings와 Equipment 시트에 `site_name`, `building_name` 컬럼을 자동으로 추가하고 데이터를 채우는 스크립트입니다.

---

## 🚀 설치 및 실행 방법

### 1단계: Google Apps Script 접속

1. **스크립트 에디터 열기**:
   ```
   https://script.google.com
   ```

2. **"HVAC API" 프로젝트 찾기**:
   - 최근 프로젝트 목록에서 찾거나
   - 검색창에 "HVAC" 입력

3. **프로젝트 열기**

---

### 2단계: 코드 추가

1. **Code.gs 파일 열기** (왼쪽 사이드바)

2. **기존 코드 맨 아래에 추가**:
   - `google-apps-script-update.js` 파일 내용 복사
   - Code.gs 파일 끝에 붙여넣기

3. **저장**: `Ctrl + S` (또는 `Cmd + S`)

---

### 3단계: 함수 실행

1. **함수 선택**:
   - 상단 드롭다운에서 `updateSheetsWithNames` 선택

2. **실행 버튼 클릭**: ▶️ (재생 버튼)

3. **권한 승인**:
   - 처음 실행 시 "권한 검토" 화면 표시
   - "고급" → "... (안전하지 않음)으로 이동" 클릭
   - "허용" 클릭

4. **실행 로그 확인**:
   - 하단 "실행 로그" 탭에서 진행 상황 확인
   ```
   🚀 Google Sheets 이름 필드 업데이트 시작...
   ✅ Sites 로드 완료: 5개
   ✏️ buildings 시트에 site_name 컬럼 추가됨
   ✅ Buildings 업데이트 완료: 15개
   ✅ Buildings 로드 완료: 15개
   ✏️ equipment 시트에 site_name 컬럼 추가됨
   ✏️ equipment 시트에 building_name 컬럼 추가됨
   ✅ Equipment 업데이트 완료: 23개
   🎉 모든 시트 업데이트 완료!
   ```

5. **완료 알림**:
   - 팝업 창에 결과 표시
   ```
   ✅ 업데이트 완료!
   
   Buildings: 15개 업데이트
   Equipment: 23개 업데이트
   ```

---

### 4단계: 결과 확인

1. **Google Sheets로 돌아가기**:
   - 상단 메뉴 "스프레드시트 열기" 클릭

2. **Buildings 시트 확인**:
   ```
   id    | site_id | site_name   | building_name  ← 새 컬럼!
   BLD001| SITE001 | 서울발전소   | A동
   ```

3. **Equipment 시트 확인**:
   ```
   id    | site_id | site_name   | building_id | building_name  ← 새 컬럼들!
   EQ001 | SITE001 | 서울발전소   | BLD001     | A동
   ```

---

## 🎯 스크립트가 하는 일

### 1. Sites 데이터 로드
```
sites 시트에서 id → site_name 매핑 생성
예: SITE001 → "서울발전소"
```

### 2. Buildings 시트 업데이트
```
1. site_name 컬럼 추가 (site_id 바로 옆)
2. 각 행의 site_id를 보고 해당하는 site_name 자동 입력
```

### 3. Buildings 데이터 로드
```
buildings 시트에서 id → building_name 매핑 생성
예: BLD001 → "A동"
```

### 4. Equipment 시트 업데이트
```
1. site_name 컬럼 추가 (site_id 바로 옆)
2. building_name 컬럼 추가 (building_id 바로 옆)
3. 각 행의 site_id, building_id를 보고 이름 자동 입력
```

---

## 📊 업데이트 전/후 비교

### Buildings 시트

**업데이트 전:**
```
| id     | site_id | building_name |
|--------|---------|---------------|
| BLD001 | SITE001 | A동           |
```

**업데이트 후:**
```
| id     | site_id | site_name   | building_name |
|--------|---------|-------------|---------------|
| BLD001 | SITE001 | 서울발전소   | A동           |
                    ↑ 추가됨!
```

### Equipment 시트

**업데이트 전:**
```
| id    | site_id | building_id | equipment_type |
|-------|---------|-------------|----------------|
| EQ001 | SITE001 | BLD001      | COOLING TOWER  |
```

**업데이트 후:**
```
| id    | site_id | site_name   | building_id | building_name | equipment_type |
|-------|---------|-------------|-------------|---------------|----------------|
| EQ001 | SITE001 | 서울발전소   | BLD001     | A동           | COOLING TOWER  |
                   ↑ 추가됨!                   ↑ 추가됨!
```

---

## 🔧 추가 기능: 메뉴에 추가 (선택사항)

코드를 추가하면 스프레드시트 메뉴에 버튼이 생깁니다:

1. **스프레드시트 새로고침**

2. **상단 메뉴에 "🔧 HVAC 관리" 메뉴 생성됨**

3. **메뉴 클릭 → "📋 이름 필드 업데이트" 선택**
   - 스크립트 에디터 없이 바로 실행 가능!

---

## ⚠️ 주의사항

1. **컬럼 위치**:
   - site_name은 site_id 바로 다음에 추가됩니다
   - building_name은 building_id 바로 다음에 추가됩니다

2. **데이터 덮어쓰기**:
   - 이미 site_name, building_name 컬럼이 있으면 데이터를 업데이트합니다
   - 기존 데이터는 보존되지 않습니다

3. **필수 컬럼**:
   - sites: `id`, `site_name` 필수
   - buildings: `id`, `site_id`, `building_name` 필수
   - equipment: `id`, `site_id`, `building_id` 필수

4. **재실행 가능**:
   - 언제든 다시 실행 가능
   - 데이터가 변경되었을 때 재실행하면 자동 업데이트

---

## 🐛 문제 해결

### 오류: "sites 시트를 찾을 수 없습니다"
- 시트 이름이 정확히 `sites`인지 확인 (소문자, 복수형)

### 오류: "id 또는 site_name 컬럼이 없습니다"
- 1행(헤더 행)에 `id`와 `site_name` 컬럼이 있는지 확인
- 철자와 대소문자 정확히 확인

### 컬럼이 추가되지 않음
- 시트가 보호되어 있는지 확인
- 편집 권한이 있는지 확인

### 데이터가 채워지지 않음
- sites 시트에 해당 ID의 데이터가 있는지 확인
- site_id 값이 정확히 일치하는지 확인 (공백 주의)

---

## 💡 팁

### 데이터 일치 확인
```javascript
// 로그에서 확인할 수 있습니다
✅ Sites 로드 완료: 5개  ← sites 시트의 데이터 수
✅ Buildings 업데이트 완료: 15개  ← 실제 업데이트된 행 수
```

업데이트된 수가 0이면:
- site_id 값이 sites 시트의 id와 일치하지 않음
- 공백이나 대소문자 문제 가능성

### 수동 확인
1. sites 시트에서 `SITE001` 찾기
2. buildings 시트에서 `SITE001` 찾기
3. 정확히 일치하는지 확인

---

## 📦 파일 위치

- **스크립트 파일**: `/home/user/webapp/google-apps-script-update.js`
- **가이드 문서**: `/home/user/webapp/GOOGLE_SHEETS_UPDATE_GUIDE.md`

---

## 🎉 완료 후

1. **Google Sheets 확인**:
   - site_name, building_name 컬럼 생성됨
   - 모든 행에 이름 자동 입력됨

2. **Firebase로 다시 가져오기** (선택사항):
   - migrate-data.html 접속
   - "Google Sheets → Firebase" 선택
   - 마이그레이션 실행

이제 Google Sheets에서도 ID 없이 바로 이름을 확인할 수 있습니다! ✨
