// 관리자 페이지 스크립트
// 점검자, 장비, 현장/건물 관리

let users = [];
let equipment = [];
let sites = [];
let buildings = [];
let currentEditId = null;

// 페이지 로드
document.addEventListener('DOMContentLoaded', async () => {
    await waitForFirebase();
    await waitForAuth();
    
    // 관리자 권한 체크
    const user = window.AuthManager.getCurrentUser();
    if (!user || user.role !== window.USER_ROLES.ADMIN) {
        alert('시스템 관리자 권한이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }
    
    // 데이터 로드
    await loadAllData();
    
    // 폼 submit 이벤트
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    document.getElementById('equipmentForm').addEventListener('submit', handleEquipmentSubmit);
    document.getElementById('siteForm').addEventListener('submit', handleSiteSubmit);
    document.getElementById('buildingForm').addEventListener('submit', handleBuildingSubmit);
});

// Firebase 초기화 대기
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.db && window.CachedFirestoreHelper) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.db && window.CachedFirestoreHelper) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// AuthManager 초기화 대기
function waitForAuth() {
    return new Promise((resolve) => {
        if (window.AuthManager) {
            window.AuthManager.initialize().then(resolve);
        } else {
            const checkInterval = setInterval(() => {
                if (window.AuthManager) {
                    clearInterval(checkInterval);
                    window.AuthManager.initialize().then(resolve);
                }
            }, 100);
        }
    });
}

// 모든 데이터 로드
async function loadAllData() {
    await Promise.all([
        loadUsers(),
        loadEquipment(),
        loadSites(),
        loadBuildings()
    ]);
}

// ===== 탭 전환 =====
function switchTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    event.target.closest('.admin-tab').classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ===== 점검자 관리 =====
async function loadUsers() {
    console.log('📋 점검자 데이터 로드 시작...');
    const result = await window.CachedFirestoreHelper.getAllDocuments('users');
    console.log('📋 점검자 데이터 로드 결과:', result);
    
    if (result.success) {
        users = result.data;
        console.log('✅ 점검자 수:', users.length, '명');
        console.log('📊 점검자 목록:', users);
        renderUsers();
    } else {
        console.error('❌ 점검자 로드 실패:', result.error);
    }
}

function renderUsers() {
    const usersList = document.getElementById('usersList');
    
    if (users.length === 0) {
        usersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-users"></i></div>
                <div class="empty-title">등록된 점검자가 없습니다</div>
                <div class="empty-description">새 점검자를 추가하여 시작하세요</div>
            </div>
        `;
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-title">${user.name || '이름 없음'}</div>
                    <div class="item-subtitle">${user.email}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="editUser('${user.id}')" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteUser('${user.id}')" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-details">
                <div class="item-detail">
                    <i class="fas fa-user-tag"></i>
                    <span class="role-badge role-${user.role}">
                        ${getRoleText(user.role)}
                    </span>
                </div>
                <div class="item-detail">
                    <i class="fas fa-calendar"></i>
                    등록일: ${formatDate(user.created_at)}
                </div>
            </div>
        </div>
    `).join('');
}

function getRoleText(role) {
    const roles = {
        'inspector': '점검자',
        'manager': '관리자',
        'admin': '시스템 관리자'
    };
    return roles[role] || '사용자';
}

function showAddUserModal() {
    document.getElementById('userModalTitle').textContent = '점검자 추가';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('userModal').classList.add('active');
    currentEditId = null;
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('userModalTitle').textContent = '점검자 수정';
    document.getElementById('userId').value = user.id;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userName').value = user.name;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('userModal').classList.add('active');
    currentEditId = userId;
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    currentEditId = null;
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');
    const role = formData.get('role');
    
    if (currentEditId) {
        // 수정
        const updateData = { name, role, email };
        
        // 비밀번호 변경 시에만 업데이트 (실제로는 Firebase Auth 사용 필요)
        if (password) {
            alert('비밀번호 변경은 별도 처리가 필요합니다.');
        }
        
        const result = await window.CachedFirestoreHelper.updateDocument('users', currentEditId, updateData);
        if (result.success) {
            alert('점검자 정보가 수정되었습니다.');
            closeUserModal();
            await loadUsers();
        } else {
            alert('수정 실패: ' + result.error);
        }
    } else {
        // 추가 - AuthManager의 createUser 사용
        const result = await window.AuthManager.createUser(email, password, { name, role });
        if (result.success) {
            alert('새 점검자가 추가되었습니다.');
            closeUserModal();
            await loadUsers();
        } else {
            alert('추가 실패: ' + result.error);
        }
    }
}

