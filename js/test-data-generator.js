// 테스트 데이터 생성 스크립트

// Firebase 초기화 대기
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.db && window.FirestoreHelper) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.db && window.FirestoreHelper) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// 상태 표시 함수
function showStatus(elementId, type, message) {
    const statusEl = document.getElementById(elementId);
    statusEl.className = `status ${type}`;
    statusEl.innerHTML = message;
    statusEl.style.display = 'block';
}

// 미리보기 표시
function showPreview(elementId, data) {
    const previewEl = document.getElementById(elementId);
    previewEl.textContent = JSON.stringify(data, null, 2);
    previewEl.style.display = 'block';
}

// 버튼 비활성화/활성화
function setButtonState(buttonId, disabled, text = null) {
    const btn = document.getElementById(buttonId);
    btn.disabled = disabled;
    if (text) {
        btn.innerHTML = text;
    }
}

// 현장 데이터 생성
async function createSites() {
    await waitForFirebase();
    const buttonId = 'btnSites';
    const statusId = 'statusSites';
    const previewId = 'previewSites';
    
    try {
        setButtonState(buttonId, true, '<div class="spinner"></div> 생성 중...');
        
        const sites = [
            {
                id: 'SITE001',
                site_name: '강남 오피스 빌딩',
                address: '서울특별시 강남구 테헤란로 123',
                contact_name: '김철수',
                contact_phone: '02-1234-5678',
                created_at: new Date().toISOString()
            },
            {
                id: 'SITE002',
                site_name: '판교 테크노밸리',
                address: '경기도 성남시 분당구 판교역로 235',
                contact_name: '이영희',
                contact_phone: '031-9876-5432',
                created_at: new Date().toISOString()
            }
        ];
        
        let successCount = 0;
        for (const site of sites) {
            const result = await window.FirestoreHelper.setDocument('sites', site.id, site);
            if (result.success) successCount++;
        }
        
        showStatus(statusId, 'success', `✅ ${successCount}개의 현장이 성공적으로 생성되었습니다.`);
        showPreview(previewId, sites);
        
    } catch (error) {
        showStatus(statusId, 'error', `❌ 오류: ${error.message}`);
    } finally {
        setButtonState(buttonId, false, '<i class="fas fa-plus"></i> 현장 데이터 생성');
    }
}

// 건물 데이터 생성
async function createBuildings() {
    await waitForFirebase();
    const buttonId = 'btnBuildings';
    const statusId = 'statusBuildings';
    const previewId = 'previewBuildings';
    
    try {
        setButtonState(buttonId, true, '<div class="spinner"></div> 생성 중...');
        
        const buildings = [
            // 강남 오피스 빌딩
            { id: 'BLD001', site_id: 'SITE001', building_name: 'A동', floors: 15, created_at: new Date().toISOString() },
            { id: 'BLD002', site_id: 'SITE001', building_name: 'B동', floors: 12, created_at: new Date().toISOString() },
            { id: 'BLD003', site_id: 'SITE001', building_name: 'C동', floors: 10, created_at: new Date().toISOString() },
            
            // 판교 테크노밸리
            { id: 'BLD004', site_id: 'SITE002', building_name: '본관', floors: 20, created_at: new Date().toISOString() },
            { id: 'BLD005', site_id: 'SITE002', building_name: '별관', floors: 8, created_at: new Date().toISOString() },
            { id: 'BLD006', site_id: 'SITE002', building_name: '연구동', floors: 5, created_at: new Date().toISOString() }
        ];
        
        let successCount = 0;
        for (const building of buildings) {
            const result = await window.FirestoreHelper.setDocument('buildings', building.id, building);
            if (result.success) successCount++;
        }
        
        showStatus(statusId, 'success', `✅ ${successCount}개의 건물이 성공적으로 생성되었습니다.`);
        showPreview(previewId, buildings);
        
    } catch (error) {
        showStatus(statusId, 'error', `❌ 오류: ${error.message}`);
    } finally {
        setButtonState(buttonId, false, '<i class="fas fa-plus"></i> 건물 데이터 생성');
    }
}

