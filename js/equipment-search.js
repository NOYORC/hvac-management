// ===== 장비 검색 페이지 JavaScript =====

// 전역 변수
let allEquipment = [];
let allSites = [];
let allBuildings = [];
let allInspections = [];
let filteredEquipment = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔍 장비 검색 페이지 초기화 시작');
    
    await waitForFirebase();
    await loadAllData();
    setupEventListeners();
    
    console.log('✅ 장비 검색 페이지 초기화 완료');
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

// 모든 데이터 로드
async function loadAllData() {
    try {
        showLoading(true);
        
        console.log('📊 데이터 로딩 시작...');
        
        // 병렬로 모든 데이터 로드
        const [sitesResult, buildingsResult, equipmentResult, inspectionsResult] = await Promise.all([
            window.CachedFirestoreHelper.getAllDocuments('sites'),
            window.CachedFirestoreHelper.getAllDocuments('buildings'),
            window.CachedFirestoreHelper.getAllDocuments('equipment'),
            window.CachedFirestoreHelper.getAllDocuments('inspections')
        ]);
        
        if (!sitesResult.success || !buildingsResult.success || !equipmentResult.success) {
            throw new Error('데이터 로드 실패');
        }
        
        allSites = sitesResult.data;
        allBuildings = buildingsResult.data;
        allEquipment = equipmentResult.data;
        allInspections = inspectionsResult.success ? inspectionsResult.data : [];
        
        console.log(`✅ 현장 ${allSites.length}개, 건물 ${allBuildings.length}개, 장비 ${allEquipment.length}개 로드 완료`);
        console.log(`✅ 점검 기록 ${allInspections.length}개 로드 완료`);
        
        // 각 장비에 점검 수 계산
        allEquipment.forEach(equipment => {
            const inspectionCount = allInspections.filter(
                inspection => inspection.equipment_id === equipment.id
            ).length;
            equipment.inspection_count = inspectionCount;
            
            // 최근 점검 상태 가져오기
            const recentInspections = allInspections
                .filter(inspection => inspection.equipment_id === equipment.id)
                .sort((a, b) => {
                    const dateA = a.inspection_date?.toDate ? a.inspection_date.toDate() : new Date(a.inspection_date);
                    const dateB = b.inspection_date?.toDate ? b.inspection_date.toDate() : new Date(b.inspection_date);
                    return dateB - dateA;
                });
            
            equipment.last_status = recentInspections[0]?.status || '알수없음';
            equipment.last_inspection_date = recentInspections[0]?.inspection_date || null;
        });
        
        // 필터 초기화
        populateFilters();
        
        // 초기 결과 표시
        filteredEquipment = [...allEquipment];
        displayResults();
        
        showLoading(false);
        
    } catch (error) {
        console.error('❌ 데이터 로드 오류:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
        showLoading(false);
    }
}

// 필터 옵션 채우기
function populateFilters() {
    // 현장 필터
    const siteFilter = document.getElementById('siteFilter');
    const uniqueSites = [...new Set(allEquipment.map(eq => eq.site_id))];
    uniqueSites.forEach(siteId => {
        const site = allSites.find(s => s.id === siteId);
        if (site) {
            const option = document.createElement('option');
            option.value = siteId;
            option.textContent = site.site_name;
            siteFilter.appendChild(option);
        }
    });
    
    // 건물 필터
    const buildingFilter = document.getElementById('buildingFilter');
    const uniqueBuildings = [...new Set(allEquipment.map(eq => eq.building_id))];
    uniqueBuildings.forEach(buildingId => {
        const building = allBuildings.find(b => b.id === buildingId);
        if (building) {
            const option = document.createElement('option');
            option.value = buildingId;
            option.textContent = building.building_name;
            buildingFilter.appendChild(option);
        }
    });
    
    // 장비 종류 필터
    const typeFilter = document.getElementById('typeFilter');
    const uniqueTypes = [...new Set(allEquipment.map(eq => eq.equipment_type))];
    uniqueTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
    
    // 층 필터
    const floorFilter = document.getElementById('floorFilter');
    const uniqueFloors = [...new Set(allEquipment.map(eq => eq.floor))].sort((a, b) => a - b);
    uniqueFloors.forEach(floor => {
        const option = document.createElement('option');
        option.value = floor;
        option.textContent = `${floor}층`;
        floorFilter.appendChild(option);
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 입력
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // 클리어 버튼
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        handleSearch();
    });
    
    // 필터 변경
    document.getElementById('siteFilter').addEventListener('change', applyFilters);
    document.getElementById('buildingFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('floorFilter').addEventListener('change', applyFilters);
    
    // 필터 초기화 버튼
    document.getElementById('resetFilterBtn').addEventListener('click', resetFilters);
}

// 검색 처리
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // 클리어 버튼 표시/숨김
    clearBtn.style.display = searchTerm ? 'flex' : 'none';
    
    applyFilters();
}

// 필터 적용
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const siteId = document.getElementById('siteFilter').value;
    const buildingId = document.getElementById('buildingFilter').value;
    const equipmentType = document.getElementById('typeFilter').value;
    const floor = document.getElementById('floorFilter').value;
    
    // 필터링
    filteredEquipment = allEquipment.filter(equipment => {
        // 검색어 필터
        const matchesSearch = !searchTerm || 
            equipment.id.toLowerCase().includes(searchTerm) ||
            equipment.equipment_type.toLowerCase().includes(searchTerm) ||
            equipment.model.toLowerCase().includes(searchTerm) ||
            equipment.location.toLowerCase().includes(searchTerm);
        
        // 현장 필터
        const matchesSite = !siteId || equipment.site_id === siteId;
        
        // 건물 필터
        const matchesBuilding = !buildingId || equipment.building_id === buildingId;
        
        // 장비 종류 필터
        const matchesType = !equipmentType || equipment.equipment_type === equipmentType;
        
        // 층 필터
        const matchesFloor = !floor || equipment.floor.toString() === floor;
        
        return matchesSearch && matchesSite && matchesBuilding && matchesType && matchesFloor;
    });
    
    // 필터 초기화 버튼 표시/숨김
    const hasActiveFilter = siteId || buildingId || equipmentType || floor || searchTerm;
    document.getElementById('resetFilterBtn').style.display = hasActiveFilter ? 'flex' : 'none';
    
    displayResults();
}

