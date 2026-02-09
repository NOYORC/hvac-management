// 보호된 페이지 인증 체크 스크립트
// 모든 보호된 페이지의 <head>에 포함시킬 것

(async function() {
    console.log('🔒 페이지 접근 권한 체크 시작');
    
    // Firebase 초기화 대기
    await waitForFirebase();
    
    // AuthManager 초기화 대기
    await waitForAuth();
    
    // 페이지 접근 권한 체크
    const hasAccess = await window.AuthManager.checkPageAccess();
    
    if (!hasAccess) {
        // checkPageAccess에서 이미 리다이렉트 처리
        console.log('❌ 페이지 접근 거부');
        return;
    }
    
    console.log('✅ 페이지 접근 허용');
})();

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
