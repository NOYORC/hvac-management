// 엑셀/CSV 데이터 가져오기 스크립트

let currentData = {
    sites: null,
    buildings: null,
    equipment: null,
    all: {
        sites: null,
        buildings: null,
        equipment: null
    }
};

// Firebase 초기화 대기
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.db && window.FirestoreHelper && window.FirestoreTimestamp) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.db && window.FirestoreHelper && window.FirestoreTimestamp) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// 탭 전환
function switchTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    event.target.closest('.tab').classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// 드래그 앤 드롭 설정
['sites', 'buildings', 'equipment', 'all'].forEach(type => {
    const dropZone = document.getElementById(`dropZone${capitalize(type)}`);
    
    if (!dropZone) return;
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            if (type === 'all') {
                handleAllFileUpload(files[0]);
            } else {
                handleFileUpload(type, files[0]);
            }
        }
    });
});

// 파일 업로드 처리
function handleFileUpload(type, file) {
    if (!file) return;
    
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    if (!['xlsx', 'csv'].includes(fileExt)) {
        showStatus('error', '❌ 지원하지 않는 파일 형식입니다. (.xlsx 또는 .csv만 가능)');
        return;
    }
    
    // 파일 정보 표시
    document.getElementById(`fileName${capitalize(type)}`).textContent = fileName;
    document.getElementById(`fileInfo${capitalize(type)}`).classList.add('show');
    
    // 파일 읽기
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 첫 번째 시트 읽기
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // JSON으로 변환
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showStatus('error', '❌ 파일에 데이터가 없습니다.');
                return;
            }
            
            // 데이터 저장
            currentData[type] = jsonData;
            
            // 미리보기 표시
            showPreview(type, jsonData);
            
            showStatus('success', `✅ ${jsonData.length}개의 데이터를 불러왔습니다.`);
            
        } catch (error) {
            showStatus('error', `❌ 파일 읽기 오류: ${error.message}`);
            console.error('파일 읽기 오류:', error);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// 데이터 미리보기 표시
function showPreview(type, data) {
    const previewSection = document.getElementById(`preview${capitalize(type)}`);
    const previewTable = document.getElementById(`previewTable${capitalize(type)}`);
    
    if (data.length === 0) return;
    
    // 테이블 헤더 생성
    const headers = Object.keys(data[0]);
    let html = '<thead><tr>';
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead>';
    
    // 테이블 바디 생성 (최대 10개만 표시)
    html += '<tbody>';
    const previewCount = Math.min(data.length, 10);
    for (let i = 0; i < previewCount; i++) {
        html += '<tr>';
        headers.forEach(header => {
            html += `<td>${data[i][header] || ''}</td>`;
        });
        html += '</tr>';
    }
    html += '</tbody>';
    
    previewTable.innerHTML = html;
    previewSection.classList.add('show');
}

// Firestore에 데이터 저장
async function importData(type) {
    await waitForFirebase();
    
    const data = currentData[type];
    if (!data || data.length === 0) {
        showStatus('error', '❌ 가져올 데이터가 없습니다.');
        return;
    }
    
    const btnImport = document.getElementById(`btnImport${capitalize(type)}`);
    btnImport.disabled = true;
    btnImport.innerHTML = '<div class="spinner"></div> 저장 중...';
    
    document.getElementById('progressContainer').style.display = 'block';
    
    try {
        showStatus('info', `📤 ${data.length}개의 ${getTypeName(type)} 데이터를 저장하는 중...`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // 배치 처리 (50개씩)
        const batchSize = 50;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, Math.min(i + batchSize, data.length));
            
            const promises = batch.map(async (item) => {
                try {
                    // ID 확인
                    if (!item.id) {
                        throw new Error('ID가 없습니다');
                    }
                    
                    // 데이터 가공
                    const processedItem = processItemData(type, item);
                    
                    // Firestore에 저장
                    const result = await window.FirestoreHelper.setDocument(type, item.id, processedItem);
                    
                    if (result.success) {
                        return { success: true };
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    return { success: false, error: error.message, item };
                }
            });
            
            const results = await Promise.all(promises);
            
            results.forEach((result, idx) => {
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                    errors.push({
                        row: i + idx + 1,
                        error: result.error,
                        item: result.item
                    });
                }
            });
            
            // 진행률 업데이트
            const progress = Math.min(i + batchSize, data.length);
            updateProgress(progress, data.length, `${getTypeName(type)} 저장 중`);
        }
        
        // 결과 표시
        if (errorCount === 0) {
            showStatus('success', `🎉 모든 데이터 저장 완료!<br>성공: ${successCount}개`);
        } else {
            let errorMsg = `⚠️ 일부 데이터 저장 실패<br>성공: ${successCount}개, 실패: ${errorCount}개<br><br>`;
            errorMsg += '<strong>오류 목록:</strong><br>';
            errors.slice(0, 5).forEach(err => {
                errorMsg += `- 행 ${err.row}: ${err.error}<br>`;
            });
            if (errors.length > 5) {
                errorMsg += `... 외 ${errors.length - 5}개`;
            }
            showStatus('error', errorMsg);
            
            console.error('저장 실패 항목:', errors);
        }
        
    } catch (error) {
        showStatus('error', `❌ 저장 오류: ${error.message}`);
        console.error('데이터 저장 오류:', error);
    } finally {
        btnImport.disabled = false;
        btnImport.innerHTML = '<i class="fas fa-upload"></i> Firestore에 저장';
    }
}

