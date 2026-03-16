// 전역 변수
let allSites = [];
let allBuildings = [];
let isRefreshing = false; // 새로고침 중복 방지

// 대시보드 새로고침 (캐시 무시하고 최신 데이터 가져오기)
async function refreshDashboard() {
    if (isRefreshing) {
        console.log('⚠️ 이미 새로고침 중입니다...');
        return;
    }
    
    isRefreshing = true;
    const refreshBtn = document.getElementById('refreshBtn');
    
    try {
        // 버튼 상태 변경
        if (refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 새로고침 중...';
        }
        
        console.log('🔄 대시보드 강제 새로고침 시작...');
        
        // 모든 캐시 삭제
        window.CacheHelper.clearAllCache();
        console.log('🗑️ 모든 캐시 삭제 완료');
        
        // 현장 필터 새로고침
        await loadSiteFilter();
        
        // 대시보드 데이터 새로고침 (forceRefresh = true)
        await loadDashboardData(true);
        
        console.log('✅ 대시보드 새로고침 완료');
        
        // 성공 알림 (선택적)
        showRefreshSuccess();
        
    } catch (error) {
        console.error('❌ 새로고침 오류:', error);
        alert('데이터 새로고침 중 오류가 발생했습니다.');
    } finally {
        isRefreshing = false;
        
        // 버튼 상태 복원
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 새로고침';
        }
    }
}

