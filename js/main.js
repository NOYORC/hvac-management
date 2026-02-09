// 메인 페이지 스크립트
// Firebase Auth 기반 인증 시스템

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', async function() {
    // Firebase config & AuthManager 로드 대기
    await waitForFirebase();
    await waitForAuth();
    
    // 로그인 체크
    if (!window.AuthManager.isLoggedIn()) {
        console.log('⚠️ 로그인 필요, 로그인 페이지로 이동');
        window.location.href = 'login.html';
        return;
    }
    
    // 사용자 정보 표시
    displayUserInfo();
    
    // 관리자 메뉴 표시 (admin 전용)
    showAdminMenu();
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

// AuthManager 초기화 대기
async function waitForAuth() {
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

// 사용자 정보 표시
function displayUserInfo() {
    const user = window.AuthManager.getCurrentUser();
    if (!user) return;
    
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    
    if (userInfo && userName && userRole) {
        userName.textContent = user.name;
        userRole.textContent = window.AuthManager.getRoleText(user.role);
        userInfo.style.display = 'flex';
    }
}

// 관리자 메뉴 표시
function showAdminMenu() {
    const user = window.AuthManager.getCurrentUser();
    if (!user) return;
    
    if (user.role === window.USER_ROLES.ADMIN) {
        const adminCard = document.querySelector('.admin-only');
        if (adminCard) {
            adminCard.style.display = 'block';
        }
    }
}

// 로그아웃
async function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        const result = await window.AuthManager.logout();
        if (result.success) {
            window.location.href = 'login.html';
        }
    }
}

// 점검 페이지로 이동
function goToInspection() {
    if (window.AuthManager.canAccessPage('inspection.html')) {
        window.location.href = 'inspection.html';
    } else {
        alert('접근 권한이 없습니다.');
    }
}

// 대시보드로 이동
function goToDashboard() {
    if (window.AuthManager.canAccessPage('dashboard.html')) {
        window.location.href = 'dashboard.html';
    } else {
        alert('관리자 권한이 필요합니다.');
    }
}

// 관리자 페이지로 이동
function goToAdmin() {
    if (window.AuthManager.canAccessPage('admin.html')) {
        window.location.href = 'admin.html';
    } else {
        alert('시스템 관리자 권한이 필요합니다.');
    }
}

// QR 스캐너 열기
function openQRScanner() {
    if (window.AuthManager.canAccessPage('qr-scanner.html')) {
        window.location.href = 'qr-scanner.html';
    } else {
        alert('접근 권한이 없습니다.');
    }
}

// 날짜 포맷 함수
function formatDate(dateObj) {
    let date;
    // Firebase Timestamp 객체 처리
    if (dateObj && dateObj.toDate) {
        date = dateObj.toDate();
    } else if (typeof dateObj === 'string') {
        date = new Date(dateObj);
    } else {
        date = dateObj;
    }
    
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 상태에 따른 색상 반환
function getStatusColor(status) {
    const colors = {
        '정상': '#10b981',
        '주의': '#f59e0b',
        '경고': '#ef4444',
        '고장': '#dc2626'
    };
    return colors[status] || '#6b7280';
}

// 장비 종류에 따른 아이콘 반환
function getEquipmentIcon(type) {
    const icons = {
        'AHU(공조기)': 'fa-wind',
        'FCU(팬코일유닛)': 'fa-fan',
        '냉동기': 'fa-snowflake',
        '냉각탑': 'fa-building',
        '보일러': 'fa-fire',
        '펌프': 'fa-water',
        '송풍기': 'fa-wind',
        '배기팬': 'fa-fan'
    };
    return icons[type] || 'fa-cog';
}
