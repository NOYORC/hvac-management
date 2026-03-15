# GitHub Desktop 빠른 시작 가이드

## ✅ 체크리스트

### 1. 설치 (5분)
- [ ] https://desktop.github.com/ 접속
- [ ] Download 클릭 (Windows / macOS)
- [ ] 설치 파일 실행
- [ ] GitHub Desktop 실행

### 2. 로그인 (2분)
- [ ] "Sign in to GitHub.com" 클릭
- [ ] 브라우저에서 GitHub 계정 로그인
- [ ] "Authorize desktop" 클릭
- [ ] GitHub Desktop으로 돌아오기

### 3. 저장소 추가 (3분)

**방법 A: Clone (처음)**
- [ ] File → Clone Repository
- [ ] "NOYORC/hvac-management" 검색
- [ ] Local Path 선택
- [ ] Clone 버튼 클릭

**방법 B: Add (이미 있음)**
- [ ] File → Add Local Repository
- [ ] Choose 버튼 클릭
- [ ] `/home/user/webapp` 선택
- [ ] Add Repository 클릭

### 4. 푸시 (1분)
- [ ] Repository 선택: hvac-management
- [ ] Branch 확인: main
- [ ] History 탭 클릭
- [ ] "2 commits to push" 확인
- [ ] **[Fetch origin]** 버튼 클릭
- [ ] **[Push origin]** 버튼 클릭 (또는 Ctrl+P)
- [ ] "Pushed successfully" 메시지 확인

### 5. 확인 (2분)
- [ ] GitHub.com 방문
- [ ] https://github.com/NOYORC/hvac-management
- [ ] 최신 커밋 2개 확인
- [ ] Actions 탭에서 배포 확인 (초록색 체크)

---

## 🎯 핵심 4단계

```
1. 설치 → 2. 로그인 → 3. 저장소 추가 → 4. Push 버튼 클릭!
```

## 🖼️ 화면 예시

### Push 버튼 위치
```
┌──────────────────────────────────────┐
│  hvac-management          main ↓     │
│  ┌────────────────────────────────┐  │
│  │  [Fetch origin] [Push origin] │  │ ← 여기!
│  └────────────────────────────────┘  │
│                                      │
│  📜 History (2 ↑)                    │
│  ⬆️  2 commits to push               │
└──────────────────────────────────────┘
```

## ⚡ 자주 사용하는 버튼

| 버튼 | 단축키 | 설명 |
|------|--------|------|
| Push origin | Ctrl+P | 로컬 커밋을 GitHub에 업로드 |
| Fetch origin | Ctrl+Shift+F | 원격 변경사항 확인 |
| Pull origin | Ctrl+Shift+P | 원격 변경사항 가져오기 |

## 📝 푸시 예상 시간

```
준비: 10분 (설치 + 로그인 + 저장소 추가)
푸시: 1분 (버튼 클릭)
배포: 2분 (GitHub Pages 자동 배포)
────────────────────────────
총: 약 13분
```

## 🎉 성공 확인

### GitHub Desktop
```
✅ "Pushed successfully" 메시지
✅ History 탭에서 ↑ 아이콘 사라짐
```

### GitHub.com
```
✅ 최신 커밋 2개 표시
   - 21c823f docs: QR 생성 페이지 Auth 추가 문서
   - 1b4a893 fix: QR 생성 페이지에 Firebase Auth 추가
✅ Actions 탭 초록색 체크
```

### 웹사이트
```
✅ https://noyorc.github.io/hvac-management/login.html
✅ 로그인 후
✅ https://noyorc.github.io/hvac-management/qr-generator.html
✅ 장비 목록 정상 로드
```

---

## 💡 문제가 생겼을 때

### "Repository not found"
→ File → Add Local Repository로 다시 추가

### "Push rejected"
→ [Pull origin] 먼저 클릭 → 다시 [Push origin]

### "Authentication failed"
→ File → Options → Accounts → 다시 로그인

---

**🚀 지금 바로 시작!**
https://desktop.github.com/

