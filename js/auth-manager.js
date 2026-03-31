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

// 사용자 역할 (계층 구조: viewer < inspector < manager < admin)
const USER_ROLES = {
    VIEWER: 'viewer',       // 조회자 (기존 manager 역할) - 점검 내역 조회만
    INSPECTOR: 'inspector', // 점검자 - 점검 수행 + 조회 + 문제 장비 재점검
    MANAGER: 'manager',     // 관리자 - 장비/사이트 관리 + 모든 조회
    ADMIN: 'admin'          // 시스템 관리자 - 모든 권한
};

// 페이지 접근 권한 설정
const PAGE_PERMISSIONS = {
    'inspection.html': [USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN], // viewer 제외
    'qr-scanner.html': [USER_ROLES.VIEWER, USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN], // viewer는 조회만
    'dashboard.html': [USER_ROLES.VIEWER, USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'admin.html': [USER_ROLES.ADMIN],
    'equipment-list.html': [USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'equipment-search.html': [USER_ROLES.VIEWER, USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'equipment-history.html': [USER_ROLES.VIEWER, USER_ROLES.INSPECTOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN],
    'user-approval.html': [USER_ROLES.ADMIN] // 사용자 승인 관리
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
                            
                            // role이 null이면 로그인 차단
                            if (userRole === null) {
                                console.error('🚫 역할 정보가 없는 사용자, 로그인 차단');
                                this.currentUser = null;
                                sessionStorage.removeItem('auth_user');
                                
                                // 로그아웃 처리
                                const { signOut } = await getAuthFunctions();
                                await signOut(this.auth);
                                
                                resolve();
                                return;
                            }
                            
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
            console.log('🔍 사용자 역할 조회 시작, UID:', uid);
            
            if (!window.FirestoreHelper) {
                console.warn('⚠️ FirestoreHelper 없음, 기본 역할 반환');
                return USER_ROLES.INSPECTOR;
            }

            const result = await window.FirestoreHelper.getDocument('users', uid);
            console.log('📄 Firestore 조회 결과:', result);
            
            if (result.success && result.data) {
                // 승인 상태 확인 (status 필드)
                const status = result.data.status || 'active';
                if (status === 'pending') {
                    console.warn('⏳ 승인 대기 중인 사용자');
                    alert('⏳ 계정 승인 대기 중\n\n관리자 승인 후 로그인이 가능합니다.\n승인 완료 시 이메일로 알림을 받게 됩니다.');
                    return null; // 승인 대기 중이면 null 반환
                }
                
                const role = result.data.role || USER_ROLES.INSPECTOR;
                console.log('✅ 사용자 역할:', role, '/ 상태:', status);
                return role;
            }
            
            // 사용자 문서가 없으면 경고 표시
            console.error('🚨 심각한 문제: 사용자 문서가 Firestore에 존재하지 않습니다!');
            console.error('이는 회원가입 시 Firestore 저장에 실패했거나, users 컬렉션이 삭제된 경우입니다.');
            console.error('해당 사용자는 역할 정보가 없어 시스템을 정상적으로 사용할 수 없습니다.');
            
            // 사용자에게 경고 알림 (한 번만 표시)
            if (!window._missingUserDocWarningShown) {
                window._missingUserDocWarningShown = true;
                alert('⚠️ 계정 설정 오류\n\n사용자 정보가 데이터베이스에 없습니다.\n회원가입이 완료되지 않았거나 데이터가 손실되었을 수 있습니다.\n\n관리자에게 문의하거나 계정을 재생성해주세요.');
            }
            
            return null; // role이 없음을 명시적으로 표시
        } catch (error) {
            console.error('❌ 역할 조회 오류:', error);
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
        
        console.log('🔍 페이지 접근 체크:', currentPage);
        
        // 로그인 페이지와 메인 페이지는 체크 안 함
        if (currentPage === 'login.html' || currentPage === 'index.html' || currentPage === '') {
            console.log('✅ 공개 페이지, 접근 허용');
            return true;
        }

        // 로그인 확인
        if (!this.isLoggedIn()) {
            console.warn('⚠️ 인증 필요:', currentPage);
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return false;
        }

        const user = this.getCurrentUser();
        const permissions = PAGE_PERMISSIONS[currentPage];
        
        console.log('👤 현재 사용자:', user);
        console.log('📋 페이지 권한 설정:', permissions);
        
        // 권한 확인
        if (!this.canAccessPage(currentPage)) {
            console.error('❌ 권한 없음!');
            console.error('  - 페이지:', currentPage);
            console.error('  - 사용자 역할:', user.role);
            console.error('  - 필요 권한:', permissions);
            alert(`접근 권한이 없습니다.\n현재 역할: ${this.getRoleText(user.role)}\n필요 권한: ${permissions?.map(r => this.getRoleText(r)).join(', ') || '없음'}`);
            window.location.href = 'index.html';
            return false;
        }

        console.log('✅ 페이지 접근 허용');
        return true;
    }

    // 역할 텍스트 가져오기
    getRoleText(role) {
        const roleTexts = {
            [USER_ROLES.VIEWER]: '조회자',
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