// 장비 데이터 생성
async function createEquipment() {
    await waitForFirebase();
    const buttonId = 'btnEquipment';
    const statusId = 'statusEquipment';
    const previewId = 'previewEquipment';
    
    try {
        setButtonState(buttonId, true, '<div class="spinner"></div> 생성 중...');
        
        const equipment = [
            // SITE001 장비
            { id: 'EQ0001', site_id: 'SITE001', building_id: 'BLD001', equipment_type: '냉동기', model: 'CHR-500', location: '기계실', floor: '지하 1층', installation_date: '2020-01-15', created_at: new Date().toISOString() },
            { id: 'EQ0002', site_id: 'SITE001', building_id: 'BLD001', equipment_type: '공조기', model: 'AHU-300', location: '기계실', floor: '지하 1층', installation_date: '2020-02-20', created_at: new Date().toISOString() },
            { id: 'EQ0003', site_id: 'SITE001', building_id: 'BLD002', equipment_type: '냉각탑', model: 'CT-400', location: '옥상', floor: '옥상', installation_date: '2020-03-10', created_at: new Date().toISOString() },
            { id: 'EQ0004', site_id: 'SITE001', building_id: 'BLD002', equipment_type: 'FCU', model: 'FCU-200', location: '사무실', floor: '10층', installation_date: '2020-04-05', created_at: new Date().toISOString() },
            { id: 'EQ0005', site_id: 'SITE001', building_id: 'BLD003', equipment_type: '보일러', model: 'BLR-600', location: '기계실', floor: '지하 2층', installation_date: '2020-05-15', created_at: new Date().toISOString() },
            
            // SITE002 장비
            { id: 'EQ0006', site_id: 'SITE002', building_id: 'BLD004', equipment_type: '냉동기', model: 'CHR-700', location: '기계실', floor: '지하 1층', installation_date: '2021-01-20', created_at: new Date().toISOString() },
            { id: 'EQ0007', site_id: 'SITE002', building_id: 'BLD004', equipment_type: '공조기', model: 'AHU-500', location: '기계실', floor: '지하 1층', installation_date: '2021-02-15', created_at: new Date().toISOString() },
            { id: 'EQ0008', site_id: 'SITE002', building_id: 'BLD005', equipment_type: '냉각탑', model: 'CT-600', location: '옥상', floor: '옥상', installation_date: '2021-03-10', created_at: new Date().toISOString() },
            { id: 'EQ0009', site_id: 'SITE002', building_id: 'BLD005', equipment_type: 'FCU', model: 'FCU-250', location: '회의실', floor: '5층', installation_date: '2021-04-05', created_at: new Date().toISOString() },
            { id: 'EQ0010', site_id: 'SITE002', building_id: 'BLD006', equipment_type: '환기팬', model: 'FAN-300', location: '연구실', floor: '3층', installation_date: '2021-05-20', created_at: new Date().toISOString() }
        ];
        
        let successCount = 0;
        for (const eq of equipment) {
            const result = await window.FirestoreHelper.setDocument('equipment', eq.id, eq);
            if (result.success) successCount++;
        }
        
        showStatus(statusId, 'success', `✅ ${successCount}개의 장비가 성공적으로 생성되었습니다.`);
        showPreview(previewId, equipment);
        
    } catch (error) {
        showStatus(statusId, 'error', `❌ 오류: ${error.message}`);
    } finally {
        setButtonState(buttonId, false, '<i class="fas fa-plus"></i> 장비 데이터 생성');
    }
}

// 점검자 데이터 생성
async function createInspectors() {
    await waitForFirebase();
    const buttonId = 'btnInspectors';
    const statusId = 'statusInspectors';
    const previewId = 'previewInspectors';
    
    try {
        setButtonState(buttonId, true, '<div class="spinner"></div> 생성 중...');
        
        const inspectors = [
            { id: 'INS001', name: '김민준', phone: '010-1234-5678', email: 'minjun.kim@hvac.com', position: '수석 점검사', created_at: new Date().toISOString() },
            { id: 'INS002', name: '박서연', phone: '010-2345-6789', email: 'seoyeon.park@hvac.com', position: '점검사', created_at: new Date().toISOString() },
            { id: 'INS003', name: '이도윤', phone: '010-3456-7890', email: 'doyun.lee@hvac.com', position: '점검사', created_at: new Date().toISOString() }
        ];
        
        let successCount = 0;
        for (const inspector of inspectors) {
            const result = await window.FirestoreHelper.setDocument('inspectors', inspector.id, inspector);
            if (result.success) successCount++;
        }
        
        showStatus(statusId, 'success', `✅ ${successCount}명의 점검자가 성공적으로 생성되었습니다.`);
        showPreview(previewId, inspectors);
        
    } catch (error) {
        showStatus(statusId, 'error', `❌ 오류: ${error.message}`);
    } finally {
        setButtonState(buttonId, false, '<i class="fas fa-plus"></i> 점검자 데이터 생성');
    }
}

