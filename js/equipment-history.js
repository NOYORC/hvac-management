// ===== 정비내역 페이지 JavaScript =====

// 브레드크럼 생성 함수
function generateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    // referrer에서 이전 페이지 확인
    const referrer = document.referrer;
    let previousPage = { name: '홈', url: 'index.html', icon: 'fa-home' };
    
    if (referrer.includes('dashboard.html')) {
        previousPage = { name: '관리대시보드', url: 'dashboard.html', icon: 'fa-chart-line' };
    } else if (referrer.includes('equipment-search.html')) {
        previousPage = { name: '장비검색', url: 'equipment-search.html', icon: 'fa-search' };
    } else if (referrer.includes('index.html')) {
        previousPage = { name: '홈', url: 'index.html', icon: 'fa-home' };
    }
    
    // 장비 ID
    const urlParams = new URLSearchParams(window.location.search);
    const equipmentId = urlParams.get('equipment_id') || urlParams.get('equipmentId');
    const currentPageName = equipmentId ? `정비내역 (${equipmentId})` : '정비내역';
    
    // 브레드크럼 HTML 생성
    breadcrumb.innerHTML = `
        <div class="breadcrumb-item">
            <a href="${previousPage.url}">
                <i class="fas ${previousPage.icon}"></i>
                ${previousPage.name}
            </a>
        </div>
        <span class="breadcrumb-separator">
            <i class="fas fa-chevron-right"></i>
        </span>
        <div class="breadcrumb-item">
            <span class="breadcrumb-current">
                <i class="fas fa-history"></i>
                ${currentPageName}
            </span>
        </div>
    `;
}

// 뒤로가기 함수 (이전 페이지로 이동)
function goBackToPreviousPage() {
    // 브라우저 히스토리에서 referrer 확인
    const referrer = document.referrer;
    
    console.log('🔙 뒤로가기 - Referrer:', referrer);
    
    // 같은 도메인에서 왔고 히스토리가 있으면 뒤로가기
    if (referrer && referrer.includes(window.location.host) && window.history.length > 1) {
        console.log('✅ 브라우저 히스토리 뒤로가기 실행');
        window.history.back();
    } else {
        // 직접 접근하거나 히스토리가 없으면 장비검색으로 이동
        console.log('⚠️ 히스토리 없음 - 장비검색으로 이동');
        window.location.href = 'equipment-search.html';
    }
}

// 전역 변수
let equipmentId = null;
let equipment = null;
let site = null;
let building = null;
let allInspections = [];
let filteredInspections = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 정비내역 페이지 초기화 시작');
    
    // 브레드크럼 생성
    generateBreadcrumb();
    
    // URL에서 장비 ID 가져오기 (equipment_id 또는 equipmentId 모두 지원)
    const urlParams = new URLSearchParams(window.location.search);
    equipmentId = urlParams.get('equipment_id') || urlParams.get('equipmentId');
    
    console.log('URL 파라미터에서 받은 equipment_id:', equipmentId);
    
    if (!equipmentId) {
        console.error('❌ 장비 ID가 URL 파라미터에 없습니다.');
        alert('장비 ID가 없습니다.');
        window.location.href = 'equipment-search.html';
        return;
    }
    
    await waitForFirebase();
    await loadEquipmentData();
    setupEventListeners();
    
    console.log('✅ 정비내역 페이지 초기화 완료');
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