// 새로고침 성공 알림
function showRefreshSuccess() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>최신 데이터로 업데이트되었습니다</span>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 애니메이션 CSS 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

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
async function loadDashboardData(forceRefresh = false) {
    try {
        // console.log('📊 대시보드 데이터 로드 시작...');
        
        // 필터 값 가져오기
        const period = document.getElementById('periodFilter').value;
        const siteId = document.getElementById('siteFilterDash').value;
        const status = document.getElementById('statusFilter').value;

        // 점검 데이터 가져오기 (forceRefresh 옵션 전달)
        const inspectionsData = await window.CachedFirestoreHelper.getAllDocuments('inspections', forceRefresh);
        
        // 장비 데이터 가져오기 (forceRefresh 옵션 전달)
        const equipmentData = await window.CachedFirestoreHelper.getAllDocuments('equipment', forceRefresh);
        
        // 건물 데이터 가져오기 (위치 표시용, forceRefresh 옵션 전달)
        const buildingsData = await window.CachedFirestoreHelper.getAllDocuments('buildings', forceRefresh);
        allBuildings = buildingsData.data || [];

        let inspections = inspectionsData.data || [];
        const equipment = equipmentData.data || [];
        
        // 디버깅: 첫 번째 점검 데이터의 equipment_id 확인
        if (inspections.length > 0) {
            console.log('Sample inspection data:', {
                id: inspections[0].id,
                equipment_id: inspections[0].equipment_id,
                keys: Object.keys(inspections[0])
            });
        }
        
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
        
        // 주의와 경고를 하나로 통합
        const statusCounts = {
            '정상': inspections.filter(i => i.status === '정상').length,
            '주의': inspections.filter(i => i.status === '주의' || i.status === '경고').length,
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
                    backgroundColor: ['#4CAF50', '#FF9800', '#F44336']
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
        
        // 차트 요약 통계 업데이트
        updateChartSummary(statusCounts, inspections.length);
        
        // console.log('✅ 상태 차트 생성 완료');
    } catch (error) {
        console.error('❌ 상태 차트 업데이트 오류:', error);
        console.error('오류 스택:', error.stack);
    }
}

// 차트 요약 통계 업데이트
function updateChartSummary(statusCounts, total) {
    const summaryContainer = document.getElementById('chartSummary');
    if (!summaryContainer) return;
    
    const colors = {
        '정상': '#4CAF50',
        '주의': '#FF9800',
        '고장': '#F44336'
    };
    
    const summaryHTML = Object.entries(statusCounts).map(([status, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        return `
            <div class="summary-item">
                <div class="summary-color" style="background-color: ${colors[status]}"></div>
                <div class="summary-info">
                    <div class="summary-label">${status}</div>
                    <div class="summary-value">${count}<span class="summary-percent">(${percentage}%)</span></div>
                </div>
            </div>
        `;
    }).join('');
    
    summaryContainer.innerHTML = summaryHTML;
}

// 점검 추이, 장비 유형별, 현장별 차트는 제거되었습니다

// 더보기 기능 상태 관리
let alertShowAll = false;
let recentShowAll = false;
const INITIAL_DISPLAY_COUNT = 5;

// 이상 장비 목록 업데이트
function updateAlertList(inspections, equipment) {
    const tbody = document.querySelector('#alertInspections tbody');
    const cardsContainer = document.getElementById('alertCards');
    const showMoreContainer = document.getElementById('alertShowMoreContainer');
    const showMoreBtn = document.getElementById('alertShowMoreBtn');
    
    // 각 장비의 최신 점검 상태만 가져오기
    const latestInspectionsByEquipment = getLatestInspectionsByEquipment(inspections);
    
    // 주의/경고/고장인 장비만 필터링
    const alerts = latestInspectionsByEquipment.filter(insp => 
        insp.status === '주의' || insp.status === '경고' || insp.status === '고장'
    );
    
    // 최신순 정렬
    const sortedAlerts = alerts.sort((a, b) => {
        const dateA = a.inspection_date && a.inspection_date.toDate ? a.inspection_date.toDate() : new Date(a.inspection_date);
        const dateB = b.inspection_date && b.inspection_date.toDate ? b.inspection_date.toDate() : new Date(b.inspection_date);
        return dateB - dateA;
    });

    if (sortedAlerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">주의가 필요한 장비가 없습니다.</td></tr>';
        if (cardsContainer) {
            cardsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">주의가 필요한 장비가 없습니다.</p>';
        }
        if (showMoreContainer) showMoreContainer.style.display = 'none';
        return;
    }

    const equipmentMap = {};
    equipment.forEach(eq => {
        equipmentMap[eq.id] = eq;
    });

    // 더보기 컨테이너 및 버튼 표시 여부
    if (showMoreContainer && showMoreBtn) {
        if (sortedAlerts.length > INITIAL_DISPLAY_COUNT) {
            showMoreContainer.style.display = 'flex';
        } else {
            showMoreContainer.style.display = 'none';
        }
        
        // 버튼 클릭 이벤트 (중복 방지)
        showMoreBtn.onclick = null;
        showMoreBtn.onclick = function() {
            alertShowAll = !alertShowAll;
            this.classList.toggle('expanded', alertShowAll);
            
            // 버튼 텍스트 변경
            const btnText = this.querySelector('.btn-text');
            if (alertShowAll) {
                btnText.textContent = '접기';
            } else {
                btnText.textContent = '내역 더보기';
            }
            
            updateAlertDisplay(sortedAlerts, equipmentMap, tbody, cardsContainer);
        };
    }

    // 초기 표시
    updateAlertDisplay(sortedAlerts, equipmentMap, tbody, cardsContainer);
}

// 각 장비의 최신 점검 상태만 가져오기
function getLatestInspectionsByEquipment(inspections) {
    const latestMap = {};
    
    inspections.forEach(insp => {
        const equipmentId = insp.equipment_id;
        if (!equipmentId) return;
        
        const inspDate = insp.inspection_date && insp.inspection_date.toDate ? 
            insp.inspection_date.toDate() : new Date(insp.inspection_date);
        
        if (!latestMap[equipmentId] || 
            inspDate > (latestMap[equipmentId].inspection_date.toDate ? 
                latestMap[equipmentId].inspection_date.toDate() : 
                new Date(latestMap[equipmentId].inspection_date))) {
            latestMap[equipmentId] = insp;
        }
    });
    
    return Object.values(latestMap);
}

// 주의 장비 표시 업데이트
function updateAlertDisplay(sortedAlerts, equipmentMap, tbody, cardsContainer) {
    const displayCount = alertShowAll ? sortedAlerts.length : INITIAL_DISPLAY_COUNT;
    const displayAlerts = sortedAlerts.slice(0, displayCount);
    
    // 데스크톱 테이블
    tbody.innerHTML = displayAlerts.map((insp, index) => {
        const eq = equipmentMap[insp.equipment_id] || {};
        const statusColor = getStatusColor(insp.status);
        const formattedDate = formatDate(insp.inspection_date);
        const fullLocation = eq.id ? getFullLocation(eq) : '-';
        const equipmentId = insp.equipment_id || '';
        
        return `
            <tr class="clickable-row" onclick="goToEquipmentHistory('${equipmentId}')" title="클릭하여 정비내역 보기" data-equipment-id="${equipmentId}">
                <td>${formattedDate}</td>
                <td>${insp.inspector_name}</td>
                <td>${eq.equipment_type || '알 수 없음'}<br><small>${eq.model || '-'}</small></td>
                <td>${fullLocation}</td>
                <td><span class="status-badge" style="background-color: ${statusColor}">${insp.status}</span></td>
                <td>${insp.notes || '-'}</td>
            </tr>
        `;
    }).join('');
    
    // 모바일 카드
    if (cardsContainer) {
        cardsContainer.innerHTML = displayAlerts.map(insp => {
            const eq = equipmentMap[insp.equipment_id] || {};
            const statusColor = getStatusColor(insp.status);
            const fullLocation = eq.id ? getFullLocation(eq) : '-';
            const equipmentId = insp.equipment_id || '';
            
            // 날짜와 시간 분리
            let dateStr = '-', timeStr = '-';
            if (insp.inspection_date) {
                let d;
                if (insp.inspection_date.toDate) {
                    d = insp.inspection_date.toDate();
                } else if (typeof insp.inspection_date === 'string') {
                    d = new Date(insp.inspection_date);
                } else if (insp.inspection_date instanceof Date) {
                    d = insp.inspection_date;
                }
                
                if (d && !isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('ko-KR');
                    timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                }
            }
            
            return `
                <div class="inspection-card ${equipmentId ? 'clickable' : ''}" onclick="${equipmentId ? `goToEquipmentHistory('${equipmentId}')` : ''}" data-equipment-id="${equipmentId}">
                    <div class="inspection-card-header">
                        <div class="inspection-datetime">
                            <div class="inspection-date"><i class="fas fa-calendar"></i> ${dateStr}</div>
                            <div class="inspection-time"><i class="fas fa-clock"></i> ${timeStr}</div>
                        </div>
                        <span class="status-badge" style="background-color: ${statusColor}">${insp.status}</span>
                    </div>
                    <div class="inspection-card-body">
                        <div class="inspection-row">
                            <i class="fas fa-user"></i>
                            <span class="inspection-label">점검자</span>
                            <span class="inspection-value">${insp.inspector_name}</span>
                        </div>
                        <div class="inspection-row">
                            <i class="fas fa-cog"></i>
                            <span class="inspection-label">장비</span>
                            <span class="inspection-value">
                                <span class="inspection-equipment">${eq.equipment_type || '알 수 없음'}</span>
                                <span class="inspection-model">${eq.model || '-'}</span>
                            </span>
                        </div>
                        <div class="inspection-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span class="inspection-label">위치</span>
                            <span class="inspection-value">${fullLocation}</span>
                        </div>
                        ${insp.notes ? `
                        <div class="inspection-notes">
                            <i class="fas fa-comment-dots"></i> ${insp.notes}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 최근 점검 내역 업데이트
function updateRecentInspections(inspections, equipment) {
    const tbody = document.querySelector('#recentInspections tbody');
    const cardsContainer = document.getElementById('inspectionCards');
    const showMoreContainer = document.getElementById('recentShowMoreContainer');
    const showMoreBtn = document.getElementById('recentShowMoreBtn');
    
    if (inspections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">점검 내역이 없습니다.</td></tr>';
        if (cardsContainer) {
            cardsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">점검 내역이 없습니다.</p>';
        }
        if (showMoreContainer) showMoreContainer.style.display = 'none';
        return;
    }

    const equipmentMap = {};
    equipment.forEach(eq => {
        equipmentMap[eq.id] = eq;
    });

    // 최신순 정렬
    const recentInspections = inspections
        .sort((a, b) => {
            const dateA = a.inspection_date && a.inspection_date.toDate ? a.inspection_date.toDate() : new Date(a.inspection_date);
            const dateB = b.inspection_date && b.inspection_date.toDate ? b.inspection_date.toDate() : new Date(b.inspection_date);
            return dateB - dateA;
        });

    // 더보기 컨테이너 및 버튼 표시 여부
    if (showMoreContainer && showMoreBtn) {
        if (recentInspections.length > INITIAL_DISPLAY_COUNT) {
            showMoreContainer.style.display = 'flex';
        } else {
            showMoreContainer.style.display = 'none';
        }
        
        // 버튼 클릭 이벤트 (중복 방지)
        showMoreBtn.onclick = null;
        showMoreBtn.onclick = function() {
            recentShowAll = !recentShowAll;
            this.classList.toggle('expanded', recentShowAll);
            
            // 버튼 텍스트 변경
            const btnText = this.querySelector('.btn-text');
            if (recentShowAll) {
                btnText.textContent = '접기';
            } else {
                btnText.textContent = '내역 더보기';
            }
            
            updateRecentDisplay(recentInspections, equipmentMap, tbody, cardsContainer);
        };
    }

    // 초기 표시
    updateRecentDisplay(recentInspections, equipmentMap, tbody, cardsContainer);
}

// 최근 점검 표시 업데이트
function updateRecentDisplay(recentInspections, equipmentMap, tbody, cardsContainer) {
    const displayCount = recentShowAll ? recentInspections.length : INITIAL_DISPLAY_COUNT;
    const displayInspections = recentInspections.slice(0, displayCount);

    // 데스크톱 테이블
    tbody.innerHTML = displayInspections.map(insp => {
        const eq = equipmentMap[insp.equipment_id] || {};
        const statusColor = getStatusColor(insp.status);
        const formattedDate = formatDate(insp.inspection_date);
        const fullLocation = eq.id ? getFullLocation(eq) : '-';
        
        // 디버깅: equipment_id 확인
        const equipmentId = insp.equipment_id || '';
        console.log('Recent inspection - inspection:', insp.id, 'equipment_id:', equipmentId);
        
        return `
            <tr class="clickable-row" onclick="goToEquipmentHistory('${equipmentId}')" title="클릭하여 정비내역 보기" data-equipment-id="${equipmentId}">
                <td>${formattedDate}</td>
                <td>${insp.inspector_name}</td>
                <td>${eq.equipment_type || '알 수 없음'}<br><small>${eq.model || '-'}</small></td>
                <td>${fullLocation}</td>
                <td><span class="status-badge" style="background-color: ${statusColor}">${insp.status}</span></td>
                <td>${insp.notes || '-'}</td>
            </tr>
        `;
    }).join('');
    
    // 모바일 카드
    if (cardsContainer) {
        cardsContainer.innerHTML = displayInspections.map(insp => {
            const eq = equipmentMap[insp.equipment_id] || {};
            const statusColor = getStatusColor(insp.status);
            const fullLocation = eq.id ? getFullLocation(eq) : '-';
            const equipmentId = insp.equipment_id || '';
            
            // 날짜와 시간 분리
            let dateStr = '-', timeStr = '-';
            if (insp.inspection_date) {
                let d;
                if (insp.inspection_date.toDate) {
                    d = insp.inspection_date.toDate();
                } else if (typeof insp.inspection_date === 'string') {
                    d = new Date(insp.inspection_date);
                } else if (insp.inspection_date instanceof Date) {
                    d = insp.inspection_date;
                }
                
                if (d && !isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('ko-KR');
                    timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                }
            }
            
            return `
                <div class="inspection-card ${equipmentId ? 'clickable' : ''}" onclick="${equipmentId ? `goToEquipmentHistory('${equipmentId}')` : ''}" data-equipment-id="${equipmentId}">
                    <div class="inspection-card-header">
                        <div class="inspection-datetime">
                            <div class="inspection-date"><i class="fas fa-calendar"></i> ${dateStr}</div>
                            <div class="inspection-time"><i class="fas fa-clock"></i> ${timeStr}</div>
                        </div>
                        <span class="status-badge" style="background-color: ${statusColor}">${insp.status}</span>
                    </div>
                    <div class="inspection-card-body">
                        <div class="inspection-row">
                            <i class="fas fa-user"></i>
                            <span class="inspection-label">점검자</span>
                            <span class="inspection-value">${insp.inspector_name}</span>
                        </div>
                        <div class="inspection-row">
                            <i class="fas fa-cog"></i>
                            <span class="inspection-label">장비</span>
                            <span class="inspection-value">
                                <span class="inspection-equipment">${eq.equipment_type || '알 수 없음'}</span>
                                <span class="inspection-model">${eq.model || '-'}</span>
                            </span>
                        </div>
                        <div class="inspection-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span class="inspection-label">위치</span>
                            <span class="inspection-value">${fullLocation}</span>
                        </div>
                        ${insp.notes ? `
                        <div class="inspection-notes">
                            <i class="fas fa-comment-dots"></i> ${insp.notes}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
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
    console.log('goToEquipmentHistory called with equipmentId:', equipmentId);
    
    if (!equipmentId || equipmentId === 'undefined' || equipmentId === 'null') {
        console.error('Invalid equipment_id:', equipmentId);
        alert('장비 정보를 찾을 수 없습니다.\n장비 ID가 누락되었습니다.');
        return;
    }
    
    console.log('Navigating to equipment-history.html with equipment_id:', equipmentId);
    // equipment-history.html로 이동 (URL 파라미터로 equipment_id 전달)
    window.location.href = `equipment-history.html?equipment_id=${encodeURIComponent(equipmentId)}`;
}
