// 전역 변수
let currentStep = 1;
let selectedSite = null;
let selectedBuilding = null;
let selectedEquipment = null;
let allEquipment = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    await waitForFirebase();
    
    // URL 파라미터에서 equipmentId 확인
    const urlParams = new URLSearchParams(window.location.search);
    const equipmentId = urlParams.get('equipmentId');
    
    if (equipmentId) {
        // QR 스캔으로 접근한 경우 - 장비 정보 직접 로드
        await loadEquipmentDirectly(equipmentId);
    } else {
        // 일반 접근 - 현장 선택부터 시작
        await loadSites();
    }
    
    await loadInspectors();
    
    // 폼 제출 이벤트
    document.getElementById('inspectionFormData').addEventListener('submit', submitInspection);
});

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

// QR 스캔으로 장비 직접 로드
async function loadEquipmentDirectly(equipmentId) {
    try {
        const result = await window.FirestoreHelper.getDocument('equipment', equipmentId);
        
        if (result.success && result.data) {
            selectedEquipment = result.data;
            
            // 장비가 속한 현장과 건물 정보도 로드
            const siteResult = await window.FirestoreHelper.getDocument('sites', selectedEquipment.site_id);
            const buildingResult = await window.FirestoreHelper.getDocument('buildings', selectedEquipment.building_id);
            
            if (siteResult.success) selectedSite = siteResult.data;
            if (buildingResult.success) selectedBuilding = buildingResult.data;
            
            // Step 4로 바로 이동 (점검 입력 화면)
            document.getElementById('selectedSiteName').textContent = selectedSite?.site_name || '알 수 없음';
            document.getElementById('selectedSiteName2').textContent = selectedSite?.site_name || '알 수 없음';
            document.getElementById('selectedBuildingName').textContent = selectedBuilding?.building_name || '알 수 없음';
            document.getElementById('selectedEquipmentName').textContent = `${selectedEquipment.equipment_type} (${selectedEquipment.id})`;
            
            // 장비 상세 정보 표시
            const detailDiv = document.getElementById('equipmentDetail');
            detailDiv.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <i class="fas fa-wrench"></i>
                        <div>
                            <div class="detail-label">장비 종류</div>
                            <div class="detail-value">${selectedEquipment.equipment_type}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tag"></i>
                        <div>
                            <div class="detail-label">장비 ID</div>
                            <div class="detail-value">${selectedEquipment.id}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-layer-group"></i>
                        <div>
                            <div class="detail-label">위치</div>
                            <div class="detail-value">${selectedEquipment.floor} - ${selectedEquipment.location}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-box"></i>
                        <div>
                            <div class="detail-label">모델</div>
                            <div class="detail-value">${selectedEquipment.model}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tachometer-alt"></i>
                        <div>
                            <div class="detail-label">용량</div>
                            <div class="detail-value">${selectedEquipment.capacity}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <div class="detail-label">설치일</div>
                            <div class="detail-value">${selectedEquipment.install_date}</div>
                        </div>
                    </div>
                </div>
            `;
            
            changeStep(4);
        } else {
            alert('장비를 찾을 수 없습니다. 현장 선택부터 시작합니다.');
            await loadSites();
        }
    } catch (error) {
        console.error('장비 직접 로드 오류:', error);
        alert('장비 정보를 불러오는데 실패했습니다. 현장 선택부터 시작합니다.');
        await loadSites();
    }
}

// 점검자 목록 로드
async function loadInspectors() {
    console.log('🔍 점검자 목록 로드 시작...');
    try {
        const data = await window.FirestoreHelper.getAllDocuments('inspectors');
        console.log('📊 점검자 데이터 응답:', data);
        
        const inspectorSelect = document.getElementById('inspectorName');
        
        if (data.success && data.data && data.data.length > 0) {
            console.log(`✅ 점검자 ${data.data.length}명 로드 완료`);
            data.data.forEach((inspector, index) => {
                console.log(`  ${index + 1}. ${inspector.inspector_name || inspector.name || JSON.stringify(inspector)}`);
                const option = document.createElement('option');
                option.value = inspector.inspector_name || inspector.name;
                option.textContent = inspector.inspector_name || inspector.name;
                inspectorSelect.appendChild(option);
            });
            console.log('✅ 점검자명 드롭다운 생성 완료');
        } else {
            console.warn('⚠️ 점검자 데이터가 없습니다:', data);
            console.warn('Firebase 컬렉션 "inspectors"를 확인하세요.');
        }
    } catch (error) {
        console.error('❌ 점검자 목록 로드 오류:', error);
        // 오류 시 수동 입력으로 폴백
        const inspectorSelect = document.getElementById('inspectorName');
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'inspectorName';
        input.required = true;
        input.placeholder = '이름을 입력하세요';
        inspectorSelect.parentNode.replaceChild(input, inspectorSelect);
        console.log('⚠️ 수동 입력 모드로 전환됨');
    }
}

// Step 1: 현장 목록 로드
async function loadSites() {
    try {
        const data = await window.FirestoreHelper.getAllDocuments('sites');
        
        const siteList = document.getElementById('siteList');
        siteList.innerHTML = '';
        
        data.data.forEach(site => {
            const card = document.createElement('div');
            card.className = 'selection-card';
            card.onclick = () => selectSite(site);
            card.innerHTML = `
                <div class="icon"><i class="fas fa-building"></i></div>
                <h3>${site.site_name}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${site.address}</p>
                <p><i class="fas fa-user"></i> ${site.manager}</p>
                <p><i class="fas fa-phone"></i> ${site.phone}</p>
            `;
            siteList.appendChild(card);
        });
    } catch (error) {
        console.error('현장 목록 로드 오류:', error);
        alert('현장 목록을 불러오는데 실패했습니다.');
    }
}

// Step 2: 건물 목록 로드
async function selectSite(site) {
    selectedSite = site;
    document.getElementById('selectedSiteName').textContent = site.site_name;
    
    try {
        const data = await window.FirestoreHelper.getAllDocuments('buildings');
        
        // 선택된 현장의 건물만 필터링
        const buildings = data.data.filter(b => b.site_id === site.id);
        
        const buildingList = document.getElementById('buildingList');
        buildingList.innerHTML = '';
        
        if (buildings.length === 0) {
            buildingList.innerHTML = '<p style="text-align:center; color:#666;">해당 현장에 등록된 건물이 없습니다.</p>';
        } else {
            buildings.forEach(building => {
                const card = document.createElement('div');
                card.className = 'selection-card';
                card.onclick = () => selectBuilding(building);
                card.innerHTML = `
                    <div class="icon"><i class="fas fa-building"></i></div>
                    <h3>${building.building_name}</h3>
                    <p><i class="fas fa-layer-group"></i> ${building.floors}층</p>
                    <p><i class="fas fa-ruler-combined"></i> ${building.area}m²</p>
                `;
                buildingList.appendChild(card);
            });
        }
        
        changeStep(2);
    } catch (error) {
        console.error('건물 목록 로드 오류:', error);
        alert('건물 목록을 불러오는데 실패했습니다.');
    }
}

// Step 3: 장비 목록 로드
async function selectBuilding(building) {
    selectedBuilding = building;
    document.getElementById('selectedSiteName2').textContent = selectedSite.site_name;
    document.getElementById('selectedBuildingName').textContent = building.building_name;
    
    try {
        const data = await window.FirestoreHelper.getAllDocuments('equipment');
        
        // 선택된 건물의 장비만 필터링
        allEquipment = data.data.filter(e => e.building_id === building.id);
        
        // 필터 옵션 생성
        populateFilters();
        
        // 장비 목록 표시
        displayEquipment(allEquipment);
        
        changeStep(3);
    } catch (error) {
        console.error('장비 목록 로드 오류:', error);
        alert('장비 목록을 불러오는데 실패했습니다.');
    }
}

// 필터 옵션 채우기
function populateFilters() {
    // 층 필터
    const floors = [...new Set(allEquipment.map(e => e.floor))].sort();
    const floorFilter = document.getElementById('floorFilter');
    floorFilter.innerHTML = '<option value="">전체</option>';
    floors.forEach(floor => {
        floorFilter.innerHTML += `<option value="${floor}">${floor}</option>`;
    });
    
    // 장비 종류 필터
    const types = [...new Set(allEquipment.map(e => e.equipment_type))].sort();
    const typeFilter = document.getElementById('typeFilter');
    typeFilter.innerHTML = '<option value="">전체</option>';
    types.forEach(type => {
        typeFilter.innerHTML += `<option value="${type}">${type}</option>`;
    });
}

// 장비 필터링
function filterEquipment() {
    const floorFilter = document.getElementById('floorFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filtered = allEquipment;
    
    if (floorFilter) {
        filtered = filtered.filter(e => e.floor === floorFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(e => e.equipment_type === typeFilter);
    }
    
    displayEquipment(filtered);
}

// 장비 목록 표시
function displayEquipment(equipment) {
    const equipmentList = document.getElementById('equipmentList');
    equipmentList.innerHTML = '';
    
    if (equipment.length === 0) {
        equipmentList.innerHTML = '<p style="text-align:center; color:#666; grid-column: 1/-1;">조건에 맞는 장비가 없습니다.</p>';
    } else {
        equipment.forEach(eq => {
            const card = document.createElement('div');
            card.className = 'equipment-card';
            card.onclick = () => selectEquipment(eq);
            card.innerHTML = `
                <div class="eq-header">
                    <div class="eq-icon"><i class="fas ${getEquipmentIcon(eq.equipment_type)}"></i></div>
                    <div class="eq-id">${eq.equipment_id || eq.id}</div>
                </div>
                <h3>${eq.equipment_name || eq.equipment_type}</h3>
                <div class="eq-info">
                    <div><i class="fas fa-layer-group"></i> ${eq.floor}층 - ${eq.location}</div>
                    <div><i class="fas fa-box"></i> ${eq.model || '정보 없음'}</div>
                    <div><i class="fas fa-tachometer-alt"></i> ${eq.capacity || '정보 없음'}</div>
                </div>
            `;
            equipmentList.appendChild(card);
        });
    }
}

// Step 4: 장비 선택 및 점검 폼 표시
function selectEquipment(equipment) {
    selectedEquipment = equipment;
    document.getElementById('selectedEquipmentName').textContent = 
        `${equipment.equipment_type} (${equipment.id})`;
    
    // 장비 상세 정보 표시
    const detailDiv = document.getElementById('equipmentDetail');
    detailDiv.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <i class="fas fa-wrench"></i>
                <div>
                    <div class="detail-label">장비 종류</div>
                    <div class="detail-value">${equipment.equipment_type}</div>
                </div>
            </div>
            <div class="detail-item">
                <i class="fas fa-tag"></i>
                <div>
                    <div class="detail-label">장비 ID</div>
                    <div class="detail-value">${equipment.id}</div>
                </div>
            </div>
            <div class="detail-item">
                <i class="fas fa-layer-group"></i>
                <div>
                    <div class="detail-label">위치</div>
                    <div class="detail-value">${equipment.floor} - ${equipment.location}</div>
                </div>
            </div>
            <div class="detail-item">
                <i class="fas fa-box"></i>
                <div>
                    <div class="detail-label">모델</div>
                    <div class="detail-value">${equipment.model}</div>
                </div>
            </div>
            <div class="detail-item">
                <i class="fas fa-tachometer-alt"></i>
                <div>
                    <div class="detail-label">용량</div>
                    <div class="detail-value">${equipment.capacity}</div>
                </div>
            </div>
            <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <div>
                    <div class="detail-label">설치일</div>
                    <div class="detail-value">${equipment.install_date}</div>
                </div>
            </div>
        </div>
    `;
    
    changeStep(4);
}

// 점검 유형에 따라 폼 필드 업데이트
function updateFormFields() {
    const inspectionType = document.querySelector('input[name="inspectionType"]:checked').value;
    const detailedFields = document.getElementById('detailedFields');
    
    if (inspectionType === '세부점검') {
        detailedFields.style.display = 'block';
    } else {
        detailedFields.style.display = 'none';
    }
}

// 점검 데이터 제출
async function submitInspection(e) {
    e.preventDefault();
    
    const inspectionType = document.querySelector('input[name="inspectionType"]:checked').value;
    const inspectorName = document.getElementById('inspectorName').value;
    const status = document.getElementById('status').value;
    
    if (!inspectorName || !status) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }
    
    // 점검 데이터 구성
    const inspectionData = {
        equipment_id: selectedEquipment.id,
        inspection_type: inspectionType,
        inspector_name: inspectorName,
        inspection_date: new Date().toISOString(),
        status: status,
        temperature: document.getElementById('temperature').value || '',
        pressure: document.getElementById('pressure').value || '',
        operation_status: document.getElementById('operationStatus').value,
        leak_check: document.getElementById('leakCheck').value,
        notes: document.getElementById('notes').value || '',
        photo_url: '' // 사진 기능은 추후 구현
    };
    
    // 세부점검인 경우 추가 필드
    if (inspectionType === '세부점검') {
        inspectionData.vibration = document.getElementById('vibration').value || '';
        inspectionData.noise = document.getElementById('noise').value || '';
        inspectionData.clean_status = document.getElementById('cleanStatus').value;
        inspectionData.filter_status = document.getElementById('filterStatus').value;
    }
    
    try {
        const result = await window.FirestoreHelper.addDocument('inspections', inspectionData);
        
        if (result.success) {
            alert('✅ 점검이 성공적으로 완료되었습니다!');
            location.href = 'index.html';
        } else {
            throw new Error(result.error || '저장 실패');
        }
    } catch (error) {
        console.error('점검 데이터 저장 오류:', error);
        alert('점검 데이터 저장에 실패했습니다. 다시 시도해주세요.');
    }
}

// 단계 변경
function changeStep(step) {
    // 이전 단계 비활성화
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.selection-panel').forEach(p => p.classList.remove('active'));
    
    // 새 단계 활성화
    document.getElementById('step' + step).classList.add('active');
    currentStep = step;
    
    // 패널 표시
    switch(step) {
        case 1:
            document.getElementById('siteSelection').classList.add('active');
            break;
        case 2:
            document.getElementById('buildingSelection').classList.add('active');
            break;
        case 3:
            document.getElementById('equipmentSelection').classList.add('active');
            break;
        case 4:
            document.getElementById('inspectionForm').classList.add('active');
            break;
    }
    
    // 스크롤 최상단으로
    window.scrollTo(0, 0);
}
