/**
 * Firebase Authentication Helper
 * 사용자 인증 및 권한 관리
 */

// 사용자 역할
const USER_ROLES = {
    INSPECTOR: 'inspector',
    MANAGER: 'manager',
    ADMIN: 'admin'
};

// 임시 사용자 데이터베이스 (실제로는 Firestore에 저장)
const TEMP_USERS = {
    'inspector@hvac.com': {
        password: '1234',
        role: USER_ROLES.INSPECTOR,
        name: '점검자',
        uid: 'user_inspector_001'
    },
    'manager@hvac.com': {
        password: 'admin123',
        role: USER_ROLES.MANAGER,
        name: '관리자',
        uid: 'user_manager_001'
    },
    'admin@hvac.com': {
        password: 'admin2025',
        role: USER_ROLES.ADMIN,
        name: '시스템관리자',
        uid: 'user_admin_001'
    }
};

class AuthHelper {
    static SESSION_KEY = 'hvac_user_session';
    static SESSION_DURATION = 8 * 60 * 60 * 1000; // 8시간
    
    /**
     * 로그인
     * @param {string} email - 이메일 (또는 사용자명)
     * @param {string} password - 비밀번호
     * @returns {Promise<object>} 로그인 결과
     */
    static async login(email, password) {
        try {
            console.log('🔐 로그인 시도:', email);
            
            // 임시 인증 (실제로는 Firebase Auth 사용)
            const user = TEMP_USERS[email];
            
            if (!user) {
                return {
                    success: false,
                    message: '존재하지 않는 사용자입니다.'
                };
            }
            
            if (user.password !== password) {
                return {
                    success: false,
                    message: '비밀번호가 올바르지 않습니다.'
                };
            }
            
            // 세션 생성
            const session = {
                uid: user.uid,
                email: email,
                name: user.name,
                role: user.role,
                loginTime: Date.now(),
                expiresAt: Date.now() + this.SESSION_DURATION
            };
            
            // 세션 저장
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
            console.log('✅ 로그인 성공:', session.name, '-', session.role);
            
            return {
                success: true,
                user: session,
                message: '로그인 성공'
            };
            
        } catch (error) {
            console.error('❌ 로그인 오류:', error);
            return {
                success: false,
                message: '로그인 중 오류가 발생했습니다.'
            };
        }
    }
    
    /**
     * 로그아웃
     */
    static logout() {
        localStorage.removeItem(this.SESSION_KEY);
        console.log('👋 로그아웃 완료');
    }
    
    /**
     * 현재 사용자 가져오기
     * @returns {object|null} 현재 로그인된 사용자 또는 null
     */
    static getCurrentUser() {
        try {
            const sessionData = localStorage.getItem(this.SESSION_KEY);
            if (!sessionData) return null;
            
            const session = JSON.parse(sessionData);
            
            // 세션 만료 확인
            if (Date.now() > session.expiresAt) {
                console.log('⏰ 세션 만료');
                this.logout();
                return null;
            }
            
            return session;
        } catch (error) {
            console.error('세션 읽기 오류:', error);
            return null;
        }
    }
    
    /**
     * 로그인 여부 확인
     * @returns {boolean} 로그인 상태
     */
    static isLoggedIn() {
        return this.getCurrentUser() !== null;
    }
    
    /**
     * 역할 확인
     * @param {string} role - 확인할 역할
     * @returns {boolean} 해당 역할 여부
     */
    static hasRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        // ADMIN은 모든 권한 보유
        if (user.role === USER_ROLES.ADMIN) return true;
        
        // MANAGER는 INSPECTOR 권한도 보유
        if (user.role === USER_ROLES.MANAGER && role === USER_ROLES.INSPECTOR) {
            return true;
        }
        
        return user.role === role;
    }
    
    /**
     * 페이지 접근 권한 확인
     * @param {string} requiredRole - 필요한 역할
     * @param {string} redirectUrl - 리다이렉트 URL (기본: index.html)
     * @returns {boolean} 접근 가능 여부
     */
    static checkPageAccess(requiredRole, redirectUrl = 'index.html') {
        const user = this.getCurrentUser();
        
        // 로그인하지 않음
        if (!user) {
            console.warn('⛔ 인증 필요 - 로그인 페이지로 이동');
            alert('로그인이 필요합니다.');
            window.location.href = redirectUrl;
            return false;
        }
        
        // 권한 없음
        if (!this.hasRole(requiredRole)) {
            console.warn('⛔ 권한 부족:', user.role, '/', requiredRole);
            alert('접근 권한이 없습니다.');
            window.location.href = redirectUrl;
            return false;
        }
        
        console.log('✅ 페이지 접근 허용:', user.name, '-', requiredRole);
        return true;
    }
    
    /**
     * 세션 연장
     */
    static extendSession() {
        const user = this.getCurrentUser();
        if (user) {
            user.expiresAt = Date.now() + this.SESSION_DURATION;
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
            console.log('🔄 세션 연장:', new Date(user.expiresAt).toLocaleString());
        }
    }
    
    /**
     * 세션 정보
     * @returns {object} 세션 정보
     */
    static getSessionInfo() {
        const user = this.getCurrentUser();
        if (!user) {
            return {
                loggedIn: false,
                message: '로그인되지 않음'
            };
        }
        
        const remainingTime = user.expiresAt - Date.now();
        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        
        return {
            loggedIn: true,
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                roleText: this.getRoleText(user.role)
            },
            session: {
                loginTime: new Date(user.loginTime).toLocaleString('ko-KR'),
                expiresAt: new Date(user.expiresAt).toLocaleString('ko-KR'),
                remaining: `${hours}시간 ${minutes}분`
            }
        };
    }
    
    /**
     * 역할 텍스트 반환
     * @param {string} role - 역할
     * @returns {string} 역할 텍스트
     */
    static getRoleText(role) {
        const roleTexts = {
            [USER_ROLES.INSPECTOR]: '점검자',
            [USER_ROLES.MANAGER]: '관리자',
            [USER_ROLES.ADMIN]: '시스템관리자'
        };
        return roleTexts[role] || '알 수 없음';
    }
}

// 전역으로 내보내기
window.AuthHelper = AuthHelper;
window.USER_ROLES = USER_ROLES;

console.log('✅ Auth Helper 로드 완료');

// 페이지 활동 시 세션 자동 연장
let activityTimer;
document.addEventListener('mousemove', () => {
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        if (AuthHelper.isLoggedIn()) {
            AuthHelper.extendSession();
        }
    }, 5 * 60 * 1000); // 5분마다
});
