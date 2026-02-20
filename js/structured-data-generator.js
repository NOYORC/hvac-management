// 체계적인 데이터 생성 스크립트
// SITE001 → BLD001~BLD010 → EQ0001~EQ0999
// SITE002 → BLD011~BLD020 → EQ1000~EQ1999
// ...

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

// 현장 데이터 생성
async function generateSites(count = 10) {
    const sites = [];
    const siteNames = [
        '강남 오피스 빌딩', '판교 테크노밸리', '여의도 금융센터', '송도 국제업무단지', '청라 비즈니스센터',
        '마곡 산업단지', '상암 DMC', '수원 삼성디지털시티', '용인 비즈니스파크', '평택 물류센터'
    ];
    
    for (let i = 1; i <= count; i++) {
        const siteId = `SITE${String(i).padStart(3, '0')}`;
        const siteName = siteNames[i - 1] || `현장 ${i}`;
        
        sites.push({
            id: siteId,
            site_name: siteName,
            address: `주소 ${i}`,
            contact_name: `담당자 ${i}`,
            contact_phone: `010-${String(i).padStart(4, '0')}-${String(i).padStart(4, '0')}`,
            created_at: window.FirestoreTimestamp.now()
        });
    }
    
    return sites;
}

// 건물 데이터 생성
async function generateBuildings(siteCount = 10) {
    const buildings = [];
    const buildingNames = ['A동', 'B동', 'C동', 'D동', 'E동', 'F동', 'G동', 'H동', 'I동', 'J동'];
    
    for (let siteIndex = 1; siteIndex <= siteCount; siteIndex++) {
        const siteId = `SITE${String(siteIndex).padStart(3, '0')}`;
        const startBldNum = (siteIndex - 1) * 10 + 1; // SITE001 → 1, SITE002 → 11, ...
        
        for (let bldOffset = 0; bldOffset < 10; bldOffset++) {
            const bldNum = startBldNum + bldOffset;
            const buildingId = `BLD${String(bldNum).padStart(3, '0')}`;
            const buildingName = buildingNames[bldOffset];
            
            buildings.push({
                id: buildingId,
                site_id: siteId,
                building_name: buildingName,
                floors: Math.floor(Math.random() * 10) + 10, // 10~19층
                created_at: window.FirestoreTimestamp.now()
            });
        }
    }
    
    return buildings;
}

// 장비 데이터 생성
async function generateEquipment(siteCount = 10, equipmentPerSite = 1000) {
    const equipment = [];
    const equipmentTypes = [
        'PACKAGED AIR CONDITIONER UNIT',
        'TURBO CHILLER',
        'SCREW CHILLER',
        'HEAT PUMP',
        'FCU (Fan Coil Unit)',
        'AHU (Air Handling Unit)'
    ];
    
    for (let siteIndex = 1; siteIndex <= siteCount; siteIndex++) {
        const siteId = `SITE${String(siteIndex).padStart(3, '0')}`;
        const startEqNum = (siteIndex - 1) * equipmentPerSite; // SITE001 → 0, SITE002 → 1000, ...
        const startBldNum = (siteIndex - 1) * 10 + 1;
        
        for (let eqOffset = 0; eqOffset < equipmentPerSite; eqOffset++) {
            const eqNum = startEqNum + eqOffset;
            const equipmentId = `EQ${String(eqNum).padStart(4, '0')}`;
            
            // 건물 할당 (10개 건물에 균등 분배)
            const buildingIndex = Math.floor(eqOffset / (equipmentPerSite / 10));
            const buildingId = `BLD${String(startBldNum + buildingIndex).padStart(3, '0')}`;
            
            // 장비 타입 선택
            const equipmentType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
            
            // 층수 (1~19)
            const floor = `${Math.floor(Math.random() * 19) + 1}F`;
            
            // 위치 (실 이름)
            const locations = ['기계실', '전기실', '보일러실', '옥상', '지하기계실'];
            const location = locations[Math.floor(Math.random() * locations.length)];
            
            // 모델명 (제조사-모델시리즈)
            const manufacturers = ['CARRIER', 'TRANE', 'DAIKIN', 'LG', 'SAMSUNG'];
            const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
            const model = `${manufacturer}-${equipmentType.substring(0, 3).toUpperCase()}${String(Math.floor(Math.random() * 9000) + 1000)}`;
            
            equipment.push({
                id: equipmentId,
                site_id: siteId,
                building_id: buildingId,
                equipment_type: equipmentType,
                model: model,
                location: location,
                floor: floor,
                capacity: `${Math.floor(Math.random() * 50) + 10}RT`, // 10~59 RT
                installation_date: window.FirestoreTimestamp.now(),
                created_at: window.FirestoreTimestamp.now()
            });
        }
    }
    
    return equipment;
}

