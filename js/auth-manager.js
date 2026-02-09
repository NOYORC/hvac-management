// Firebase Authentication Manager
// 사용자 인증 및 세션 관리

// Firebase Auth 함수들
let authFunctions = null;

async function getAuthFunctions() {
    if (!authFunctions) {
        const module = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
        authFunctions = {
            getAuth: module.getAuth,
            signInWithEmailAndPassword: module.signInWithEmailAndPassword,
            signOut: module.signOut,
            onAuthStateChanged: module.onAuthStateChanged,
            createUserWithEmailAndPassword: module.createUserWithEmailAndPassword
        };
    }
    return authFunctions;
}

// 사용자 역할
const USER_ROLES = {
    INSPECTOR: 'inspector',
    MANAGER: 'manager', 
    ADMIN: 'admin'
};

// 페이지 접근 권한 설정
const PAGE_PERMISSIONS = {
    'inspection.html': [USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'qr-scanner.html': [USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'dashboard.html': [USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'admin.html': [USER_ROLES.ADMIN],
    'equipment-list.html': [USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'equipment-search.html': [USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'equipment-history.html': [USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN]
};

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.initPromise = null;
    }

    // Firebase Auth 초기화
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                const { getAuth, onAuthStateChanged } = await getAuthFunctions();
                this.auth = getAuth();
                
                // 인증 상태 변경 리스너
                return new Promise((resolve) => {
                    onAuthStateChanged(this.auth, async (user) => {
                        if (user) {
                            // 사용자 역할 정보 가져오기
                            const userRole = await this.getUserRole(user.uid);
                            this.currentUser = {
                                uid: user.uid,
                                email: user.email,
                                name: user.displayName || user.email.split('@')[0],
                                role: userRole,
                                loginTime: new Date().toISOString()
                            };
                            
                            // 세션 스토리지에 저장
                            sessionStorage.setItem('auth_user', JSON.stringify(this.currentUser));
                            console.log('✅ 사용자 로그인:', this.currentUser);
                        } else {
                            this.currentUser = null;
                            sessionStorage.removeItem('auth_user');
                            console.log('❌ 사용자 로그아웃');
                        }
                        resolve();
                    });
                });
            } catch (error) {
                console.error('❌ Auth 초기화 실패:', error);
                throw error;
            }
        })();

        return this.initPromise;
    }

    // 사용자 역할 가져오기 (Firestore에서)
    async getUserRole(uid) {
        try {
            if (!window.FirestoreHelper) {
                console.warn('⚠️ FirestoreHelper 없음, 기본 역할 반환');
                return USER_ROLES.INSPECTOR;
            }

            const result = await window.FirestoreHelper.getDocument('users', uid);
            if (result.success && result.data) {
                return result.data.role || USER_ROLES.INSPECTOR;
            }
            
            // 사용자 문서가 없으면 기본 역할
            return USER_ROLES.INSPECTOR;
        } catch (error) {
            console.error('역할 조회 오류:', error);
            return USER_ROLES.INSPECTOR;
        }
    }

    // 로그인
    async login(email, password) {
        try {
            const { signInWithEmailAndPassword } = await getAuthFunctions();
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            
            // 사용자 정보는 onAuthStateChanged에서 자동 설정됨
            await new Promise(resolve => setTimeout(resolve, 500)); // 상태 업데이트 대기
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('로그인 실패:', error);
            
            let errorMessage = '로그인에 실패했습니다.';
            if (error.code === 'auth/user-not-found') {
                errorMessage = '등록되지 않은 사용자입니다.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = '비밀번호가 일치하지 않습니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '올바른 이메일 형식이 아닙니다.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    // 로그아웃
    async logout() {
        try {
            const { signOut } = await getAuthFunctions();
            await signOut(this.auth);
            this.currentUser = null;
            sessionStorage.removeItem('auth_user');
            return { success: true };
        } catch (error) {
            console.error('로그아웃 실패:', error);
            return { success: false, error: error.message };
        }
    }

    // 현재 사용자 정보
    getCurrentUser() {
        if (!this.currentUser) {
            // 세션 스토리지에서 복원 시도
            const stored = sessionStorage.getItem('auth_user');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    // 로그인 여부 확인
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    // 역할 확인
    hasRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    }

    // 페이지 접근 권한 확인
    canAccessPage(pageName) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const permissions = PAGE_PERMISSIONS[pageName];
        if (!permissions) return true; // 제한 없는 페이지

        return permissions.includes(user.role);
    }

    // 보호된 페이지 체크 (리다이렉트 포함)
    async checkPageAccess() {
        // 현재 페이지 파일명 가져오기
        const currentPage = window.location.pathname.split('/').pop();
        
        // 로그인 페이지와 메인 페이지는 체크 안 함
        if (currentPage === 'login.html' || currentPage === 'index.html' || currentPage === '') {
            return true;
        }

        // 로그인 확인
        if (!this.isLoggedIn()) {
            console.warn('⚠️ 인증 필요:', currentPage);
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return false;
        }

        // 권한 확인
        if (!this.canAccessPage(currentPage)) {
            console.warn('⚠️ 권한 없음:', currentPage, '현재 역할:', this.getCurrentUser().role);
            alert('접근 권한이 없습니다.');
            window.location.href = 'index.html';
            return false;
        }

        return true;
    }

    // 역할 텍스트 가져오기
    getRoleText(role) {
        const roleTexts = {
            [USER_ROLES.INSPECTOR]: '점검자',
            [USER_ROLES.MANAGER]: '관리자',
            [USER_ROLES.ADMIN]: '시스템 관리자'
        };
        return roleTexts[role] || '사용자';
    }

    // 사용자 생성 (관리자 전용)
    async createUser(email, password, userData) {
        try {
            const { createUserWithEmailAndPassword } = await getAuthFunctions();
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            
            // Firestore에 사용자 정보 저장
            const userDoc = {
                email: email,
                name: userData.name || email.split('@')[0],
                role: userData.role || USER_ROLES.INSPECTOR,
                created_at: new Date().toISOString(),
                created_by: this.getCurrentUser()?.uid || 'system'
            };

            await window.FirestoreHelper.setDocument('users', userCredential.user.uid, userDoc);
            
            return { success: true, uid: userCredential.user.uid };
        } catch (error) {
            console.error('사용자 생성 실패:', error);
            
            let errorMessage = '사용자 생성에 실패했습니다.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = '이미 등록된 이메일입니다.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.';
            }
            
            return { success: false, error: errorMessage };
        }
    }
}

// 전역 인스턴스
const authManager = new AuthManager();

// 전역 객체로 내보내기
window.AuthManager = authManager;
window.USER_ROLES = USER_ROLES;

console.log('✅ AuthManager 로드 완료');