// 데이터 가공 (타입별)
function processItemData(type, item) {
    const processed = { ...item };
    
    // 공통: created_at 추가
    processed.created_at = window.FirestoreTimestamp.now();
    
    // 타입별 처리
    if (type === 'sites') {
        // 현장 데이터 처리
        // 필수 필드: id, site_name, address, contact_name, contact_phone
    } else if (type === 'buildings') {
        // 건물 데이터 처리
        // 필수 필드: id, site_id, building_name, floors
        if (processed.floors) {
            processed.floors = parseInt(processed.floors);
        }
    } else if (type === 'equipment') {
        // 장비 데이터 처리
        // 필수 필드: id, site_id, building_id, equipment_type, model, location
        if (processed.capacity) {
            processed.capacity = parseFloat(processed.capacity);
        }
        
        // installation_date가 있으면 Timestamp로 변환
        if (processed.installation_date) {
            try {
                const date = new Date(processed.installation_date);
                if (!isNaN(date.getTime())) {
                    processed.installation_date = window.FirestoreTimestamp.fromDate(date);
                }
            } catch (e) {
                delete processed.installation_date;
            }
        } else {
            processed.installation_date = window.FirestoreTimestamp.now();
        }
    }
    
    return processed;
}

// 업로드 리셋
function resetUpload(type) {
    currentData[type] = null;
    document.getElementById(`fileInfo${capitalize(type)}`).classList.remove('show');
    document.getElementById(`preview${capitalize(type)}`).classList.remove('show');
    document.getElementById(`fileInput${capitalize(type)}`).value = '';
    document.getElementById('status').style.display = 'none';
}

// 상태 표시
function showStatus(type, message) {
    const statusEl = document.getElementById('status');
    statusEl.className = `status ${type}`;
    statusEl.innerHTML = message;
    statusEl.style.display = 'block';
}

