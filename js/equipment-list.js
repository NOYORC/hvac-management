// 전역 변수
let allEquipmentList = [];
let allSitesList = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    await waitForFirebase();
    await loadFilters();
    await loadEquipmentList();
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

// 필터 옵션 로드
async function loadFilters() {
    try {
        // 현장 목록
        const sitesData = await window.CachedFirestoreHelper.getAllDocuments('sites');
        allSitesList = sitesData.data;
        
        const siteFilter = document.getElementById('siteFilterList');
        allSitesList.forEach(site => {
            siteFilter.innerHTML += `<option value="${site.id}">${site.site_name}</option>`;
        });
        
        // 장비 데이터 로드 후 장비 종류 필터 생성
        const equipmentData = await window.CachedFirestoreHelper.getAllDocuments('equipment');
        allEquipmentList = equipmentData.data;
        
        const types = [...new Set(allEquipmentList.map(eq => eq.equipment_type))].sort();
        const typeFilter = document.getElementById('typeFilterList');
        types.forEach(type => {
            typeFilter.innerHTML += `<option value="${type}">${type}</option>`;
        });
        
    } catch (error) {
        console.error('필터 로드 오류:', error);
    }
}

// 장비 목록 로드
async function loadEquipmentList() {
    try {
        const equipmentData = await window.CachedFirestoreHelper.getAllDocuments('equipment');
        allEquipmentList = equipmentData.data;
        
        displayEquipmentList(allEquipmentList);
    } catch (error) {
        console.error('장비 목록 로드 오류:', error);
        alert('장비 목록을 불러오는데 실패했습니다.');
    }
}

// 장비 목록 표시
function displayEquipmentList(equipment) {
    const container = document.getElementById('equipmentContainer');
    
    if (equipment.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>조건에 맞는 장비가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    equipment.forEach(eq => {
        const site = allSitesList.find(s => s.id === eq.site_id);
        const siteName = site ? site.site_name : '알 수 없음';
        
        const card = document.createElement('div');
        card.className = 'equipment-item';
        card.innerHTML = `
            <div class="equipment-header">
                <div class="equipment-type">
                    <div class="equipment-icon">
                        <i class="fas ${getEquipmentIcon(eq.equipment_type)}"></i>
                    </div>
                    <div class="equipment-type-name">${eq.equipment_type}</div>
                </div>
                <div class="equipment-id-badge">${eq.id}</div>
            </div>
            <div class="equipment-details">
                <div class="detail-row">
                    <i class="fas fa-building"></i>
                    <span>${siteName}</span>
                </div>
                <div class="detail-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${eq.floor} - ${eq.location}</span>
                </div>
                <div class="detail-row">
                    <i class="fas fa-box"></i>
                    <span><strong>모델:</strong> ${eq.model}</span>
                </div>
                <div class="detail-row">
                    <i class="fas fa-tachometer-alt"></i>
                    <span><strong>용량:</strong> ${eq.capacity}</span>
                </div>
                <div class="detail-row">
                    <i class="fas fa-calendar"></i>
                    <span><strong>설치:</strong> ${eq.install_date}</span>
                </div>
            </div>
            <div class="equipment-actions">
                <button class="btn-inspect" onclick="startInspection('${eq.id}')">
                    <i class="fas fa-clipboard-check"></i> 점검 시작
                </button>
                <button class="btn-qr-code" onclick="showQRCode('${eq.id}')" title="QR 코드">
                    <i class="fas fa-qrcode"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 필터링
function filterList() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const siteFilter = document.getElementById('siteFilterList').value;
    const typeFilter = document.getElementById('typeFilterList').value;
    
    let filtered = allEquipmentList;
    
    // 검색어 필터
    if (searchText) {
        filtered = filtered.filter(eq => 
            eq.id.toLowerCase().includes(searchText) ||
            eq.model.toLowerCase().includes(searchText) ||
            eq.location.toLowerCase().includes(searchText) ||
            eq.floor.toLowerCase().includes(searchText)
        );
    }
    
    // 현장 필터
    if (siteFilter) {
        filtered = filtered.filter(eq => eq.site_id === siteFilter);
    }
    
    // 장비 종류 필터
    if (typeFilter) {
        filtered = filtered.filter(eq => eq.equipment_type === typeFilter);
    }
    
    displayEquipmentList(filtered);
}

// 점검 시작 (장비 직접 선택)
function startInspection(equipmentId) {
    // inspection.html로 이동하되, 장비 ID를 URL 파라미터로 전달
    location.href = `inspection.html?equipment=${equipmentId}`;
}

// QR 코드 표시
function showQRCode(equipmentId) {
    // QR 코드 생성 기능 (향후 구현)
    alert(`장비 ID: ${equipmentId}\n\nQR 코드 생성 기능은 곧 제공될 예정입니다.\n현재는 이 장비 ID를 사용하여 점검을 진행할 수 있습니다.`);
}
