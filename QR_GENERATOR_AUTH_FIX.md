# QR 생성 페이지 Firebase Auth 추가 (권한 오류 해결)

## 📋 문제 상황

QR 생성 페이지에서 장비 목록을 불러올 때 **"Missing or insufficient permissions"** 오류 발생

### 원인
- Firestore 보안 규칙: 인증된 사용자만 데이터 읽기 가능
- QR 생성 페이지: Firebase Authentication 없이 직접 Firestore 접근 시도
- 결과: 권한 오류로 장비 목록 로드 실패

## ✅ 해결 방법

### 1. Firebase Authentication 추가

**qr-generator.html 파일 수정**

```javascript
// Firebase SDK 임포트에 getAuth 추가
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Auth 초기화
const auth = getAuth(app);
window.auth = auth;
```

### 2. Auth 관련 스크립트 로드

```html
<!-- Auth 관련 스크립트 -->
<script src="js/firebase-config.js"></script>
<script src="js/auth-manager.js"></script>
<script src="js/auth-check.js"></script>
```

### 3. 로그인 확인 로직 추가

```javascript
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 페이지 로드 시작...');
    
    try {
        // Firebase 및 Auth 초기화 대기
        await waitForFirebase();
        await waitForAuth();
        
        // 로그인 확인
        const currentUser = window.AuthManager?.getCurrentUser();
        if (!currentUser) {
            console.error('❌ 로그인되지 않은 사용자');
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('✅ 로그인 확인:', currentUser.email);
        
        await waitForQRCode();
        await loadEquipmentList();
    } catch (error) {
        console.error('❌ 초기화 오류:', error);
        document.getElementById('equipmentList').innerHTML = 
            '<p style="text-align: center; color: #dc3545;">초기화 중 오류가 발생했습니다: ' + error.message + '</p>';
    }
});

// AuthManager 초기화 대기 함수 추가
function waitForAuth() {
    return new Promise((resolve) => {
        if (window.AuthManager) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.AuthManager) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}
```

## 🧪 테스트 방법

### 1. 로그인 상태에서 테스트

```
1. https://noyorc.github.io/hvac-management/login.html 접속
2. 계정 로그인: admin@hvac.com / hvac1234
3. QR 생성 페이지 접속: /qr-generator.html
4. 결과: 장비 목록 정상 로드 ✅
```

### 2. 로그아웃 상태에서 테스트

```
1. 로그아웃
2. QR 생성 페이지 직접 접속: /qr-generator.html
3. 결과: "로그인이 필요합니다" 알림 후 login.html로 리다이렉트 ✅
```

## 📊 Auth 적용 상태

| 페이지 | Auth 적용 | 상태 |
|--------|-----------|------|
| login.html | - | N/A |
| index.html | ✅ | 완료 |
| inspection.html | ✅ | 완료 |
| admin.html | ✅ | 완료 |
| dashboard.html | ✅ | 완료 |
| equipment-list.html | ✅ | 완료 |
| equipment-search.html | ✅ | 완료 |
| equipment-history.html | ✅ | 완료 |
| **qr-generator.html** | ✅ | **신규 추가** |
| qr-scanner.html | ❓ | 확인 필요 |

## 🔐 Firestore 보안 규칙

현재 적용된 보안 규칙:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증 확인 함수
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 관리자 권한 확인
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // 점검자 이상 권한 확인
    function isInspectorOrAbove() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['inspector', 'manager', 'admin'];
    }
    
    // 관리자 이상 권한 확인
    function isManagerOrAbove() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // 장비 관련 (equipment)
    match /equipment/{equipmentId} {
      allow read: if isAuthenticated();
      allow create, update: if isManagerOrAbove();
      allow delete: if isAdmin();
    }
    
    // ... (기타 규칙)
  }
}
```

**핵심**: 모든 equipment 읽기는 `isAuthenticated()` 필수!

## 💾 커밋 정보

```
Commit: 1b4a893
Message: fix: QR 생성 페이지에 Firebase Auth 추가

- Firebase Authentication 추가로 로그인된 사용자만 접근 가능
- 로그인하지 않은 경우 login.html로 리다이렉트
- Firestore 보안 규칙과 호환되도록 수정
```

## 🔄 배포 절차

### 수동 푸시 방법

**옵션 1: GitHub Desktop**
1. GitHub Desktop 열기
2. "Fetch origin" 클릭
3. "Push origin" 클릭

**옵션 2: Git 명령줄 (Personal Access Token)**
```bash
cd /home/user/webapp
git push https://<YOUR_TOKEN>@github.com/NOYORC/hvac-management.git main
```

**옵션 3: SSH**
```bash
git remote set-url origin git@github.com:NOYORC/hvac-management.git
git push origin main
```

### GitHub Pages 배포 확인
1. GitHub Actions 탭에서 배포 상태 확인
2. 약 1-2분 후 변경 사항 반영

## 🎯 다음 단계

1. ✅ **QR 생성 페이지 Auth 추가** (완료)
2. ❓ **QR 스캔 페이지 확인** - qr-scanner.html도 동일한 문제 있는지 확인
3. ❓ **기타 페이지 확인** - Auth가 필요한 다른 페이지 확인

## 📝 참고 사항

### QR 스캔 vs QR 생성 차이점

- **QR 생성 (qr-generator.html)**
  - 장비 목록 조회 필요
  - Firestore 읽기 권한 필요
  - ✅ Auth 필수

- **QR 스캔 (qr-scanner.html)**
  - QR 코드 스캔만 수행
  - 스캔 후 inspection.html로 이동
  - ❓ Auth 필요 여부 확인 필요 (inspection.html에 Auth 있음)

---

**작성일**: 2026-03-15  
**작성자**: AI Assistant  
**관련 이슈**: Firebase 권한 오류로 장비 목록 불러오기 실패