// 필터 초기화
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    document.getElementById('siteFilter').value = '';
    document.getElementById('buildingFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('floorFilter').value = '';
    document.getElementById('resetFilterBtn').style.display = 'none';
    
    filteredEquipment = [...allEquipment];
    displayResults();
}

// 결과 표시
function displayResults() {
    const resultsContainer = document.getElementById('searchResults');
    const resultCount = document.getElementById('resultCount');
    const noResults = document.getElementById('noResults');
    
    // 결과 수 업데이트
    resultCount.textContent = `검색 결과: ${filteredEquipment.length}개`;
    
    // 결과가 없는 경우
    if (filteredEquipment.length === 0) {
        resultsContainer.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    // 결과 카드 생성
    resultsContainer.innerHTML = filteredEquipment.map(equipment => {
        const site = allSites.find(s => s.id === equipment.site_id);
        const building = allBuildings.find(b => b.id === equipment.building_id);
        
        return `
            <div class="equipment-card" data-equipment-id="${equipment.id}">
                <div class="equipment-card-header">
                    <div class="equipment-info">
                        <span class="equipment-id">${equipment.id}</span>
                        <div class="equipment-name">${equipment.equipment_type}</div>
                        <div class="equipment-model">${equipment.model}</div>
                    </div>
                    <div class="equipment-status status-${equipment.last_status}">
                        <i class="fas fa-circle"></i>
                        ${equipment.last_status}
                    </div>
                </div>
                <div class="equipment-card-body">
                    <div class="equipment-details">
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${site?.site_name || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-building"></i>
                            <span>${building?.building_name || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-layer-group"></i>
                            <span>${equipment.floor}층</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-map-pin"></i>
                            <span>${equipment.location}</span>
                        </div>
                    </div>
                    <div class="equipment-actions">
                        <button class="btn-view-history" onclick="viewHistory('${equipment.id}')">
                            <i class="fas fa-history"></i>
                            정비내역
                            <span class="inspection-count">
                                ${equipment.inspection_count}건
                            </span>
                        </button>
                        <button class="btn-view-detail" onclick="viewDetail('${equipment.id}')">
                            <i class="fas fa-info-circle"></i>
                            상세정보
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 정비내역 보기
function viewHistory(equipmentId) {
    console.log('📋 정비내역 보기:', equipmentId);
    window.location.href = `equipment-history.html?equipmentId=${equipmentId}`;
}

// 상세정보 보기
function viewDetail(equipmentId) {
    console.log('ℹ️ 상세정보 보기:', equipmentId);
    // 장비 상세 정보 모달 또는 페이지로 이동
    // 추후 구현 가능
    alert('상세정보 기능은 추후 구현 예정입니다.');
}

// 로딩 표시
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const searchResults = document.getElementById('searchResults');
    const resultSummary = document.querySelector('.result-summary');
    
    if (show) {
        loadingIndicator.style.display = 'block';
        searchResults.style.display = 'none';
        resultSummary.style.display = 'none';
    } else {
        loadingIndicator.style.display = 'none';
        searchResults.style.display = 'block';
        resultSummary.style.display = 'flex';
    }
}
