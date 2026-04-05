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
    // 모든 데이터 병렬 로드 (렌더링은 아직 하지 않음)
    await Promise.all([
        loadUsers(),
        loadEquipment(),
        loadSites(),
        loadBuildings()
    ]);
    
    // 모든 데이터 로드 완료 후 렌더링
    renderSites();
    renderEquipment();
}

// ===== 탭 전환 =====
function switchTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    event.target.closest('.admin-tab').classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // 점검 내역 탭이 활성화되면 데이터 로드
    if (tabName === 'inspections') {
        loadInspections();
    }
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
                        <div class="item-title">${eq.equipment_type || eq.type || 'undefined'}</div>
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
                            ${eq.floor ? `${eq.floor}층 ` : ''}${eq.location}
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
    document.getElementById('equipmentType').value = eq.equipment_type || eq.type;
    document.getElementById('equipmentModel').value = eq.model || '';
    document.getElementById('equipmentLocation').value = eq.location || '';
    document.getElementById('equipmentFloor').value = eq.floor || '';
    document.getElementById('equipmentCapacity').value = eq.capacity || '';
    
    // installation_date 처리
    if (eq.installation_date) {
        try {
            const date = eq.installation_date.toDate ? eq.installation_date.toDate() : new Date(eq.installation_date);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
            document.getElementById('equipmentInstallDate').value = dateStr;
        } catch (e) {
            console.error('설치일자 변환 오류:', e);
            document.getElementById('equipmentInstallDate').value = '';
        }
    } else {
        document.getElementById('equipmentInstallDate').value = '';
    }
    
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
        equipment_type: formData.get('type'),
        site_id: formData.get('site_id'),
        building_id: formData.get('building_id'),
        model: formData.get('model'),
        location: formData.get('location'),
        floor: formData.get('floor'),
        capacity: formData.get('capacity')
    };
    
    // installation_date 처리
    const installDate = formData.get('installation_date');
    if (installDate) {
        equipmentData.installation_date = window.FirestoreTimestamp.fromDate(new Date(installDate));
    } else {
        // 설치일자가 없으면 현재 시간으로 설정
        equipmentData.installation_date = window.FirestoreTimestamp.now();
    }
    
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
        renderEquipment();
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
        renderEquipment();
    } else {
        alert('삭제 실패: ' + result.error);
    }
}