async function deleteUser(userId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    const result = await window.CachedFirestoreHelper.deleteDocument('users', userId);
    if (result.success) {
        alert('삭제되었습니다.');
        await loadUsers();
    } else {
        alert('삭제 실패: ' + result.error);
    }
}

// ===== 장비 관리 =====
async function loadEquipment() {
    console.log('🔧 장비 데이터 로드 시작...');
    const result = await window.CachedFirestoreHelper.getAllDocuments('equipment');
    console.log('🔧 장비 데이터 로드 결과:', result);
    
    if (result.success) {
        equipment = result.data;
        console.log('✅ 장비 수:', equipment.length, '개');
        console.log('📊 장비 목록:', equipment);
        renderEquipment();
    } else {
        console.error('❌ 장비 로드 실패:', result.error);
    }
}

function renderEquipment() {
    const equipmentList = document.getElementById('equipmentList');
    
    if (equipment.length === 0) {
        equipmentList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-toolbox"></i></div>
                <div class="empty-title">등록된 장비가 없습니다</div>
                <div class="empty-description">새 장비를 추가하여 시작하세요</div>
            </div>
        `;
        return;
    }
    
    equipmentList.innerHTML = equipment.map(eq => {
        const site = sites.find(s => s.id === eq.site_id);
        const building = buildings.find(b => b.id === eq.building_id);
        
        return `
            <div class="item-card">
                <div class="item-header">
                    <div>
                        <div class="item-title">${eq.type}</div>
                        <div class="item-subtitle">${eq.id}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="editEquipment('${eq.id}')" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteEquipment('${eq.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="item-detail">
                        <i class="fas fa-building"></i>
                        ${site?.site_name || '현장 없음'} > ${building?.building_name || '건물 없음'}
                    </div>
                    ${eq.model ? `
                        <div class="item-detail">
                            <i class="fas fa-tag"></i>
                            ${eq.model}
                        </div>
                    ` : ''}
                    ${eq.location ? `
                        <div class="item-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            ${eq.location} ${eq.floor || ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function showAddEquipmentModal() {
    document.getElementById('equipmentModalTitle').textContent = '장비 추가';
    document.getElementById('equipmentForm').reset();
    document.getElementById('equipmentId').value = '';
    
    // 현장 목록 로드
    await loadSitesForEquipment();
    
    document.getElementById('equipmentModal').classList.add('active');
    currentEditId = null;
}

async function editEquipment(equipmentId) {
    const eq = equipment.find(e => e.id === equipmentId);
    if (!eq) return;
    
    document.getElementById('equipmentModalTitle').textContent = '장비 수정';
    document.getElementById('equipmentId').value = eq.id;
    document.getElementById('equipmentType').value = eq.type;
    document.getElementById('equipmentModel').value = eq.model || '';
    document.getElementById('equipmentLocation').value = eq.location || '';
    document.getElementById('equipmentFloor').value = eq.floor || '';
    
    // 현장 목록 로드 후 선택
    await loadSitesForEquipment();
    document.getElementById('equipmentSite').value = eq.site_id;
    
    // 건물 목록 로드 후 선택
    await loadBuildingsForEquipment(eq.site_id);
    document.getElementById('equipmentBuilding').value = eq.building_id;
    
    document.getElementById('equipmentModal').classList.add('active');
    currentEditId = equipmentId;
}

function closeEquipmentModal() {
    document.getElementById('equipmentModal').classList.remove('active');
    currentEditId = null;
}

async function loadSitesForEquipment() {
    const select = document.getElementById('equipmentSite');
    select.innerHTML = '<option value="">선택하세요</option>';
    
    sites.forEach(site => {
        select.innerHTML += `<option value="${site.id}">${site.site_name}</option>`;
    });
}

async function loadBuildingsForEquipment(siteId) {
    const select = document.getElementById('equipmentBuilding');
    select.innerHTML = '<option value="">건물을 선택하세요</option>';
    
    if (!siteId) return;
    
    const siteBuildings = buildings.filter(b => b.site_id === siteId);
    siteBuildings.forEach(building => {
        select.innerHTML += `<option value="${building.id}">${building.building_name}</option>`;
    });
}

async function handleEquipmentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const equipmentData = {
        type: formData.get('type'),
        site_id: formData.get('site_id'),
        building_id: formData.get('building_id'),
        model: formData.get('model'),
        location: formData.get('location'),
        floor: formData.get('floor')
    };
    
    let result;
    if (currentEditId) {
        result = await window.CachedFirestoreHelper.updateDocument('equipment', currentEditId, equipmentData);
    } else {
        result = await window.CachedFirestoreHelper.addDocument('equipment', equipmentData);
    }
    
    if (result.success) {
        alert(currentEditId ? '장비가 수정되었습니다.' : '새 장비가 추가되었습니다.');
        closeEquipmentModal();
        await loadEquipment();
    } else {
        alert('실패: ' + result.error);
    }
}

async function deleteEquipment(equipmentId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    const result = await window.CachedFirestoreHelper.deleteDocument('equipment', equipmentId);
    if (result.success) {
        alert('삭제되었습니다.');
        await loadEquipment();
    } else {
        alert('삭제 실패: ' + result.error);
    }
}

// ===== 현장/건물 관리 =====
async function loadSites() {
    const result = await window.CachedFirestoreHelper.getAllDocuments('sites');
    if (result.success) {
        sites = result.data;
        renderSites();
    }
}

async function loadBuildings() {
    const result = await window.CachedFirestoreHelper.getAllDocuments('buildings');
    if (result.success) {
        buildings = result.data;
    }
}

function renderSites() {
    const sitesList = document.getElementById('sitesList');
    
    if (sites.length === 0 && buildings.length === 0) {
        sitesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-building"></i></div>
                <div class="empty-title">등록된 현장/건물이 없습니다</div>
                <div class="empty-description">새 현장과 건물을 추가하여 시작하세요</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // 현장별로 그룹화
    sites.forEach(site => {
        const siteBuildings = buildings.filter(b => b.site_id === site.id);
        
        html += `
            <div class="item-card">
                <div class="item-header">
                    <div>
                        <div class="item-title">${site.site_name}</div>
                        <div class="item-subtitle">${site.address || '주소 없음'}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="editSite('${site.id}')" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteSite('${site.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="item-detail">
                        <i class="fas fa-building"></i>
                        건물: ${siteBuildings.length}개
                    </div>
                    ${siteBuildings.map(b => `
                        <div class="item-detail" style="padding-left: 30px;">
                            <i class="fas fa-angle-right"></i>
                            ${b.building_name} ${b.floors ? `(${b.floors}층)` : ''}
                            <button class="btn-edit" style="margin-left: auto; width: 28px; height: 28px; font-size: 12px;" onclick="editBuilding('${b.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" style="width: 28px; height: 28px; font-size: 12px;" onclick="deleteBuilding('${b.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    sitesList.innerHTML = html;
}

// 현장 모달
function showAddSiteModal() {
    document.getElementById('siteModalTitle').textContent = '현장 추가';
    document.getElementById('siteForm').reset();
    document.getElementById('siteId').value = '';
    document.getElementById('siteModal').classList.add('active');
    currentEditId = null;
}

function editSite(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    document.getElementById('siteModalTitle').textContent = '현장 수정';
    document.getElementById('siteId').value = site.id;
    document.getElementById('siteName').value = site.site_name;
    document.getElementById('siteAddress').value = site.address || '';
    document.getElementById('siteModal').classList.add('active');
    currentEditId = siteId;
}

function closeSiteModal() {
    document.getElementById('siteModal').classList.remove('active');
    currentEditId = null;
}

async function handleSiteSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const siteData = {
        site_name: formData.get('site_name'),
        address: formData.get('address')
    };
    
    let result;
    if (currentEditId) {
        result = await window.CachedFirestoreHelper.updateDocument('sites', currentEditId, siteData);
    } else {
        result = await window.CachedFirestoreHelper.addDocument('sites', siteData);
    }
    
    if (result.success) {
        alert(currentEditId ? '현장이 수정되었습니다.' : '새 현장이 추가되었습니다.');
        closeSiteModal();
        await loadSites();
        await loadBuildings();
        renderSites();
    } else {
        alert('실패: ' + result.error);
    }
}

async function deleteSite(siteId) {
    // 건물이 있는지 확인
    const siteBuildings = buildings.filter(b => b.site_id === siteId);
    if (siteBuildings.length > 0) {
        alert('건물이 있는 현장은 삭제할 수 없습니다. 먼저 건물을 삭제하세요.');
        return;
    }
    
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    const result = await window.CachedFirestoreHelper.deleteDocument('sites', siteId);
    if (result.success) {
        alert('삭제되었습니다.');
        await loadSites();
        renderSites();
    } else {
        alert('삭제 실패: ' + result.error);
    }
}

// 건물 모달
async function showAddBuildingModal() {
    document.getElementById('buildingModalTitle').textContent = '건물 추가';
    document.getElementById('buildingForm').reset();
    document.getElementById('buildingId').value = '';
    
    // 현장 목록 로드
    const select = document.getElementById('buildingSite');
    select.innerHTML = '<option value="">선택하세요</option>';
    sites.forEach(site => {
        select.innerHTML += `<option value="${site.id}">${site.site_name}</option>`;
    });
    
    document.getElementById('buildingModal').classList.add('active');
    currentEditId = null;
}

async function editBuilding(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    document.getElementById('buildingModalTitle').textContent = '건물 수정';
    document.getElementById('buildingId').value = building.id;
    
    // 현장 목록 로드
    const select = document.getElementById('buildingSite');
    select.innerHTML = '<option value="">선택하세요</option>';
    sites.forEach(site => {
        select.innerHTML += `<option value="${site.id}">${site.site_name}</option>`;
    });
    select.value = building.site_id;
    
    document.getElementById('buildingName').value = building.building_name;
    document.getElementById('buildingFloors').value = building.floors || '';
    document.getElementById('buildingModal').classList.add('active');
    currentEditId = buildingId;
}

function closeBuildingModal() {
    document.getElementById('buildingModal').classList.remove('active');
    currentEditId = null;
}

async function handleBuildingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const buildingData = {
        site_id: formData.get('site_id'),
        building_name: formData.get('building_name'),
        floors: formData.get('floors') ? parseInt(formData.get('floors')) : null
    };
    
    let result;
    if (currentEditId) {
        result = await window.CachedFirestoreHelper.updateDocument('buildings', currentEditId, buildingData);
    } else {
        result = await window.CachedFirestoreHelper.addDocument('buildings', buildingData);
    }
    
    if (result.success) {
        alert(currentEditId ? '건물이 수정되었습니다.' : '새 건물이 추가되었습니다.');
        closeBuildingModal();
        await loadBuildings();
        await loadSites();
        renderSites();
    } else {
        alert('실패: ' + result.error);
    }
}

async function deleteBuilding(buildingId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    const result = await window.CachedFirestoreHelper.deleteDocument('buildings', buildingId);
    if (result.success) {
        alert('삭제되었습니다.');
        await loadBuildings();
        await loadSites();
        renderSites();
    } else {
        alert('삭제 실패: ' + result.error);
    }
}

// 유틸리티
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR');
}