// 장비 데이터 로드
async function loadEquipmentData() {
    try {
        showLoading(true);
        
        console.log(`📊 장비 ${equipmentId} 데이터 로딩 시작...`);
        
        // 장비 정보 조회
        const equipmentResult = await window.CachedFirestoreHelper.getDocument('equipment', equipmentId);
        
        if (!equipmentResult.success) {
            throw new Error('장비 정보를 찾을 수 없습니다.');
        }
        
        equipment = equipmentResult.data;
        
        // 현장 및 건물 정보 조회
        const [siteResult, buildingResult] = await Promise.all([
            window.CachedFirestoreHelper.getDocument('sites', equipment.site_id),
            window.CachedFirestoreHelper.getDocument('buildings', equipment.building_id)
        ]);
        
        site = siteResult.data;
        building = buildingResult.data;
        
        // 점검 기록 조회
        const inspectionsResult = await window.FirestoreHelper.queryDocuments('inspections', [
            { field: 'equipment_id', operator: '==', value: equipmentId }
        ]);
        
        allInspections = inspectionsResult.success ? inspectionsResult.data : [];
        
        console.log(`✅ 장비 정보 로드 완료: ${equipment.equipment_type} ${equipment.model}`);
        console.log(`✅ 점검 기록 ${allInspections.length}개 로드 완료`);
        
        // 데이터 표시
        displayEquipmentInfo();
        calculateStatistics();
        applyFilters();
        
        showLoading(false);
        
    } catch (error) {
        console.error('❌ 데이터 로드 오류:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
        showLoading(false);
    }
}

// 장비 정보 표시
function displayEquipmentInfo() {
    const infoCard = document.getElementById('equipmentInfoCard');
    
    // 최근 점검 상태
    const sortedInspections = [...allInspections].sort((a, b) => {
        const dateA = a.inspection_date?.toDate ? a.inspection_date.toDate() : new Date(a.inspection_date);
        const dateB = b.inspection_date?.toDate ? b.inspection_date.toDate() : new Date(b.inspection_date);
        return dateB - dateA;
    });
    
    const lastStatus = sortedInspections[0]?.status || '알수없음';
    const lastInspectionDate = sortedInspections[0]?.inspection_date || null;
    
    infoCard.innerHTML = `
        <div class="equipment-header">
            <div class="equipment-title">
                <span class="equipment-id-badge">${equipment.id}</span>
                <div class="equipment-name">${equipment.equipment_type}</div>
                <div class="equipment-model">${equipment.model}</div>
            </div>
            <div class="equipment-current-status status-${lastStatus}">
                <i class="fas fa-circle"></i>
                ${lastStatus}
            </div>
        </div>
        <div class="equipment-details-grid">
            <div class="equipment-detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <div class="equipment-detail-content">
                    <div class="equipment-detail-label">현장</div>
                    <div class="equipment-detail-value">${site?.site_name || '-'}</div>
                </div>
            </div>
            <div class="equipment-detail-item">
                <i class="fas fa-building"></i>
                <div class="equipment-detail-content">
                    <div class="equipment-detail-label">건물</div>
                    <div class="equipment-detail-value">${building?.building_name || '-'}</div>
                </div>
            </div>
            <div class="equipment-detail-item">
                <i class="fas fa-layer-group"></i>
                <div class="equipment-detail-content">
                    <div class="equipment-detail-label">층</div>
                    <div class="equipment-detail-value">${equipment.floor}층</div>
                </div>
            </div>
            <div class="equipment-detail-item">
                <i class="fas fa-map-pin"></i>
                <div class="equipment-detail-content">
                    <div class="equipment-detail-label">위치</div>
                    <div class="equipment-detail-value">${equipment.location}</div>
                </div>
            </div>
            <div class="equipment-detail-item">
                <i class="fas fa-calendar-check"></i>
                <div class="equipment-detail-content">
                    <div class="equipment-detail-label">마지막 점검</div>
                    <div class="equipment-detail-value">${lastInspectionDate ? formatDate(lastInspectionDate) : '-'}</div>
                </div>
            </div>
        </div>
    `;
}

// 통계 계산
function calculateStatistics() {
    const totalInspections = allInspections.length;
    const normalCount = allInspections.filter(i => i.status === '정상').length;
    const warningCount = allInspections.filter(i => i.status === '주의' || i.status === '경고').length;
    const faultCount = allInspections.filter(i => i.status === '고장').length;
    
    document.getElementById('totalInspections').textContent = totalInspections;
    document.getElementById('normalCount').textContent = normalCount;
    document.getElementById('warningCount').textContent = warningCount;
    document.getElementById('faultCount').textContent = faultCount;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('periodFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('excelDownloadBtn').addEventListener('click', downloadExcel);
}

// 필터 적용
function applyFilters() {
    const period = document.getElementById('periodFilter').value;
    const status = document.getElementById('statusFilter').value;
    const type = document.getElementById('typeFilter').value;
    
    // 기간 필터 계산
    let startDate = null;
    const now = new Date();
    
    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case 'all':
        default:
            startDate = null;
    }
    
    // 필터링
    filteredInspections = allInspections.filter(inspection => {
        // 기간 필터
        if (startDate) {
            const inspectionDate = inspection.inspection_date?.toDate ? 
                inspection.inspection_date.toDate() : 
                new Date(inspection.inspection_date);
            if (inspectionDate < startDate) return false;
        }
        
        // 상태 필터
        if (status && inspection.status !== status) return false;
        
        // 점검 유형 필터
        if (type && inspection.inspection_type !== type) return false;
        
        return true;
    });
    
    // 최신순 정렬
    filteredInspections.sort((a, b) => {
        const dateA = a.inspection_date?.toDate ? a.inspection_date.toDate() : new Date(a.inspection_date);
        const dateB = b.inspection_date?.toDate ? b.inspection_date.toDate() : new Date(b.inspection_date);
        return dateB - dateA;
    });
    
    displayHistory();
}

// 정비내역 표시
function displayHistory() {
    const historyTimeline = document.getElementById('historyTimeline');
    const historyCount = document.getElementById('historyCount');
    const noHistory = document.getElementById('noHistory');
    
    historyCount.textContent = filteredInspections.length;
    
    if (filteredInspections.length === 0) {
        historyTimeline.style.display = 'none';
        noHistory.style.display = 'block';
        return;
    }
    
    historyTimeline.style.display = 'flex';
    noHistory.style.display = 'none';
    
    historyTimeline.innerHTML = filteredInspections.map(inspection => {
        const inspectionDate = inspection.inspection_date?.toDate ? 
            inspection.inspection_date.toDate() : 
            new Date(inspection.inspection_date);
        
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <div class="history-date-time">
                        <i class="fas fa-calendar-alt"></i>
                        ${formatDateTime(inspectionDate)}
                    </div>
                    <div class="history-status-badge status-${inspection.status}">
                        <i class="fas fa-circle"></i>
                        ${inspection.status}
                    </div>
                </div>
                <div class="history-item-info">
                    <div class="history-info-item">
                        <div class="history-info-label">점검 유형</div>
                        <div class="history-info-value">${inspection.inspection_type}</div>
                    </div>
                    <div class="history-info-item">
                        <div class="history-info-label">점검자</div>
                        <div class="history-info-value">${inspection.inspector_name}</div>
                    </div>
                </div>
                ${inspection.notes ? `
                    <div class="history-notes">
                        <i class="fas fa-comment-dots"></i>
                        <strong>특이사항:</strong> ${inspection.notes}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 엑셀 다운로드
function downloadExcel() {
    if (filteredInspections.length === 0) {
        alert('다운로드할 데이터가 없습니다.');
        return;
    }
    
    console.log('📥 엑셀 다운로드 시작...');
    
    // 엑셀 데이터 준비
    const excelData = filteredInspections.map(insp => {
        const inspectionDate = insp.inspection_date?.toDate ? 
            insp.inspection_date.toDate() : 
            new Date(insp.inspection_date);
        
        return {
            '점검일시': inspectionDate.toLocaleString('ko-KR'),
            '점검자명': insp.inspector_name || '-',
            '점검유형': insp.inspection_type || '-',
            '장비ID': equipment.id || '-',
            '장비종류': equipment.equipment_type || '-',
            '모델명': equipment.model || '-',
            '위치': `${site?.site_name || ''} > ${building?.building_name || ''} > ${equipment.floor}층 ${equipment.location}`,
            '상태': insp.status || '-',
            '실내온도(℃)': insp.indoor_temperature || '-',
            '설정온도(℃)': insp.set_temperature || '-',
            '냉매고압(kgf/cm²)': insp.high_pressure || '-',
            '냉매저압(kgf/cm²)': insp.low_pressure || '-',
            'R상전류(A)': insp.current_r || '-',
            'S상전류(A)': insp.current_s || '-',
            'T상전류(A)': insp.current_t || '-',
            '진동(mm/s)': insp.vibration || '-',
            '소음(dB)': insp.noise || '-',
            '청결상태': insp.clean_status || '-',
            '필터상태': insp.filter_status || '-',
            '특이사항': insp.notes || '-'
        };
    });
    
    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // 열 너비 설정
    ws['!cols'] = [
        { wch: 20 }, // 점검일시
        { wch: 10 }, // 점검자명
        { wch: 10 }, // 점검유형
        { wch: 12 }, // 장비ID
        { wch: 12 }, // 장비종류
        { wch: 20 }, // 모델명
        { wch: 40 }, // 위치
        { wch: 8 },  // 상태
        { wch: 12 }, // 실내온도
        { wch: 12 }, // 설정온도
        { wch: 15 }, // 냉매고압
        { wch: 15 }, // 냉매저압
        { wch: 12 }, // R상전류
        { wch: 12 }, // S상전류
        { wch: 12 }, // T상전류
        { wch: 12 }, // 진동
        { wch: 10 }, // 소음
        { wch: 10 }, // 청결상태
        { wch: 10 }, // 필터상태
        { wch: 30 }  // 특이사항
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '정비내역');
    
    // 파일명 생성
    const today = new Date();
    const filename = `장비정비내역_${equipment.id}_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    
    // 다운로드
    XLSX.writeFile(wb, filename);
    
    console.log(`✅ 엑셀 다운로드 완료: ${filename}`);
}

// 날짜 포맷팅
function formatDate(date) {
    if (!date) return '-';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('ko-KR');
}

function formatDateTime(date) {
    if (!date) return '-';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 로딩 표시
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const equipmentInfoCard = document.getElementById('equipmentInfoCard');
    const statsGrid = document.querySelector('.stats-grid');
    const filterActionBar = document.querySelector('.filter-action-bar');
    const historySection = document.querySelector('.history-section');
    
    if (show) {
        loadingIndicator.style.display = 'block';
        equipmentInfoCard.style.display = 'none';
        statsGrid.style.display = 'none';
        filterActionBar.style.display = 'none';
        historySection.style.display = 'none';
    } else {
        loadingIndicator.style.display = 'none';
        equipmentInfoCard.style.display = 'block';
        statsGrid.style.display = 'grid';
        filterActionBar.style.display = 'flex';
        historySection.style.display = 'block';
    }
}