// 모든 데이터 생성 및 저장
async function generateAllData() {
    await waitForFirebase();
    
    const siteCount = parseInt(document.getElementById('siteCount').value) || 10;
    const equipmentPerSite = parseInt(document.getElementById('equipmentPerSite').value) || 1000;
    
    const btnGenerate = document.getElementById('btnGenerate');
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = '<div class="spinner"></div> 생성 중...';
    
    document.getElementById('progressContainer').style.display = 'block';
    
    try {
        // 1. 현장 생성
        showStatus('info', '🏢 현장 데이터 생성 중...');
        const sites = await generateSites(siteCount);
        updateProgress(0, sites.length, '현장 저장 중');
        
        let successCount = 0;
        for (let i = 0; i < sites.length; i++) {
            const site = sites[i];
            const result = await window.FirestoreHelper.setDocument('sites', site.id, site);
            if (result.success) successCount++;
            updateProgress(i + 1, sites.length, '현장 저장 중');
        }
        
        showStatus('success', `✅ 현장 ${successCount}개 생성 완료`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 2. 건물 생성
        showStatus('info', '🏗️ 건물 데이터 생성 중...');
        const buildings = await generateBuildings(siteCount);
        updateProgress(0, buildings.length, '건물 저장 중');
        
        successCount = 0;
        for (let i = 0; i < buildings.length; i++) {
            const building = buildings[i];
            const result = await window.FirestoreHelper.setDocument('buildings', building.id, building);
            if (result.success) successCount++;
            updateProgress(i + 1, buildings.length, '건물 저장 중');
        }
        
        showStatus('success', `✅ 건물 ${successCount}개 생성 완료`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. 장비 생성
        showStatus('info', '⚙️ 장비 데이터 생성 중...');
        const equipment = await generateEquipment(siteCount, equipmentPerSite);
        updateProgress(0, equipment.length, '장비 저장 중');
        
        successCount = 0;
        // 배치 처리 (100개씩)
        const batchSize = 100;
        for (let i = 0; i < equipment.length; i += batchSize) {
            const batch = equipment.slice(i, Math.min(i + batchSize, equipment.length));
            
            const promises = batch.map(eq => 
                window.FirestoreHelper.setDocument('equipment', eq.id, eq)
            );
            
            const results = await Promise.all(promises);
            successCount += results.filter(r => r.success).length;
            
            updateProgress(Math.min(i + batchSize, equipment.length), equipment.length, '장비 저장 중');
        }
        
        showStatus('success', `🎉 모든 데이터 생성 완료!<br>현장: ${sites.length}개, 건물: ${buildings.length}개, 장비: ${successCount}개`);
        
        // 요약 표시
        const summary = document.getElementById('summary');
        summary.innerHTML = `
            <h3>📊 생성된 데이터 요약</h3>
            <ul>
                <li><strong>현장:</strong> ${sites.length}개 (SITE001 ~ SITE${String(siteCount).padStart(3, '0')})</li>
                <li><strong>건물:</strong> ${buildings.length}개 (각 현장당 10개)</li>
                <li><strong>장비:</strong> ${successCount}개 (각 현장당 ${equipmentPerSite}개)</li>
            </ul>
            <h4>📋 현장별 장비 번호 범위</h4>
            <ul>
                ${sites.map((site, idx) => {
                    const startEq = idx * equipmentPerSite;
                    const endEq = startEq + equipmentPerSite - 1;
                    return `<li><strong>${site.id} (${site.site_name}):</strong> EQ${String(startEq).padStart(4, '0')} ~ EQ${String(endEq).padStart(4, '0')}</li>`;
                }).join('')}
            </ul>
        `;
        summary.style.display = 'block';
        
    } catch (error) {
        showStatus('error', `❌ 오류: ${error.message}`);
        console.error('데이터 생성 오류:', error);
    } finally {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = '<i class="fas fa-magic"></i> 데이터 생성 시작';
    }
}

// 데이터 삭제
async function deleteAllData() {
    if (!confirm('⚠️ 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) {
        return;
    }
    
    await waitForFirebase();
    
    const btnDelete = document.getElementById('btnDelete');
    btnDelete.disabled = true;
    btnDelete.innerHTML = '<div class="spinner"></div> 삭제 중...';
    
    try {
        showStatus('info', '🗑️ 데이터 삭제 중...');
        
        const collections = ['equipment', 'buildings', 'sites'];
        
        for (const collectionName of collections) {
            const result = await window.FirestoreHelper.getAllDocuments(collectionName);
            if (result.success && result.data) {
                for (const doc of result.data) {
                    await window.FirestoreHelper.deleteDocument(collectionName, doc.id);
                }
            }
        }
        
        showStatus('success', '✅ 모든 데이터가 삭제되었습니다.');
        document.getElementById('summary').style.display = 'none';
        
    } catch (error) {
        showStatus('error', `❌ 오류: ${error.message}`);
    } finally {
        btnDelete.disabled = false;
        btnDelete.innerHTML = '<i class="fas fa-trash"></i> 모든 데이터 삭제';
    }
}
