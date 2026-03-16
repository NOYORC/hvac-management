// 전역 변수
let allSites = [];
let allBuildings = [];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async function() {
    // console.log('📱 페이지 로드 시작');
    
    await waitForFirebase();
    await loadSiteFilter();
    
    // DOM이 완전히 렌더링될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await loadDashboardData();
    
    // 필터 변경 이벤트 리스너 등록
    document.getElementById('periodFilter').addEventListener('change', () => {
        // console.log('🔄 기간 필터 변경');
        loadDashboardData();
    });
    document.getElementById('siteFilterDash').addEventListener('change', () => {
        // console.log('🔄 현장 필터 변경');
        loadDashboardData();
    });
    document.getElementById('statusFilter').addEventListener('change', () => {
        // console.log('🔄 상태 필터 변경');
        loadDashboardData();
    });
    
    // console.log('✅ 페이지 로드 완료');
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

// 현장 필터 로드
async function loadSiteFilter() {
    try {
        const data = await window.CachedFirestoreHelper.getAllDocuments('sites');
        allSites = data.data || []; // 전역 변수에 저장
        
        const siteFilter = document.getElementById('siteFilterDash');
        siteFilter.innerHTML = '<option value="">전체</option>';
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(site => {
                const option = document.createElement('option');
                option.value = site.id;
                option.textContent = site.site_name;
                siteFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('현장 필터 로드 오류:', error);
    }
}

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        // console.log('📊 대시보드 데이터 로드 시작...');
        
        // 필터 값 가져오기
        const period = document.getElementById('periodFilter').value;
        const siteId = document.getElementById('siteFilterDash').value;
        const status = document.getElementById('statusFilter').value;

        // 점검 데이터 가져오기
        const inspectionsData = await window.CachedFirestoreHelper.getAllDocuments('inspections');
        
        // 장비 데이터 가져오기
        const equipmentData = await window.CachedFirestoreHelper.getAllDocuments('equipment');
        
        // 건물 데이터 가져오기 (위치 표시용)
        const buildingsData = await window.CachedFirestoreHelper.getAllDocuments('buildings');
        allBuildings = buildingsData.data || [];

        let inspections = inspectionsData.data || [];
        const equipment = equipmentData.data || [];
        
        // console.log(`📦 로드된 데이터: 점검 ${inspections.length}개, 장비 ${equipment.length}개`);

        // 기간 필터링
        const now = new Date();
        inspections = inspections.filter(inspection => {
            let inspectionDate;
            
            // Firebase Timestamp 처리
            if (inspection.inspection_date && typeof inspection.inspection_date.toDate === 'function') {
                inspectionDate = inspection.inspection_date.toDate();
            } else if (inspection.inspection_date) {
                inspectionDate = new Date(inspection.inspection_date);
            } else {
                // inspection_date가 없는 경우 제외
                return false;
            }
            
            // Invalid Date 체크
            if (isNaN(inspectionDate.getTime())) {
                console.error('❌ Invalid Date:', inspection.inspection_date, 'for inspection:', inspection.id);
                return false;
            }
            
            if (period === 'today') {
                return inspectionDate.toDateString() === now.toDateString();
            } else if (period === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return inspectionDate >= weekAgo;
            } else if (period === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return inspectionDate >= monthAgo;
            }
            
            return true;
        });

        // 현장 필터링
        if (siteId) {
            const siteEquipment = equipment.filter(eq => eq.site_id === siteId);
            const siteEquipmentIds = siteEquipment.map(eq => eq.id);
            inspections = inspections.filter(insp => siteEquipmentIds.includes(insp.equipment_id));
        }

        // 상태 필터링
        if (status) {
            inspections = inspections.filter(insp => insp.status === status);
        }
        
        // console.log(`✅ 필터링 후: ${inspections.length}개 점검`);

        // 통계 업데이트
        updateStatistics(inspections);

        // 차트 업데이트
        updateCharts(inspections, equipment);

        // 이상 장비 목록 업데이트
        updateAlertList(inspections, equipment);

        // 최근 점검 내역 업데이트
        updateRecentInspections(inspections, equipment);
        
        // console.log('✅ 대시보드 데이터 로드 완료');

    } catch (error) {
        console.error('❌ 대시보드 데이터 로드 오류:', error);
        console.error('오류 스택:', error.stack);
        
        // 사용자에게 오류 표시
        showErrorMessage('데이터를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }
}

// 통계 업데이트
function updateStatistics(inspections) {
    const total = inspections.length;
    const normal = inspections.filter(i => i.status === '정상').length;
    const warning = inspections.filter(i => i.status === '주의' || i.status === '경고').length;
    const failure = inspections.filter(i => i.status === '고장').length;

    document.getElementById('totalInspections').textContent = total;
    document.getElementById('normalCount').textContent = normal;
    document.getElementById('warningCount').textContent = warning;
    document.getElementById('failureCount').textContent = failure;
}

// 차트 업데이트 - 상태 차트만 유지
let statusChart;

function updateCharts(inspections, equipment) {
    try {
        // 상태 분포 차트만 업데이트
        updateStatusChart(inspections);
    } catch (error) {
        console.error('❌ 차트 업데이트 오류:', error);
    }
}

// 상태 분포 도넛 차트
function updateStatusChart(inspections) {
    try {
        const canvas = document.getElementById('statusChart');
        if (!canvas) {
            // console.warn('❌ statusChart 캔버스를 찾을 수 없습니다');
            return;
        }
        
        // 캔버스 크기 확인
        if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
            // console.warn(`❌ statusChart 크기가 0입니다: ${canvas.offsetWidth}x${canvas.offsetHeight}`);
            return;
        }
        
        const statusCounts = {
            '정상': inspections.filter(i => i.status === '정상').length,
            '주의': inspections.filter(i => i.status === '주의').length,
            '경고': inspections.filter(i => i.status === '경고').length,
            '고장': inspections.filter(i => i.status === '고장').length
        };
        
        // console.log('📊 상태 차트 데이터:', statusCounts);
        
        const ctx = canvas.getContext('2d');
        
        // 기존 차트 파괴
        if (statusChart) {
            statusChart.destroy();
            statusChart = null;
        }

        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#4CAF50', '#FF9800', '#F44336', '#9E9E9E']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // console.log('✅ 상태 차트 생성 완료');
    } catch (error) {
        console.error('❌ 상태 차트 업데이트 오류:', error);
        console.error('오류 스택:', error.stack);
    }
}

// 점검 추이, 장비 유형별, 현장별 차트는 제거되었습니다

// 이상 장비 목록 업데이트
function updateAlertList(inspections, equipment) {
    const alertList = document.getElementById('alertList');
    
    const alerts = inspections.filter(insp => 
        insp.status === '주의' || insp.status === '경고' || insp.status === '고장'
    );

    if (alerts.length === 0) {
        alertList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">이상 장비가 없습니다.</p>';
        return;
    }

    const equipmentMap = {};
    equipment.forEach(eq => {
        equipmentMap[eq.id] = eq;
    });

    alertList.innerHTML = alerts.map(insp => {
        const eq = equipmentMap[insp.equipment_id] || {};
        const statusColor = getStatusColor(insp.status);
        
        return `
            <div class="alert-item clickable" style="border-left: 4px solid ${statusColor}" onclick="goToEquipmentHistory('${insp.equipment_id}')">
                <div class="alert-header">
                    <span class="alert-equipment">${eq.equipment_type || '알 수 없음'} (${eq.model || '-'})</span>
                    <span class="alert-status" style="background-color: ${statusColor}">${insp.status}</span>
                </div>
                <div class="alert-info">
                    <i class="fas fa-map-marker-alt"></i> ${eq.location || '-'} (${eq.floor ? eq.floor + '층' : '-'})
                </div>
                <div class="alert-info">
                    <i class="fas fa-exclamation-circle"></i> ${insp.notes || (insp.inspection_type === '고장정비' ? '정비내용 없음' : '특이사항 없음')}
                </div>
                <div class="alert-info">
                    <i class="fas fa-clock"></i> ${formatDate(insp.inspection_date)}
                </div>
                <div class="alert-hint">
                    <i class="fas fa-hand-pointer"></i> 클릭하여 정비내역 보기
                </div>
            </div>
        `;
    }).join('');
}

// 최근 점검 내역 업데이트
function updateRecentInspections(inspections, equipment) {
    const tbody = document.querySelector('#recentInspections tbody');
    
    if (inspections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">점검 내역이 없습니다.</td></tr>';
        return;
    }

    const equipmentMap = {};
    equipment.forEach(eq => {
        equipmentMap[eq.id] = eq;
    });

    // 최근 10개만 표시
    const recentInspections = inspections
        .sort((a, b) => {
            const dateA = a.inspection_date && a.inspection_date.toDate ? a.inspection_date.toDate() : new Date(a.inspection_date);
            const dateB = b.inspection_date && b.inspection_date.toDate ? b.inspection_date.toDate() : new Date(b.inspection_date);
            return dateB - dateA;
        })
        .slice(0, 10);

    tbody.innerHTML = recentInspections.map(insp => {
        const eq = equipmentMap[insp.equipment_id] || {};
        const statusColor = getStatusColor(insp.status);
        const formattedDate = formatDate(insp.inspection_date);
        const fullLocation = eq.id ? getFullLocation(eq) : '-';
        
        return `
            <tr class="clickable-row" onclick="goToEquipmentHistory('${insp.equipment_id}')" title="클릭하여 정비내역 보기">
                <td>${formattedDate}</td>
                <td>${insp.inspector_name}</td>
                <td>${eq.equipment_type || '알 수 없음'}<br><small>${eq.model || '-'}</small></td>
                <td>${fullLocation}</td>
                <td><span class="status-badge" style="background-color: ${statusColor}">${insp.status}</span></td>
                <td>${insp.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

// 유틸리티 함수
function getStatusColor(status) {
    const colors = {
        '정상': '#4CAF50',
        '주의': '#FF9800',
        '경고': '#F44336',
        '고장': '#9E9E9E'
    };
    return colors[status] || '#2196F3';
}

function formatDate(date) {
    if (!date) return '-';
    
    let d;
    if (date && date.toDate) {
        // Firestore Timestamp
        d = date.toDate();
    } else if (date && typeof date === 'string') {
        // ISO 문자열
        d = new Date(date);
    } else if (date instanceof Date) {
        // Date 객체
        d = date;
    } else {
        // console.error('알 수 없는 날짜 형식:', date);
        return '-';
    }
    
    // Invalid Date 체크
    if (isNaN(d.getTime())) {
        // console.error('Invalid Date:', date);
        return '-';
    }
    
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

// 엑셀 다운로드 함수
let isDownloading = false; // 다운로드 중복 방지 플래그

// 오류 메시지 표시 함수
function showErrorMessage(message) {
    // 기존 오류 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 오류 메시지 생성
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 400px;
        font-size: 14px;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i> ${message}
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;float:right;cursor:pointer;font-size:18px;margin-left:10px;">&times;</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

async function downloadExcel() {
    // 중복 실행 방지
    if (isDownloading) {
        // console.log('⚠️ 이미 다운로드 중입니다...');
        return;
    }
    
    const downloadBtn = document.getElementById('downloadBtn');
    
    try {
        isDownloading = true;
        
        // 버튼 비활성화
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 다운로드 중...';
        }
        
        // console.log('📥 엑셀 다운로드 시작... (Timestamp:', Date.now(), ')');
        
        // 현재 필터링된 데이터 가져오기
        const filteredData = await getFilteredInspections();
        
        if (!filteredData || filteredData.length === 0) {
            alert('다운로드할 점검 데이터가 없습니다.');
            return;
        }
        
        // console.log(`📊 ${filteredData.length}개의 점검 기록 다운로드 준비 중...`);
        
        // 장비 정보 매핑
        const equipmentData = await window.CachedFirestoreHelper.getAllDocuments('equipment');
        const equipmentMap = {};
        if (equipmentData.data) {
            equipmentData.data.forEach(eq => {
                equipmentMap[eq.id] = eq;
            });
        }
        
        // 엑셀 데이터 변환
        const excelData = filteredData.map(insp => {
            const eq = equipmentMap[insp.equipment_id] || {};
            const inspDate = insp.inspection_date && insp.inspection_date.toDate ? 
                insp.inspection_date.toDate() : new Date(insp.inspection_date);
            const fullLocation = eq.id ? getFullLocation(eq) : '-';
            
            return {
                '점검일시': inspDate.toLocaleString('ko-KR'),
                '점검자명': insp.inspector_name || '-',
                '점검유형': insp.inspection_type || '-',
                '장비종류': eq.equipment_type || '-',
                '장비ID': insp.equipment_id || '-',
                '모델명': eq.model || '-',
                '위치': fullLocation,
                '상태': insp.status || '-',
                '실내온도(℃)': insp.indoor_temperature || '-',
                '설정온도(℃)': insp.set_temperature || '-',
                '냉매고압(kgf/cm²)': insp.high_pressure || '-',
                '냉매저압(kgf/cm²)': insp.low_pressure || '-',
                'R상전류(A)': insp.current_r || '-',
                'S상전류(A)': insp.current_s || '-',
                'T상전류(A)': insp.current_t || '-',
                '정비내용/특이사항': insp.notes || '-'
            };
        });
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // 컬럼 너비 설정
        const colWidths = [
            { wch: 20 },  // 점검일시
            { wch: 10 },  // 점검자명
            { wch: 10 },  // 점검유형
            { wch: 25 },  // 장비종류
            { wch: 12 },  // 장비ID
            { wch: 20 },  // 모델명
            { wch: 35 },  // 위치 (전체 위치 표시로 더 넓게)
            { wch: 8 },   // 상태
            { wch: 12 },  // 실내온도
            { wch: 12 },  // 설정온도
            { wch: 15 },  // 냉매고압
            { wch: 15 },  // 냉매저압
            { wch: 12 },  // R상전류
            { wch: 12 },  // S상전류
            { wch: 12 },  // T상전류
            { wch: 40 }   // 정비내용
        ];
        ws['!cols'] = colWidths;
        
        // 워크시트 추가
        XLSX.utils.book_append_sheet(wb, ws, '점검내역');
        
        // 파일명 생성 (현재 날짜 포함)
        const today = new Date();
        const fileName = `HVAC_점검내역_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
        
        // 엑셀 파일 다운로드
        // console.log(`📦 XLSX.writeFile 호출 전... 파일명: ${fileName}`);
        XLSX.writeFile(wb, fileName);
        // console.log(`📦 XLSX.writeFile 호출 후... 다운로드 완료!`);
        
        // console.log(`✅ 엑셀 다운로드 완료: ${fileName}`);
        alert(`✅ ${filteredData.length}개의 점검 기록이 다운로드되었습니다.`);
        
    } catch (error) {
        console.error('❌ 엑셀 다운로드 오류:', error);
        alert('엑셀 다운로드 중 오류가 발생했습니다.\n' + error.message);
    } finally {
        // 버튼 복원 및 다운로드 완료 후 플래그 해제
        setTimeout(() => {
            isDownloading = false;
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> 엑셀 다운로드';
            }
            // console.log('🔓 다운로드 잠금 해제');
        }, 1000);
    }
}

// 필터링된 점검 데이터 가져오기
async function getFilteredInspections() {
    try {
        // 모든 점검 데이터 가져오기
        const inspectionsData = await window.CachedFirestoreHelper.getAllDocuments('inspections');
        
        if (!inspectionsData.success || !inspectionsData.data) {
            return [];
        }
        
        let filtered = inspectionsData.data;
        
        // 기간 필터
        const periodFilter = document.getElementById('periodFilter').value;
        const now = new Date();
        
        if (periodFilter !== 'all') {
            filtered = filtered.filter(insp => {
                const inspDate = insp.inspection_date && insp.inspection_date.toDate ? 
                    insp.inspection_date.toDate() : new Date(insp.inspection_date);
                
                const diffDays = Math.floor((now - inspDate) / (1000 * 60 * 60 * 24));
                
                switch(periodFilter) {
                    case 'today':
                        return diffDays === 0;
                    case 'week':
                        return diffDays <= 7;
                    case 'month':
                        return diffDays <= 30;
                    default:
                        return true;
                }
            });
        }
        
        // 상태 필터
        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter) {
            filtered = filtered.filter(insp => insp.status === statusFilter);
        }
        
        // 현장 필터 (장비 ID를 통해)
        const siteFilter = document.getElementById('siteFilterDash').value;
        if (siteFilter) {
            const equipmentData = await window.CachedFirestoreHelper.getAllDocuments('equipment');
            const siteEquipmentIds = equipmentData.data
                .filter(eq => eq.site_id === siteFilter)
                .map(eq => eq.id);
            
            filtered = filtered.filter(insp => siteEquipmentIds.includes(insp.equipment_id));
        }
        
        return filtered;
        
    } catch (error) {
        console.error('필터링된 데이터 가져오기 오류:', error);
        return [];
    }
}

// 장비 전체 위치 정보 생성 헬퍼 함수
function getFullLocation(equipment) {
    const site = allSites.find(s => s.id === equipment.site_id);
    const building = allBuildings.find(b => b.id === equipment.building_id);
    
    const parts = [];
    if (site) parts.push(site.site_name);
    if (building) parts.push(building.building_name);
    if (equipment.floor) parts.push(equipment.floor);
    if (equipment.location) parts.push(equipment.location);
    
    return parts.join(' ') || equipment.location || '위치 정보 없음';
}

// 정비내역 페이지로 이동
function goToEquipmentHistory(equipmentId) {
    if (!equipmentId) {
        alert('장비 정보를 찾을 수 없습니다.');
        return;
    }
    
    // equipment-history.html로 이동 (URL 파라미터로 equipment_id 전달)
    window.location.href = `equipment-history.html?equipment_id=${equipmentId}`;
}
