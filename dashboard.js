
// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    loadSiteFilter();
    loadDashboardData();
    
    // 필터 변경 이벤트 리스너 등록
    document.getElementById('periodFilter').addEventListener('change', loadDashboardData);
    document.getElementById('siteFilterDash').addEventListener('change', loadDashboardData);
    document.getElementById('statusFilter').addEventListener('change', loadDashboardData);
});

// 현장 필터 로드
async function loadSiteFilter() {
    try {
        const response = await fetch(`${API_BASE}?action=list&table=sites`);
        const data = await response.json();
        
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
        // 필터 값 가져오기
        const period = document.getElementById('periodFilter').value;
        const siteId = document.getElementById('siteFilterDash').value;
        const status = document.getElementById('statusFilter').value;

        // 점검 데이터 가져오기
        const inspectionsResponse = await fetch(`${API_BASE}?action=list&table=inspections`);
        const inspectionsData = await inspectionsResponse.json();
        
        // 장비 데이터 가져오기
        const equipmentResponse = await fetch(`${API_BASE}?action=list&table=equipment`);
        const equipmentData = await equipmentResponse.json();

        let inspections = inspectionsData.data || [];
        const equipment = equipmentData.data || [];

        // 기간 필터링
        const now = new Date();
        inspections = inspections.filter(inspection => {
            const inspectionDate = new Date(inspection.inspection_date);
            
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

        // 통계 업데이트
        updateStatistics(inspections);

        // 차트 업데이트
        updateCharts(inspections, equipment);

        // 이상 장비 목록 업데이트
        updateAlertList(inspections, equipment);

        // 최근 점검 내역 업데이트
        updateRecentInspections(inspections, equipment);

    } catch (error) {
        console.error('대시보드 데이터 로드 오류:', error);
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

// 차트 업데이트
let statusChart, trendChart, equipmentTypeChart, siteChart;

function updateCharts(inspections, equipment) {
    // 상태 분포 차트
    updateStatusChart(inspections);
    
    // 점검 추이 차트
    updateTrendChart(inspections);
    
    // 장비 유형별 차트
    updateEquipmentTypeChart(inspections, equipment);
    
    // 현장별 차트
    updateSiteChart(inspections, equipment);
}

// 상태 분포 도넛 차트
function updateStatusChart(inspections) {
    const statusCounts = {
        '정상': inspections.filter(i => i.status === '정상').length,
        '주의': inspections.filter(i => i.status === '주의').length,
        '경고': inspections.filter(i => i.status === '경고').length,
        '고장': inspections.filter(i => i.status === '고장').length
    };

    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) {
        statusChart.destroy();
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
}

// 점검 추이 선 차트
function updateTrendChart(inspections) {
    // 최근 7일 데이터
    const last7Days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    const dailyCounts = last7Days.map(date => {
        return inspections.filter(insp => {
            const inspDate = new Date(insp.inspection_date).toISOString().split('T')[0];
            return inspDate === date;
        }).length;
    });

    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(date => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: [{
                label: '점검 수',
                data: dailyCounts,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 장비 유형별 바 차트
function updateEquipmentTypeChart(inspections, equipment) {
    const equipmentMap = {};
    equipment.forEach(eq => {
        equipmentMap[eq.id] = eq.equipment_type;
    });

    const typeCounts = {};
    inspections.forEach(insp => {
        const type = equipmentMap[insp.equipment_id] || '기타';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const ctx = document.getElementById('equipmentTypeChart').getContext('2d');
    
    if (equipmentTypeChart) {
        equipmentTypeChart.destroy();
    }

    equipmentTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                label: '점검 수',
                data: Object.values(typeCounts),
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 현장별 가로 바 차트
function updateSiteChart(inspections, equipment) {
    const equipmentMap = {};
    equipment.forEach(eq => {
        equipmentMap[eq.id] = eq.site_id;
    });

    const siteCounts = {};
    inspections.forEach(insp => {
        const siteId = equipmentMap[insp.equipment_id];
        siteCounts[siteId] = (siteCounts[siteId] || 0) + 1;
    });

    const ctx = document.getElementById('siteChart').getContext('2d');
    
    if (siteChart) {
        siteChart.destroy();
    }

    siteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(siteCounts),
            datasets: [{
                label: '점검 수',
                data: Object.values(siteCounts),
                backgroundColor: '#764ba2'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

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
            <div class="alert-item" style="border-left: 4px solid ${statusColor}">
                <div class="alert-header">
                    <span class="alert-equipment">${eq.equipment_type || '알 수 없음'} (${eq.model || '-'})</span>
                    <span class="alert-status" style="background-color: ${statusColor}">${insp.status}</span>
                </div>
                <div class="alert-info">
                    <i class="fas fa-map-marker-alt"></i> ${eq.location || '-'} (${eq.floor || '-'})
                </div>
                <div class="alert-info">
                    <i class="fas fa-exclamation-circle"></i> ${insp.notes || '특이사항 없음'}
                </div>
                <div class="alert-info">
                    <i class="fas fa-clock"></i> ${formatDate(insp.inspection_date)}
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
        .sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date))
        .slice(0, 10);

    tbody.innerHTML = recentInspections.map(insp => {
        const eq = equipmentMap[insp.equipment_id] || {};
        const statusColor = getStatusColor(insp.status);
        
        return `
            <tr>
                <td>${formatDate(insp.inspection_date)}</td>
                <td>${insp.inspector_name}</td>
                <td>${eq.equipment_type || '알 수 없음'}<br><small>${eq.model || '-'}</small></td>
                <td>${eq.location || '-'}<br><small>${eq.floor || '-'}</small></td>
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
