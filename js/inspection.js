// 전역 변수
let currentStep = 1;
let selectedSite = null;
let selectedBuilding = null;
let selectedEquipment = null;
let allEquipment = [];
let allSites = [];      // 모든 현장 데이터 저장
let allBuildings = [];  // 모든 건물 데이터 저장

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
        console.log(`🔍 장비 직접 로드 시작: ${equipmentId}`);
        
        // FirestoreHelper를 직접 사용 (CachedFirestoreHelper 대신)
        const result = await window.FirestoreHelper.getDocument('equipment', equipmentId);
        
        if (result.success && result.data) {
            selectedEquipment = result.data;
            selectedEquipment.id = equipmentId; // ID 추가 (문서 ID가 data에 없을 수 있음)
            console.log('✅ 장비 데이터:', selectedEquipment);
            
            // 장비가 속한 현장과 건물 정보도 로드
            // site_id/building_id가 있으면 사용, 없으면 site_name/building_name으로 조회
            if (selectedEquipment.site_id) {
                const siteResult = await window.FirestoreHelper.getDocument('sites', selectedEquipment.site_id);
                if (siteResult.success) selectedSite = siteResult.data;
            } else if (selectedEquipment.site_name) {
                // site_name으로 현장 찾기
                const sitesResult = await window.FirestoreHelper.getAllDocuments('sites');
                if (sitesResult.success && sitesResult.data) {
                    selectedSite = sitesResult.data.find(s => s.site_name === selectedEquipment.site_name);
                }
            }
            
            if (selectedEquipment.building_id) {
                const buildingResult = await window.FirestoreHelper.getDocument('buildings', selectedEquipment.building_id);
                if (buildingResult.success) selectedBuilding = buildingResult.data;
            } else if (selectedEquipment.building_name) {
                // building_name으로 건물 찾기
                const buildingsResult = await window.FirestoreHelper.getAllDocuments('buildings');
                if (buildingsResult.success && buildingsResult.data) {
                    selectedBuilding = buildingsResult.data.find(b => b.building_name === selectedEquipment.building_name);
                }
            }
            
            console.log('✅ 현장:', selectedSite);
            console.log('✅ 건물:', selectedBuilding);
            
            console.log('✅ 현장:', selectedSite);
            console.log('✅ 건물:', selectedBuilding);
            
            // Step 4로 바로 이동 (점검 입력 화면)
            const siteName = selectedSite?.site_name || selectedEquipment.site_name || '알 수 없음';
            const buildingName = selectedBuilding?.building_name || selectedEquipment.building_name || '알 수 없음';
            
            document.getElementById('selectedSiteName').textContent = siteName;
            document.getElementById('selectedSiteName2').textContent = siteName;
            document.getElementById('selectedBuildingName').textContent = buildingName;
            document.getElementById('selectedEquipmentName').textContent = `${selectedEquipment.equipment_type} (${selectedEquipment.id})`;
            
            // 장비 상세 정보 표시
            const detailDiv = document.getElementById('equipmentDetail');
            const floorText = selectedEquipment.floor ? `${selectedEquipment.floor}층` : '층수 미등록';
            detailDiv.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <i class="fas fa-wrench"></i>
                        <div>
                            <div class="detail-label">장비 종류</div>
                            <div class="detail-value">${selectedEquipment.equipment_type || '-'}</div>
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
                            <div class="detail-value">${floorText} - ${selectedEquipment.location || '-'}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-box"></i>
                        <div>
                            <div class="detail-label">모델</div>
                            <div class="detail-value">${selectedEquipment.model || '-'}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tachometer-alt"></i>
                        <div>
                            <div class="detail-label">용량</div>
                            <div class="detail-value">${selectedEquipment.capacity || '-'}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <div class="detail-label">설치일</div>
                            <div class="detail-value">${selectedEquipment.install_date || '-'}</div>
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

// 로그인한 사용자 정보 자동 설정
async function loadInspectors() {
    console.log('🔍 로그인한 사용자 정보 로드 시작...');
    try {
        // AuthManager에서 현재 로그인한 사용자 가져오기
        await waitForAuth();
        const currentUser = window.AuthManager?.getCurrentUser();
        
        if (!currentUser) {
            console.error('❌ 로그인되지 않은 사용자입니다.');
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('✅ 로그인 사용자:', currentUser);
        
        // 드롭다운을 읽기 전용 입력 필드로 변경
        const inspectorSelect = document.getElementById('inspectorName');
        const formGroup = inspectorSelect.parentElement;
        
        // 역할 한글 표시
        const roleText = currentUser.role === 'admin' ? '시스템관리자' : 
                        currentUser.role === 'manager' ? '관리자' : '점검자';
        
        // 새로운 HTML 구조로 변경 (읽기 전용 + 숨겨진 필드)
        formGroup.innerHTML = `
            <label><i class="fas fa-user"></i> 점검자명</label>
            <div class="inspector-info">
                <input type="text" value="${currentUser.name}" readonly 
                       style="background-color: #f0f0f0; cursor: not-allowed;">
                <input type="hidden" id="inspectorName" name="inspectorName" value="${currentUser.name}">
                <input type="hidden" id="inspectorEmail" name="inspectorEmail" value="${currentUser.email}">
                <input type="hidden" id="inspectorRole" name="inspectorRole" value="${currentUser.role}">
            </div>
        `;
        
        console.log('✅ 점검자 정보 자동 설정 완료:', {
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role
        });
        
    } catch (error) {
        console.error('❌ 사용자 정보 로드 오류:', error);
        alert('사용자 정보를 불러오는데 실패했습니다. 다시 로그인해주세요.');
        window.location.href = 'login.html';
    }
}

// AuthManager 초기화 대기
function waitForAuth() {
    return new Promise((resolve) => {
        if (window.AuthManager) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.AuthManager) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// Step 1: 현장 목록 로드
async function loadSites() {
    try {
        const data = await window.CachedFirestoreHelper.getAllDocuments('sites');
        allSites = data.data; // 전역 변수에 저장
        
        const siteList = document.getElementById('siteList');
        siteList.innerHTML = '';
        
        data.data.forEach(site => {
            const card = document.createElement('div');
            card.className = 'selection-card';
            card.onclick = () => selectSite(site);
            card.innerHTML = `
                <div class="icon"><i class="fas fa-building"></i></div>
                ${site.site_group ? `<div class="site-group">${site.site_group}</div>` : ''}
                <h3 class="site-name">${site.site_name}</h3>
                <p class="site-address"><i class="fas fa-map-marker-alt"></i> ${site.address}</p>
                <p><i class="fas fa-user"></i> ${site.contact_name || '담당자 미등록'}</p>
                <p><i class="fas fa-phone"></i> ${site.contact_phone || '연락처 미등록'}</p>
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
        const data = await window.CachedFirestoreHelper.getAllDocuments('buildings');
        allBuildings = data.data; // 전역 변수에 저장
        
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
                    <p><i class="fas fa-layer-group"></i> ${building.floors ? building.floors + '층' : '층수 미등록'}</p>
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
        const data = await window.CachedFirestoreHelper.getAllDocuments('equipment');
        
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
        floorFilter.innerHTML += `<option value="${floor}">${floor}층</option>`;
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
    
    console.log('🔍 필터링 조건:', { floor: floorFilter, type: typeFilter });
    console.log('📊 전체 장비 층 데이터:', allEquipment.map(e => ({ id: e.id, floor: e.floor, type: typeof e.floor })));
    
    let filtered = allEquipment;
    
    if (floorFilter) {
        filtered = filtered.filter(e => String(e.floor) === String(floorFilter));
        console.log(`✅ 층 필터 적용 (${floorFilter}): ${filtered.length}개 장비 발견`);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(e => e.equipment_type === typeFilter);
        console.log(`✅ 종류 필터 적용 (${typeFilter}): ${filtered.length}개 장비 발견`);
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
            
            const fullLocation = getFullLocation(eq);
            
            card.innerHTML = `
                <div class="eq-header">
                    <div class="eq-icon"><i class="fas ${getEquipmentIcon(eq.equipment_type)}"></i></div>
                    <div class="eq-id">${eq.equipment_id || eq.id}</div>
                </div>
                <h3>${eq.equipment_name || eq.equipment_type}</h3>
                <div class="eq-info">
                    <div><i class="fas fa-map-marker-alt"></i> ${fullLocation}</div>
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
    
    const fullLocation = getFullLocation(equipment);
    
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
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <div class="detail-label">위치</div>
                    <div class="detail-value">${fullLocation}</div>
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
    const normalNotes = document.getElementById('normalNotes');
    const repairFields = document.getElementById('repairFields');
    
    if (inspectionType === '고장정비') {
        // 고장정비: 특이사항 숨기고 정비내용 표시
        normalNotes.style.display = 'none';
        repairFields.style.display = 'block';
    } else {
        // 일반점검: 특이사항 표시하고 정비내용 숨김
        normalNotes.style.display = 'block';
        repairFields.style.display = 'none';
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
    
    // 로그인한 사용자 정보 가져오기
    const currentUser = window.AuthManager?.getCurrentUser();
    
    // 점검 유형에 따라 notes 필드 선택
    let notes = '';
    if (inspectionType === '고장정비') {
        notes = document.getElementById('notesRepair').value || '';
    } else {
        notes = document.getElementById('notesNormal').value || '';
    }
    
    // 점검 데이터 구성
    const inspectionData = {
        equipment_id: selectedEquipment.id,
        site_name: selectedSite?.site_name || selectedEquipment.site_name || '알 수 없음',
        building_name: selectedBuilding?.building_name || selectedEquipment.building_name || '알 수 없음',
        equipment_type: selectedEquipment.equipment_type || '알 수 없음',
        location: selectedEquipment.location || '',
        floor: selectedEquipment.floor || '',
        inspection_type: inspectionType,
        inspector_name: inspectorName,
        inspector_email: currentUser?.email || '',
        inspector_role: currentUser?.role || '',
        inspection_date: window.FirestoreTimestamp.now(),
        status: status,
        indoor_temperature: document.getElementById('indoorTemperature').value || '',
        set_temperature: document.getElementById('setTemperature').value || '',
        high_pressure: document.getElementById('highPressure').value || '',
        low_pressure: document.getElementById('lowPressure').value || '',
        current_r: document.getElementById('currentR').value || '',
        current_s: document.getElementById('currentS').value || '',
        current_t: document.getElementById('currentT').value || '',
        notes: notes,
        photo_url: '' // 사진 기능은 추후 구현
    };
    
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

// ===== QR 스캐너 기능 =====
let html5QrCode = null;
let isScannerActive = false;

// QR 스캐너 토글
async function toggleQRScanner() {
    const scannerArea = document.getElementById('qrScannerArea');
    
    if (isScannerActive) {
        // 스캐너 닫기
        await stopScanner();
        scannerArea.style.display = 'none';
        isScannerActive = false;
    } else {
        // 스캐너 열기
        scannerArea.style.display = 'block';
        await startScanner();
        isScannerActive = true;
    }
}

// QR 스캐너 시작
async function startScanner() {
    try {
        // Html5Qrcode 인스턴스가 없으면 생성
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("cameraSection");
        }
        
        // 카메라 시작
        await html5QrCode.start(
            { facingMode: "environment" }, // 후면 카메라 사용
            {
                fps: 10,    // 초당 스캔 프레임
                qrbox: { width: 250, height: 250 }  // 스캔 영역
            },
            onScanSuccess,
            onScanFailure
        );
        
        console.log('✅ QR 스캐너 시작');
    } catch (err) {
        console.error('❌ QR 스캐너 시작 오류:', err);
        alert('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
    }
}

// QR 스캐너 중지
async function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        try {
            await html5QrCode.stop();
            console.log('✅ QR 스캐너 중지');
        } catch (err) {
            console.error('❌ QR 스캐너 중지 오류:', err);
        }
    }
}

// QR 스캔 성공 핸들러
async function onScanSuccess(decodedText, decodedResult) {
    console.log('✅ QR 스캔 성공:', decodedText);
    
    // 스캐너 중지
    await stopScanner();
    document.getElementById('qrScannerArea').style.display = 'none';
    isScannerActive = false;
    
    // 장비 ID 추출 (형식: EQ001, EQ002 등)
    let equipmentId = decodedText;
    
    // URL 형식인 경우 파라미터에서 추출
    if (decodedText.includes('equipmentId=')) {
        const urlParams = new URLSearchParams(decodedText.split('?')[1]);
        equipmentId = urlParams.get('equipmentId');
    }
    
    // 스캔된 장비 정보 표시
    await displayScannedEquipment(equipmentId);
}

// QR 스캔 실패 핸들러
function onScanFailure(error) {
    // 스캔 실패는 계속 발생하므로 로그 출력 안 함
}

// 스캔된 장비 정보 표시
async function displayScannedEquipment(equipmentId) {
    try {
        // 장비 정보 조회
        const result = await window.CachedFirestoreHelper.getDocument('equipment', equipmentId);
        
        if (!result.success) {
            alert('장비 정보를 찾을 수 없습니다.');
            return;
        }
        
        const equipment = result.data;
        
        // 현장과 건물 정보도 조회
        const siteResult = await window.FirestoreHelper.getDocument('sites', equipment.site_id);
        const buildingResult = await window.FirestoreHelper.getDocument('buildings', equipment.building_id);
        
        // 스캔 정보 표시
        const equipmentSelection = document.getElementById('equipmentSelection');
        
        // 기존 스캔 정보 제거
        const existingInfo = equipmentSelection.querySelector('.scanned-equipment-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        // 새 스캔 정보 추가 (scanner-info 위에 배치)
        const qrScanSection = equipmentSelection.querySelector('.qr-scan-section');
        const scannedInfo = document.createElement('div');
        scannedInfo.className = 'scanned-equipment-info';
        scannedInfo.innerHTML = `
            <i class="fas fa-qrcode"></i>
            <div class="scanned-equipment-details">
                <h4>스캔된 장비: ${equipment.equipment_type} - ${equipment.model}</h4>
                <p>${siteResult.data.site_name} > ${buildingResult.data.building_name} > ${equipment.floor}층</p>
            </div>
        `;
        
        // scanner-info 바로 위에 삽입
        qrScanSection.insertAdjacentElement('afterend', scannedInfo);
        
        // 장비 선택 처리
        selectedSite = siteResult.data;
        selectedBuilding = buildingResult.data;
        selectedEquipment = equipment;
        
        // Step 4로 이동
        setTimeout(() => {
            changeStep(4);
        }, 1500);
        
    } catch (error) {
        console.error('❌ 스캔된 장비 정보 표시 오류:', error);
        alert('장비 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 페이지 언로드 시 스캐너 정리
window.addEventListener('beforeunload', () => {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop();
    }
});

// 장비 전체 위치 정보 생성 헬퍼 함수
function getFullLocation(equipment) {
    // equipment에 site_id, building_id가 있을 때 조합
    const site = allSites.find(s => s.id === equipment.site_id);
    const building = allBuildings.find(b => b.id === equipment.building_id);
    
    const parts = [];
    if (site) parts.push(site.site_name);
    if (building) parts.push(building.building_name);
    if (equipment.floor) parts.push(equipment.floor + '층');
    if (equipment.location) parts.push(equipment.location);
    
    return parts.join(' ') || equipment.location || '위치 정보 없음';
}