// 점검 기록 생성
async function createInspections() {
    await waitForFirebase();
    const buttonId = 'btnInspections';
    const statusId = 'statusInspections';
    const previewId = 'previewInspections';
    
    try {
        setButtonState(buttonId, true, '<div class="spinner"></div> 생성 중...');
        
        const equipmentIds = ['EQ0001', 'EQ0002', 'EQ0003', 'EQ0004', 'EQ0005', 'EQ0006', 'EQ0007', 'EQ0008', 'EQ0009', 'EQ0010'];
        const inspectorIds = ['INS001', 'INS002', 'INS003'];
        const inspectorNames = ['김민준', '박서연', '이도윤'];
        const statuses = ['정상', '정상', '정상', '주의', '경고'];
        
        const inspections = [];
        
        // 최근 7일: 15개, 8-30일: 5개 (총 20개)
        for (let i = 0; i < 20; i++) {
            // 처음 15개는 최근 7일, 나머지 5개는 8-30일
            const daysAgo = i < 15 ? Math.floor(Math.random() * 7) : (7 + Math.floor(Math.random() * 23));
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            date.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0);
            
            const equipmentId = equipmentIds[Math.floor(Math.random() * equipmentIds.length)];
            const inspectorIdx = Math.floor(Math.random() * inspectorIds.length);
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            inspections.push({
                equipment_id: equipmentId,
                inspector_id: inspectorIds[inspectorIdx],
                inspector_name: inspectorNames[inspectorIdx],
                inspection_date: window.firebase.firestore.Timestamp.fromDate(date), // Timestamp로 저장
                inspection_type: '정기점검',
                status: status,
                indoor_temperature: (22 + Math.random() * 4).toFixed(1),
                set_temperature: '24',
                high_pressure: (15 + Math.random() * 3).toFixed(1),
                low_pressure: (5 + Math.random() * 2).toFixed(1),
                current_r: (8 + Math.random() * 2).toFixed(1),
                current_s: (8 + Math.random() * 2).toFixed(1),
                current_t: (8 + Math.random() * 2).toFixed(1),
                notes: status === '정상' ? '정상 작동 중' : '점검 필요',
                created_at: new Date().toISOString()
            });
        }
        
        let successCount = 0;
        for (const inspection of inspections) {
            const result = await window.FirestoreHelper.addDocument('inspections', inspection);
            if (result.success) successCount++;
        }
        
        showStatus(statusId, 'success', `✅ ${successCount}개의 점검 기록이 성공적으로 생성되었습니다.`);
        showPreview(previewId, inspections.slice(0, 3)); // 처음 3개만 미리보기
        
    } catch (error) {
        showStatus(statusId, 'error', `❌ 오류: ${error.message}`);
    } finally {
        setButtonState(buttonId, false, '<i class="fas fa-plus"></i> 점검 기록 생성');
    }
}

// 모든 테스트 데이터 생성
async function createAllData() {
    const buttonId = 'btnAll';
    const statusId = 'statusAll';
    
    try {
        setButtonState(buttonId, true, '<div class="spinner"></div> 모든 데이터 생성 중...');
        showStatus(statusId, 'info', '⏳ 테스트 데이터를 생성하고 있습니다. 잠시만 기다려주세요...');
        
        await createSites();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await createBuildings();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await createEquipment();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await createInspectors();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await createInspections();
        
        showStatus(statusId, 'success', '✅ 모든 테스트 데이터가 성공적으로 생성되었습니다! 이제 다른 페이지에서 데이터를 확인할 수 있습니다.');
        
    } catch (error) {
        showStatus(statusId, 'error', `❌ 오류: ${error.message}`);
    } finally {
        setButtonState(buttonId, false, '<i class="fas fa-rocket"></i> 모든 테스트 데이터 생성');
    }
}

// 페이지 로드 시 Firebase 대기
document.addEventListener('DOMContentLoaded', async function() {
    await waitForFirebase();
    console.log('✅ Firebase 초기화 완료 - 테스트 데이터 생성 준비됨');
});
