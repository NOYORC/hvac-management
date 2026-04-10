# Google Apps Script 수정 가이드

## 📋 프로젝트 정보
- **프로젝트 이름**: HVAC API
- **파일 이름**: Code.gs
- **현재 배포 URL**: https://script.google.com/macros/s/AKfycbzKnOxwx-AY4fg_bT88wHfR6w3BIbAytWnl8wrQ_MdSRj39LSYRYueDgx8Hl-RC1Jybuw/exec

## ✅ 확인 사항
Code.gs 파일 하나만 있는 것이 정상입니다. Google Apps Script는 단일 파일로도 충분히 작동합니다.

## 🔧 수정 방법

### 1단계: Google Apps Script 열기
1. https://script.google.com 접속
2. "HVAC API" 프로젝트 클릭
3. `Code.gs` 파일 확인

### 2단계: 기존 코드 확인
현재 `Code.gs`에 다음과 같은 기존 함수들이 있을 것입니다:
- `doGet(e)` - GET 요청 처리
- `getData(tableName)` - 시트에서 데이터 가져오기
- 기타 헬퍼 함수들

### 3단계: 새로운 함수 추가
기존 코드 **아래에** 다음 두 함수를 추가하세요:

```javascript
// ===== 새로 추가할 함수 1: 시트 데이터 전체 삭제 =====
function deleteAllData(tableName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(tableName);
    
    if (!sheet) {
      return {
        success: false,
        message: `시트 '${tableName}'를 찾을 수 없습니다.`
      };
    }
    
    const lastRow = sheet.getLastRow();
    
    // 헤더(1행)를 제외한 모든 데이터 삭제
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    
    Logger.log(`${tableName}: ${lastRow - 1}개 행 삭제됨`);
    
    return {
      success: true,
      deleted: lastRow - 1,
      message: `${lastRow - 1}개의 행이 삭제되었습니다.`
    };
    
  } catch (error) {
    Logger.log(`deleteAllData 오류: ${error.toString()}`);
    return {
      success: false,
      message: `오류: ${error.toString()}`
    };
  }
}

// ===== 새로 추가할 함수 2: 여러 데이터 일괄 추가 =====
function batchAddData(tableName, dataArray) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(tableName);
    
    if (!sheet) {
      return {
        success: false,
        message: `시트 '${tableName}'를 찾을 수 없습니다.`
      };
    }
    
    if (!dataArray || dataArray.length === 0) {
      return {
        success: true,
        added: 0,
        message: '추가할 데이터가 없습니다.'
      };
    }
    
    // 첫 번째 행에서 헤더 가져오기
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const headers = headerRange.getValues()[0];
    
    // 데이터를 2차원 배열로 변환
    const rows = dataArray.map(item => {
      return headers.map(header => {
        const value = item[header];
        
        // Date 객체 처리
        if (value instanceof Date) {
          return value;
        }
        
        // Firestore Timestamp 처리
        if (value && typeof value === 'object' && value.seconds) {
          return new Date(value.seconds * 1000);
        }
        
        // 일반 값 처리
        return value !== undefined && value !== null ? value : '';
      });
    });
    
    // 데이터 추가
    if (rows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
    }
    
    Logger.log(`${tableName}: ${rows.length}개 행 추가됨`);
    
    return {
      success: true,
      added: rows.length,
      message: `${rows.length}개의 행이 추가되었습니다.`
    };
    
  } catch (error) {
    Logger.log(`batchAddData 오류: ${error.toString()}`);
    return {
      success: false,
      message: `오류: ${error.toString()}`
    };
  }
}
```

### 4단계: doPost 함수 수정
기존 `doPost` 함수를 찾아서 다음과 같이 수정하세요:

**기존 코드가 없다면 새로 추가:**
```javascript
function doPost(e) {
  try {
    const action = e.parameter.action;
    const table = e.parameter.table;
    
    Logger.log(`POST 요청 - Action: ${action}, Table: ${table}`);
    
    let result;
    
    if (action === 'deleteAll') {
      // 시트 데이터 전체 삭제
      result = deleteAllData(table);
      
    } else if (action === 'batchAdd') {
      // POST body에서 데이터 배열 가져오기
      const postData = JSON.parse(e.postData.contents);
      result = batchAddData(table, postData.data);
      
    } else if (action === 'get') {
      // 기존 GET 로직
      result = getData(table);
      
    } else {
      result = {
        success: false,
        message: `알 수 없는 액션: ${action}`
      };
    }
    
    // JSON 응답 반환
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log(`doPost 오류: ${error.toString()}`);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: `오류: ${error.toString()}`
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

**기존 코드가 있다면:**
- `action === 'deleteAll'` 조건문 추가
- `action === 'batchAdd'` 조건문 추가

### 5단계: 저장 및 배포

1. **저장**: 
   - 💾 Ctrl+S 또는 상단의 "저장" 아이콘 클릭

2. **배포**:
   - 🚀 상단 "배포" → "배포 관리" 클릭
   - 기존 배포의 ⚙️ 톱니바퀴 아이콘 클릭
   - "버전" 드롭다운에서 "새 버전" 선택
   - "배포" 버튼 클릭

3. **완료**:
   - 배포 URL이 동일한지 확인
   - 변경사항이 즉시 반영됨

## 🧪 테스트 방법

### 로컬 테스트 (Apps Script 에디터 내)
1. `deleteAllData` 함수 선택
2. 상단 "실행" 버튼 클릭
3. 로그 확인

### 웹 앱 테스트
1. https://noyorc.github.io/hvac-management/migrate-data.html 열기
2. F12 → Console 탭 열기
3. "Firebase → Google Sheets" 선택
4. "데이터 확인" 클릭
5. "마이그레이션 시작" 클릭
6. 콘솔 로그 및 진행 상황 확인

## ⚠️ 주의사항

1. **백업**: 수정 전에 Google Sheets 데이터를 백업하세요
2. **테스트 시트**: 가능하면 테스트용 시트로 먼저 테스트하세요
3. **권한**: 스크립트가 Google Sheets에 접근할 수 있는 권한이 있어야 합니다
4. **배포 URL**: 배포 후 URL이 변경되지 않았는지 확인하세요

## 🔍 문제 해결

### 오류가 발생하면:
1. Apps Script 에디터에서 "실행" → "로그 보기" 확인
2. 웹 브라우저 Console 확인
3. 시트 이름이 정확한지 확인:
   - sites
   - buildings
   - equipment
   - inspectors
   - inspections

### CORS 오류가 발생하면:
- 배포 시 "액세스 권한" → "모든 사용자" 선택되어 있는지 확인

## 📞 도움이 필요하면

오류 메시지와 함께 다음 정보를 제공해주세요:
- Apps Script 로그 (실행 → 로그 보기)
- 브라우저 Console 오류 메시지
- 어떤 단계에서 오류가 발생했는지