// 진행률 업데이트
function updateProgress(current, total, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const percentage = Math.round((current / total) * 100);
    
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${message} (${current}/${total})`;
}

// 템플릿 다운로드
function downloadSitesTemplate() {
    const template = [
        {
            id: 'SITE001',
            site_name: '강남 오피스 빌딩',
            address: '서울특별시 강남구 테헤란로 123',
            contact_name: '김철수',
            contact_phone: '02-1234-5678'
        },
        {
            id: 'SITE002',
            site_name: '판교 테크노밸리',
            address: '경기도 성남시 분당구 판교역로 235',
            contact_name: '이영희',
            contact_phone: '031-9876-5432'
        }
    ];
    
    downloadExcel('현장_데이터_템플릿', template);
}

function downloadBuildingsTemplate() {
    const template = [
        { id: 'BLD001', site_id: 'SITE001', building_name: 'A동', floors: 15 },
        { id: 'BLD002', site_id: 'SITE001', building_name: 'B동', floors: 12 },
        { id: 'BLD003', site_id: 'SITE001', building_name: 'C동', floors: 10 }
    ];
    
    downloadExcel('건물_데이터_템플릿', template);
}

function downloadEquipmentTemplate() {
    const template = [
        {
            id: 'EQ0001',
            site_id: 'SITE001',
            building_id: 'BLD001',
            equipment_type: 'PACKAGED AIR CONDITIONER UNIT',
            model: 'CARRIER-30XA',
            location: '기계실',
            floor: '5F',
            capacity: '25RT'
        },
        {
            id: 'EQ0002',
            site_id: 'SITE001',
            building_id: 'BLD001',
            equipment_type: 'TURBO CHILLER',
            model: 'TRANE-CVHE',
            location: '기계실',
            floor: 'B1',
            capacity: '500RT'
        }
    ];
    
    downloadExcel('장비_데이터_템플릿', template);
}

function downloadExcel(filename, data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// 유틸리티 함수
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTypeName(type) {
    const names = {
        sites: '현장',
        buildings: '건물',
        equipment: '장비',
        all: '통합'
    };
    return names[type] || type;
}

// ===== 통합 가져오기 기능 =====

// 통합 파일 업로드 처리
function handleAllFileUpload(file) {
    if (!file) return;
    
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    if (fileExt !== 'xlsx') {
        showStatus('error', '❌ 통합 가져오기는 .xlsx 파일만 지원합니다.');
        return;
    }
    
    // 파일 정보 표시
    document.getElementById('fileNameAll').textContent = fileName;
    document.getElementById('fileInfoAll').classList.add('show');
    
    // 파일 읽기
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 3개 시트 확인
            const sheetNames = workbook.SheetNames;
            console.log('📋 시트 목록:', sheetNames);
            
            // Sites 시트 읽기
            const sitesSheet = workbook.Sheets['Sites'] || workbook.Sheets['sites'];
            if (!sitesSheet) {
                showStatus('error', '❌ "Sites" 시트를 찾을 수 없습니다.');
                return;
            }
            const sitesData = XLSX.utils.sheet_to_json(sitesSheet);
            
            // Buildings 시트 읽기
            const buildingsSheet = workbook.Sheets['Buildings'] || workbook.Sheets['buildings'];
            if (!buildingsSheet) {
                showStatus('error', '❌ "Buildings" 시트를 찾을 수 없습니다.');
                return;
            }
            const buildingsData = XLSX.utils.sheet_to_json(buildingsSheet);
            
            // Equipment 시트 읽기
            const equipmentSheet = workbook.Sheets['Equipment'] || workbook.Sheets['equipment'];
            if (!equipmentSheet) {
                showStatus('error', '❌ "Equipment" 시트를 찾을 수 없습니다.');
                return;
            }
            const equipmentData = XLSX.utils.sheet_to_json(equipmentSheet);
            
            // 데이터 저장
            currentData.all = {
                sites: sitesData,
                buildings: buildingsData,
                equipment: equipmentData
            };
            
            // 미리보기 표시
            showAllPreview(sitesData, buildingsData, equipmentData);
            
            showStatus('success', `✅ 데이터를 불러왔습니다<br>현장: ${sitesData.length}개, 건물: ${buildingsData.length}개, 장비: ${equipmentData.length}개`);
            
        } catch (error) {
            showStatus('error', `❌ 파일 읽기 오류: ${error.message}`);
            console.error('파일 읽기 오류:', error);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// 통합 미리보기 표시
function showAllPreview(sitesData, buildingsData, equipmentData) {
    const previewSection = document.getElementById('previewAll');
    
    // 현장 미리보기
    if (sitesData.length > 0) {
        document.getElementById('sitesCount').textContent = sitesData.length;
        const sitesTable = document.getElementById('previewTableAllSites');
        sitesTable.innerHTML = generatePreviewTable(sitesData, 5);
    }
    
    // 건물 미리보기
    if (buildingsData.length > 0) {
        document.getElementById('buildingsCount').textContent = buildingsData.length;
        const buildingsTable = document.getElementById('previewTableAllBuildings');
        buildingsTable.innerHTML = generatePreviewTable(buildingsData, 5);
    }
    
    // 장비 미리보기
    if (equipmentData.length > 0) {
        document.getElementById('equipmentCount').textContent = equipmentData.length;
        const equipmentTable = document.getElementById('previewTableAllEquipment');
        equipmentTable.innerHTML = generatePreviewTable(equipmentData, 5);
    }
    
    previewSection.classList.add('show');
}

// 테이블 HTML 생성
function generatePreviewTable(data, maxRows) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    let html = '<thead><tr>';
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead>';
    
    html += '<tbody>';
    const previewCount = Math.min(data.length, maxRows);
    for (let i = 0; i < previewCount; i++) {
        html += '<tr>';
        headers.forEach(header => {
            html += `<td>${data[i][header] || ''}</td>`;
        });
        html += '</tr>';
    }
    
    if (data.length > maxRows) {
        html += `<tr><td colspan="${headers.length}" style="text-align: center; color: #666;">... 외 ${data.length - maxRows}개</td></tr>`;
    }
    
    html += '</tbody>';
    
    return html;
}

// 통합 데이터 저장
async function importAllData() {
    await waitForFirebase();
    
    const allData = currentData.all;
    if (!allData || !allData.sites || !allData.buildings || !allData.equipment) {
        showStatus('error', '❌ 가져올 데이터가 없습니다.');
        return;
    }
    
    const btnImport = document.getElementById('btnImportAll');
    btnImport.disabled = true;
    btnImport.innerHTML = '<div class="spinner"></div> 저장 중...';
    
    document.getElementById('progressContainer').style.display = 'block';
    
    try {
        let totalSuccess = 0;
        let totalError = 0;
        const allErrors = [];
        
        // 1. 현장 저장
        showStatus('info', '🏢 현장 데이터 저장 중...');
        const sitesResult = await importDataBatch('sites', allData.sites);
        totalSuccess += sitesResult.successCount;
        totalError += sitesResult.errorCount;
        allErrors.push(...sitesResult.errors);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 2. 건물 저장
        showStatus('info', '🏗️ 건물 데이터 저장 중...');
        const buildingsResult = await importDataBatch('buildings', allData.buildings);
        totalSuccess += buildingsResult.successCount;
        totalError += buildingsResult.errorCount;
        allErrors.push(...buildingsResult.errors);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. 장비 저장
        showStatus('info', '⚙️ 장비 데이터 저장 중...');
        const equipmentResult = await importDataBatch('equipment', allData.equipment);
        totalSuccess += equipmentResult.successCount;
        totalError += equipmentResult.errorCount;
        allErrors.push(...equipmentResult.errors);
        
        // 결과 표시
        if (totalError === 0) {
            showStatus('success', `🎉 모든 데이터 저장 완료!<br>총 성공: ${totalSuccess}개<br>현장: ${sitesResult.successCount}개, 건물: ${buildingsResult.successCount}개, 장비: ${equipmentResult.successCount}개`);
        } else {
            let errorMsg = `⚠️ 일부 데이터 저장 실패<br>성공: ${totalSuccess}개, 실패: ${totalError}개<br><br>`;
            errorMsg += '<strong>오류 목록 (최대 5개):</strong><br>';
            allErrors.slice(0, 5).forEach(err => {
                errorMsg += `- ${err.type} 행 ${err.row}: ${err.error}<br>`;
            });
            if (allErrors.length > 5) {
                errorMsg += `... 외 ${allErrors.length - 5}개`;
            }
            showStatus('error', errorMsg);
            
            console.error('저장 실패 항목:', allErrors);
        }
        
    } catch (error) {
        showStatus('error', `❌ 저장 오류: ${error.message}`);
        console.error('통합 데이터 저장 오류:', error);
    } finally {
        btnImport.disabled = false;
        btnImport.innerHTML = '<i class="fas fa-upload"></i> 모두 Firestore에 저장';
    }
}

// 배치 데이터 저장 (헬퍼 함수)
async function importDataBatch(type, data) {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    const totalCount = data.length;
    const batchSize = 50;
    
    for (let i = 0; i < totalCount; i += batchSize) {
        const batch = data.slice(i, Math.min(i + batchSize, totalCount));
        
        const promises = batch.map(async (item) => {
            try {
                if (!item.id) {
                    throw new Error('ID가 없습니다');
                }
                
                const processedItem = processItemData(type, item);
                const result = await window.FirestoreHelper.setDocument(type, item.id, processedItem);
                
                if (result.success) {
                    return { success: true };
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                return { success: false, error: error.message, item };
            }
        });
        
        const results = await Promise.all(promises);
        
        results.forEach((result, idx) => {
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
                errors.push({
                    type: getTypeName(type),
                    row: i + idx + 1,
                    error: result.error,
                    item: result.item
                });
            }
        });
        
        // 진행률 업데이트
        const progress = Math.min(i + batchSize, totalCount);
        updateProgress(progress, totalCount, `${getTypeName(type)} 저장 중`);
    }
    
    return { successCount, errorCount, errors };
}

// 통합 템플릿 다운로드
function downloadAllTemplate() {
    const workbook = XLSX.utils.book_new();
    
    // Sites 시트
    const sitesData = [
        {
            id: 'SITE001',
            site_name: '강남 오피스 빌딩',
            address: '서울특별시 강남구 테헤란로 123',
            contact_name: '김철수',
            contact_phone: '02-1234-5678'
        },
        {
            id: 'SITE002',
            site_name: '판교 테크노밸리',
            address: '경기도 성남시 분당구 판교역로 235',
            contact_name: '이영희',
            contact_phone: '031-9876-5432'
        }
    ];
    const sitesSheet = XLSX.utils.json_to_sheet(sitesData);
    XLSX.utils.book_append_sheet(workbook, sitesSheet, 'Sites');
    
    // Buildings 시트
    const buildingsData = [
        { id: 'BLD001', site_id: 'SITE001', building_name: 'A동', floors: 15 },
        { id: 'BLD002', site_id: 'SITE001', building_name: 'B동', floors: 12 },
        { id: 'BLD003', site_id: 'SITE002', building_name: 'A동', floors: 10 }
    ];
    const buildingsSheet = XLSX.utils.json_to_sheet(buildingsData);
    XLSX.utils.book_append_sheet(workbook, buildingsSheet, 'Buildings');
    
    // Equipment 시트
    const equipmentData = [
        {
            id: 'EQ0001',
            site_id: 'SITE001',
            building_id: 'BLD001',
            equipment_type: 'PACKAGED AIR CONDITIONER UNIT',
            model: 'CARRIER-30XA',
            location: '기계실',
            floor: '5F',
            capacity: '25RT'
        },
        {
            id: 'EQ0002',
            site_id: 'SITE001',
            building_id: 'BLD001',
            equipment_type: 'TURBO CHILLER',
            model: 'TRANE-CVHE',
            location: '기계실',
            floor: 'B1',
            capacity: '500RT'
        }
    ];
    const equipmentSheet = XLSX.utils.json_to_sheet(equipmentData);
    XLSX.utils.book_append_sheet(workbook, equipmentSheet, 'Equipment');
    
    XLSX.writeFile(workbook, '통합_데이터_템플릿.xlsx');
}

// 업로드 리셋 수정
function resetUpload(type) {
    if (type === 'all') {
        currentData.all = { sites: null, buildings: null, equipment: null };
        document.getElementById('fileInfoAll').classList.remove('show');
        document.getElementById('previewAll').classList.remove('show');
        document.getElementById('fileInputAll').value = '';
    } else {
        currentData[type] = null;
        document.getElementById(`fileInfo${capitalize(type)}`).classList.remove('show');
        document.getElementById(`preview${capitalize(type)}`).classList.remove('show');
        document.getElementById(`fileInput${capitalize(type)}`).value = '';
    }
    document.getElementById('status').style.display = 'none';
}