// ===== 현장/건물 관리 =====
async function loadSites() {
    const result = await window.CachedFirestoreHelper.getAllDocuments('sites');
    if (result.success) {
        sites = result.data;
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
    document.getElementById('siteGroup').value = site.site_group || '';
    document.getElementById('siteName').value = site.site_name;
    document.getElementById('siteAddress').value = site.address || '';
    document.getElementById('siteContactName').value = site.contact_name || '';
    document.getElementById('siteContactPhone').value = site.contact_phone || '';
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
        site_group: formData.get('site_group') || '',
        address: formData.get('address'),
        contact_name: formData.get('contact_name'),
        contact_phone: formData.get('contact_phone')
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

// ===== 점검 내역 관리 =====
let allInspections = [];
let selectedInspectionIds = new Set();

// 점검 내역 로드
async function loadInspections() {
    try {
        console.log('📋 점검 내역 로드 시작...');
        
        // 점검 데이터 가져오기
        const inspectionsResult = await window.CachedFirestoreHelper.getAllDocuments('inspections');
        allInspections = inspectionsResult.data || [];
        
        console.log(`✅ 점검 내역 ${allInspections.length}개 로드 완료`);
        
        // 점검자 이름 보강 (users 컬렉션에서)
        await enrichInspectorNames(allInspections);
        
        // 필터 적용 및 렌더링
        renderInspections();
        
    } catch (error) {
        console.error('❌ 점검 내역 로드 오류:', error);
        const tbody = document.getElementById('inspectionsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 40px; text-align: center; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <br>점검 내역을 불러오는데 실패했습니다.
                    </td>
                </tr>
            `;
        }
    }
}

// 점검자 이름 보강 (users 컬렉션에서)
async function enrichInspectorNames(inspections) {
    try {
        console.log('👤 점검자 이름 보강 시작...');
        const usersResult = await window.CachedFirestoreHelper.getAllDocuments('users');
        if (!usersResult.success || !usersResult.data) {
            console.warn('⚠️ users 컬렉션을 불러올 수 없습니다.');
            return;
        }
        
        const usersMap = {};
        usersResult.data.forEach(user => {
            if (user.email) {
                usersMap[user.email] = user;
                console.log(`📧 users 맵에 추가: ${user.email} → ${user.name}`);
            }
        });
        
        console.log(`✅ 총 ${usersResult.data.length}명의 사용자 로드됨`);
        
        let updatedCount = 0;
        let missingCount = 0;
        
        inspections.forEach(inspection => {
            const email = inspection.inspector_email;
            if (email && usersMap[email]) {
                // 사용자 정보가 있으면 이름 업데이트
                inspection.inspector_name = usersMap[email].name || inspection.inspector_name;
                updatedCount++;
            } else if (email) {
                // 이메일은 있지만 users 컬렉션에 없는 경우 (삭제된 사용자)
                inspection.inspector_name = `${email} (삭제된 사용자)`;
                inspection._missing_user = true;
                missingCount++;
                console.warn(`⚠️ users 컬렉션에서 ${email}을(를) 찾을 수 없음 (점검 ID: ${inspection.id})`);
            } else {
                // 이메일도 없는 경우
                inspection.inspector_name = '알 수 없음';
                inspection._missing_user = true;
                missingCount++;
                console.warn(`⚠️ inspector_email이 없음 (점검 ID: ${inspection.id})`);
            }
        });
        
        console.log(`✅ 점검자 이름 보강 완료 (${updatedCount}/${inspections.length}개 업데이트, ${missingCount}개 누락)`);
    } catch (error) {
        console.error('❌ 점검자 이름 보강 오류:', error);
    }
}

// 점검 내역 렌더링
function renderInspections() {
    const tbody = document.getElementById('inspectionsTableBody');
    if (!tbody) return;
    
    // 필터 적용
    const period = document.getElementById('inspectionPeriodFilter')?.value || 'all';
    const status = document.getElementById('inspectionStatusFilter')?.value || 'all';
    const inspectorSearch = document.getElementById('inspectionInspectorFilter')?.value.toLowerCase() || '';
    
    let filtered = [...allInspections];
    
    // 기간 필터
    if (period !== 'all') {
        const now = new Date();
        filtered = filtered.filter(insp => {
            let inspDate;
            if (insp.inspection_date && typeof insp.inspection_date.toDate === 'function') {
                inspDate = insp.inspection_date.toDate();
            } else if (insp.inspection_date) {
                inspDate = new Date(insp.inspection_date);
            } else {
                return false;
            }
            
            const diffDays = Math.floor((now - inspDate) / (1000 * 60 * 60 * 24));
            
            if (period === 'today') return diffDays === 0;
            if (period === 'week') return diffDays <= 7;
            if (period === 'month') return diffDays <= 30;
            if (period === '3months') return diffDays <= 90;
            return true;
        });
    }
    
    // 상태 필터
    if (status !== 'all') {
        filtered = filtered.filter(insp => insp.status === status);
    }
    
    // 점검자 검색
    if (inspectorSearch) {
        filtered = filtered.filter(insp => 
            (insp.inspector_name || '').toLowerCase().includes(inspectorSearch)
        );
    }
    
    // 최신순 정렬
    filtered.sort((a, b) => {
        const dateA = a.inspection_date?.toDate ? a.inspection_date.toDate() : new Date(a.inspection_date || 0);
        const dateB = b.inspection_date?.toDate ? b.inspection_date.toDate() : new Date(b.inspection_date || 0);
        return dateB - dateA;
    });
    
    // 렌더링
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 40px; text-align: center; color: #999;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 10px; opacity: 0.3;"></i>
                    <br>조건에 맞는 점검 내역이 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(insp => {
        const isSelected = selectedInspectionIds.has(insp.id);
        const formattedDate = formatInspectionDate(insp.inspection_date);
        const statusColor = getStatusColor(insp.status);
        const hasMissingUser = insp._missing_user === true;
        
        return `
            <tr ${hasMissingUser ? 'style="background-color: #fff3cd;"' : ''}>
                <td style="text-align: center;">
                    <input type="checkbox" class="inspection-checkbox" 
                           data-id="${insp.id}" 
                           ${isSelected ? 'checked' : ''}
                           onchange="toggleInspectionSelection('${insp.id}')">
                </td>
                <td>${formattedDate}</td>
                <td>
                    ${hasMissingUser ? '<i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-right: 5px;" title="사용자 정보 없음"></i>' : ''}
                    <strong>${insp.inspector_name || '알 수 없음'}</strong>
                    ${insp.inspector_email ? `<br><small style="color: #999;">${insp.inspector_email}</small>` : ''}
                </td>
                <td><strong style="color: #667eea;">${insp.equipment_id || '-'}</strong></td>
                <td>${insp.equipment_type || '-'}</td>
                <td style="text-align: center;">
                    <span class="status-badge" style="background-color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white;">
                        ${insp.status || '-'}
                    </span>
                </td>
                <td>${insp.inspection_type || '일반점검'}</td>
            </tr>
        `;
    }).join('');
    
    updateSelectionUI();
}

// 점검 날짜 포맷
function formatInspectionDate(date) {
    if (!date) return '-';
    
    let d;
    if (typeof date.toDate === 'function') {
        d = date.toDate();
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
}

// 상태 색상
function getStatusColor(status) {
    switch (status) {
        case '정상': return '#10b981';
        case '주의': return '#f59e0b';
        case '경고': return '#ef4444';
        case '고장': return '#dc2626';
        default: return '#6b7280';
    }
}

// 점검 선택/해제
function toggleInspectionSelection(id) {
    if (selectedInspectionIds.has(id)) {
        selectedInspectionIds.delete(id);
    } else {
        selectedInspectionIds.add(id);
    }
    updateSelectionUI();
}

// 전체 선택/해제
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.inspection-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (selectAllCheckbox.checked) {
        // 전체 선택
        checkboxes.forEach(cb => {
            cb.checked = true;
            selectedInspectionIds.add(cb.dataset.id);
        });
    } else {
        // 전체 해제
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
        selectedInspectionIds.clear();
    }
    
    updateSelectionUI();
}

// 선택 UI 업데이트
function updateSelectionUI() {
    const count = selectedInspectionIds.size;
    const countSpan = document.getElementById('selectedCount');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (countSpan) countSpan.textContent = count;
    if (deleteBtn) deleteBtn.style.display = count > 0 ? 'flex' : 'none';
    
    // 전체 선택 체크박스 상태 업데이트
    if (selectAllCheckbox) {
        const checkboxes = document.querySelectorAll('.inspection-checkbox');
        selectAllCheckbox.checked = checkboxes.length > 0 && count === checkboxes.length;
    }
}

// 선택된 점검 내역 삭제
async function deleteSelectedInspections() {
    if (selectedInspectionIds.size === 0) {
        alert('삭제할 점검 내역을 선택해주세요.');
        return;
    }
    
    const count = selectedInspectionIds.size;
    if (!confirm(`선택한 ${count}개의 점검 내역을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...';
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const id of selectedInspectionIds) {
            const result = await window.FirestoreHelper.deleteDocument('inspections', id);
            if (result.success) {
                successCount++;
            } else {
                failCount++;
                console.error(`삭제 실패: ${id}`, result.error);
            }
        }
        
        selectedInspectionIds.clear();
        
        if (failCount === 0) {
            alert(`${successCount}개의 점검 내역이 삭제되었습니다.`);
        } else {
            alert(`${successCount}개 삭제 완료, ${failCount}개 실패\n\n실패한 내역은 콘솔을 확인해주세요.`);
        }
        
        // 캐시 클리어 및 새로고침
        window.CacheHelper.clearCache('inspections');
        await loadInspections();
        
    } catch (error) {
        console.error('❌ 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i> 선택 삭제 (<span id="selectedCount">0</span>)`;
        }
    }
}
