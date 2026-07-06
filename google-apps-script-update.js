/**
 * Google Apps Script - Google Sheets에 이름 필드 추가 및 자동 채우기
 * 
 * 사용법:
 * 1. https://script.google.com 접속
 * 2. "HVAC API" 프로젝트 열기
 * 3. 이 코드를 Code.gs에 추가
 * 4. 함수 실행: updateSheetsWithNames()
 */

/**
 * 메인 함수: 모든 시트에 이름 필드 추가 및 데이터 채우기
 */
function updateSheetsWithNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Logger.log('🚀 Google Sheets 이름 필드 업데이트 시작...');
  
  try {
    // 1. Sites 데이터 로드 (참조용)
    const sitesData = loadSitesData(ss);
    Logger.log(`✅ Sites 로드 완료: ${Object.keys(sitesData).length}개`);
    
    // 2. Buildings 시트 업데이트
    const buildingsUpdated = updateBuildingsSheet(ss, sitesData);
    Logger.log(`✅ Buildings 업데이트 완료: ${buildingsUpdated}개`);
    
    // 3. Buildings 데이터 로드 (Equipment용 참조)
    const buildingsData = loadBuildingsData(ss);
    Logger.log(`✅ Buildings 로드 완료: ${Object.keys(buildingsData).length}개`);
    
    // 4. Equipment 시트 업데이트
    const equipmentUpdated = updateEquipmentSheet(ss, sitesData, buildingsData);
    Logger.log(`✅ Equipment 업데이트 완료: ${equipmentUpdated}개`);
    
    // 완료 메시지
    SpreadsheetApp.getUi().alert(
      '✅ 업데이트 완료!\n\n' +
      `Buildings: ${buildingsUpdated}개 업데이트\n` +
      `Equipment: ${equipmentUpdated}개 업데이트`
    );
    
    Logger.log('🎉 모든 시트 업데이트 완료!');
    
  } catch (error) {
    Logger.log('❌ 오류 발생: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ 오류 발생:\n' + error.toString());
  }
}

/**
 * Sites 시트에서 데이터 로드
 */
function loadSitesData(ss) {
  const sheet = ss.getSheetByName('sites');
  if (!sheet) {
    throw new Error('sites 시트를 찾을 수 없습니다.');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  const nameIndex = headers.indexOf('site_name');
  
  if (idIndex === -1 || nameIndex === -1) {
    throw new Error('sites 시트에 id 또는 site_name 컬럼이 없습니다.');
  }
  
  const sitesMap = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[idIndex];
    const name = row[nameIndex];
    if (id) {
      sitesMap[id] = name || '';
    }
  }
  
  return sitesMap;
}

/**
 * Buildings 시트에서 데이터 로드
 */
function loadBuildingsData(ss) {
  const sheet = ss.getSheetByName('buildings');
  if (!sheet) {
    throw new Error('buildings 시트를 찾을 수 없습니다.');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  const nameIndex = headers.indexOf('building_name');
  
  if (idIndex === -1 || nameIndex === -1) {
    throw new Error('buildings 시트에 id 또는 building_name 컬럼이 없습니다.');
  }
  
  const buildingsMap = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[idIndex];
    const name = row[nameIndex];
    if (id) {
      buildingsMap[id] = name || '';
    }
  }
  
  return buildingsMap;
}

/**
 * Buildings 시트 업데이트
 */
function updateBuildingsSheet(ss, sitesData) {
  const sheet = ss.getSheetByName('buildings');
  if (!sheet) {
    throw new Error('buildings 시트를 찾을 수 없습니다.');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // site_name 컬럼 인덱스 찾기 또는 추가
  let siteNameIndex = headers.indexOf('site_name');
  if (siteNameIndex === -1) {
    // site_id 다음에 site_name 컬럼 추가
    const siteIdIndex = headers.indexOf('site_id');
    if (siteIdIndex === -1) {
      throw new Error('buildings 시트에 site_id 컬럼이 없습니다.');
    }
    
    siteNameIndex = siteIdIndex + 1;
    sheet.insertColumnAfter(siteIdIndex);
    sheet.getRange(1, siteNameIndex + 1).setValue('site_name');
    Logger.log('✏️ buildings 시트에 site_name 컬럼 추가됨');
    
    // 데이터 다시 로드
    data[0].splice(siteNameIndex, 0, 'site_name');
  }
  
  const siteIdIndex = headers.indexOf('site_id');
  let updateCount = 0;
  
  // 각 행 업데이트
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const siteId = row[siteIdIndex];
    
    if (siteId && sitesData[siteId]) {
      const siteName = sitesData[siteId];
      sheet.getRange(i + 1, siteNameIndex + 1).setValue(siteName);
      updateCount++;
    }
  }
  
  return updateCount;
}

/**
 * Equipment 시트 업데이트
 */
function updateEquipmentSheet(ss, sitesData, buildingsData) {
  const sheet = ss.getSheetByName('equipment');
  if (!sheet) {
    throw new Error('equipment 시트를 찾을 수 없습니다.');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // site_name 컬럼 추가
  let siteNameIndex = headers.indexOf('site_name');
  const siteIdIndex = headers.indexOf('site_id');
  
  if (siteIdIndex === -1) {
    throw new Error('equipment 시트에 site_id 컬럼이 없습니다.');
  }
  
  if (siteNameIndex === -1) {
    siteNameIndex = siteIdIndex + 1;
    sheet.insertColumnAfter(siteIdIndex);
    sheet.getRange(1, siteNameIndex + 1).setValue('site_name');
    Logger.log('✏️ equipment 시트에 site_name 컬럼 추가됨');
    data[0].splice(siteNameIndex, 0, 'site_name');
  }
  
  // building_name 컬럼 추가
  let buildingNameIndex = headers.indexOf('building_name');
  const buildingIdIndex = headers.indexOf('building_id');
  
  if (buildingIdIndex === -1) {
    throw new Error('equipment 시트에 building_id 컬럼이 없습니다.');
  }
  
  if (buildingNameIndex === -1) {
    // building_id 다음에 추가
    buildingNameIndex = buildingIdIndex + 1;
    sheet.insertColumnAfter(buildingIdIndex);
    sheet.getRange(1, buildingNameIndex + 1).setValue('building_name');
    Logger.log('✏️ equipment 시트에 building_name 컬럼 추가됨');
    data[0].splice(buildingNameIndex, 0, 'building_name');
  }
  
  let updateCount = 0;
  
  // 각 행 업데이트
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const siteId = row[siteIdIndex];
    const buildingId = row[buildingIdIndex];
    
    let updated = false;
    
    // site_name 업데이트
    if (siteId && sitesData[siteId]) {
      const siteName = sitesData[siteId];
      sheet.getRange(i + 1, siteNameIndex + 1).setValue(siteName);
      updated = true;
    }
    
    // building_name 업데이트
    if (buildingId && buildingsData[buildingId]) {
      const buildingName = buildingsData[buildingId];
      sheet.getRange(i + 1, buildingNameIndex + 1).setValue(buildingName);
      updated = true;
    }
    
    if (updated) {
      updateCount++;
    }
  }
  
  return updateCount;
}

/**
 * 메뉴에 추가 (선택사항)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔧 HVAC 관리')
    .addItem('📋 이름 필드 업데이트', 'updateSheetsWithNames')
    .addToUi();
}
