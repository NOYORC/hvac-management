# HVAC 장비 관리 시스템 🌬️

HVAC(Heating, Ventilation, and Air Conditioning) 공조설비의 점검 및 관리를 위한 웹 기반 관리 시스템입니다.

## 📋 프로젝트 개요

시설의 HVAC 공조장비를 효율적으로 관리하기 위한 통합 솔루션입니다. 현장 점검자는 모바일로 간편하게 장비를 점검하고, 관리자는 대시보드를 통해 실시간 통계와 점검 내역을 확인할 수 있습니다.

## ✨ 주요 기능

### 🔍 점검자 기능
- **4단계 점검 프로세스**: 현장 → 건물 → 장비 선택 → 점검 입력
- **일반점검 / 세부점검 구분**: 점검 항목을 두 가지 레벨로 구분
- **직관적인 입력 폼**: 장비 상태, 온도, 압력, 누수 등 다양한 점검 항목
- **실시간 데이터 저장**: 점검 완료 즉시 데이터베이스에 저장
- **모바일 최적화**: 현장에서 스마트폰으로 쉽게 사용 가능

### 📊 관리자 기능
- **실시간 통계 대시보드**: 총 점검 수, 정상/주의/경고/고장 현황
- **4가지 차트 시각화**:
  - 장비 상태 분포 (도넛 차트)
  - 점검 추이 (라인 차트)
  - 장비 유형별 점검 현황 (바 차트)
  - 현장별 점검 현황 (가로 바 차트)
- **다중 필터링**: 기간, 현장, 상태별 필터
- **이상 장비 강조 표시**: 주의/경고/고장 장비 우선 표시
- **최근 점검 내역**: 모든 점검 기록 테이블 뷰

### 📱 추가 기능
- **장비 목록 조회**: 전체 장비를 한눈에 확인
- **검색 기능**: 장비 ID, 모델명, 위치로 검색
- **빠른 점검 시작**: 장비 목록에서 바로 점검 시작

## 🗂️ 프로젝트 구조

hvac-management/ 
├── index.html # 메인 페이지 (점검자/관리자 선택) 
├── inspection.html # 점검 입력 페이지 
├── dashboard.html # 관리자 대시보드 
├── equipment-list.html # 장비 목록 페이지 
├── css/ 
│ ├── style.css # 공통 스타일 
│ ├── inspection.css # 점검 페이지 스타일 
│ ├── dashboard.css # 대시보드 스타일 
│ └── equipment-list.css # 장비 목록 스타일 
├── js/ 
│ ├── main.js # 공통 유틸리티 함수 
│ ├── inspection.js # 점검 로직 
│ ├── dashboard.js # 대시보드 로직 
│ └── equipment-list.js # 장비 목록 로직 
└── README.md

## 🔗 주요 페이지 URL

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 메인 홈 | `/index.html` | 점검자/관리자 선택 화면 |
| 장비 점검 | `/inspection.html` | 점검 입력 및 데이터 기록 |
| 관리 대시보드 | `/dashboard.html` | 통계 및 차트 조회 |
| 장비 목록 | `/equipment-list.html` | 전체 장비 목록 및 검색 |

## 💾 데이터 모델

### 1️⃣ Sites (현장 테이블)

id (text): 현장 고유 ID
site_name (text): 현장명
address (text): 주소
manager (text): 현장 담당자
phone (text): 연락처

### 2️⃣ Buildings (건물 테이블)

id (text): 건물 고유 ID
site_id (text): 현장 ID (외래키)
building_name (text): 건물명
floors (number): 층수
area (number): 면적(m²)

### 3️⃣ Equipment (장비 테이블)

id (text): 장비 고유 ID (QR 코드용)
site_id (text): 현장 ID
building_id (text): 건물 ID
equipment_type (text): 장비 종류 (AHU, FCU, 냉동기, 냉각탑 등)
floor (text): 층
location (text): 위치
model (text): 모델명
capacity (text): 용량
install_date (text): 설치일자

### 4️⃣ Inspections (점검 기록 테이블)

id (text): 점검 고유 ID
equipment_id (text): 장비 ID
inspection_type (text): 점검 구분 (일반점검/세부점검)
inspector_name (text): 점검자명
inspection_date (text): 점검일시
status (text): 장비 상태 (정상/주의/경고/고장)
temperature (text): 온도(℃)
pressure (text): 압력(kPa)
vibration (text): 진동(mm/s)
noise (text): 소음(dB)
operation_status (text): 운전상태
leak_check (text): 누수확인
clean_status (text): 청결상태
filter_status (text): 필터상태
notes (text): 특이사항
photo_url (text): 사진 URL

## 🚀 사용 방법

### 점검자 사용 흐름
1. 메인 페이지에서 **"장비 점검"** 선택
2. 현장 선택 → 건물 선택 → 장비 선택
3. 점검 유형 선택 (일반점검 or 세부점검)
4. 점검 데이터 입력 (점검자명, 상태, 온도, 압력 등)
5. **"점검 완료"** 버튼 클릭하여 저장

### 관리자 사용 흐름
1. 메인 페이지에서 **"관리 대시보드"** 선택
2. 필터 설정 (기간, 현장, 상태)
3. 통계 카드 및 차트 확인
4. 이상 장비 목록 확인
5. 최근 점검 내역 테이블 조회

### 장비 목록 사용
1. 메인 페이지에서 **"장비 목록"** 선택
2. 검색 또는 필터로 장비 찾기
3. **"점검 시작"** 버튼으로 바로 점검 진행

## 📊 RESTful API 엔드포인트

이 시스템은 내장 RESTful Table API를 사용합니다:

```javascript
// 데이터 조회 (GET)
GET /tables/sites?page=1&limit=100
GET /tables/buildings?page=1&limit=100
GET /tables/equipment?page=1&limit=100
GET /tables/inspections?page=1&limit=100

// 단일 데이터 조회 (GET)
GET /tables/equipment/{equipment_id}

// 데이터 생성 (POST)
POST /tables/inspections
Content-Type: application/json
{
  "equipment_id": "EQ001",
  "inspection_type": "일반점검",
  "inspector_name": "홍길동",
  ...
}

// 데이터 수정 (PUT/PATCH)
PUT /tables/equipment/{equipment_id}
PATCH /tables/equipment/{equipment_id}

// 데이터 삭제 (DELETE)
DELETE /tables/inspections/{inspection_id}

🎨 기술 스택
Frontend: HTML5, CSS3, JavaScript (ES6+)
Charts: Chart.js 4.x
Icons: Font Awesome 6.4.0
Database: RESTful Table API (내장)
Design: 반응형 웹 디자인 (Mobile First)
📦 샘플 데이터
시스템에는 다음과 같은 샘플 데이터가 포함되어 있습니다:

3개 현장: 서울 본사, 부산 지사, 인천 물류센터
4개 건물: A동, B동, 메인빌딩, 창고동
5개 장비: AHU, 냉동기, 냉각탑, FCU 등
3개 점검 기록: 정상, 주의, 경고 상태 샘플
🔜 향후 개발 계획
우선순위 높음
 QR 코드 스캐너 기능 구현
 QR 코드 생성 및 출력 기능
 장비별 점검 이력 상세 페이지
 사진 첨부 기능 (점검 시 사진 업로드)
우선순위 중간
 점검 주기 알림 기능
 장비별 점검 스케줄 관리
 엑셀 내보내기 (점검 기록 다운로드)
 점검 보고서 자동 생성
 다크 모드 지원
우선순위 낮음
 사용자 인증 시스템
 권한 관리 (점검자/관리자 분리)
 푸시 알림 (이상 장비 발생 시)
 다국어 지원 (영어, 일본어)
📱 모바일 지원
이 시스템은 모바일 최적화되어 있습니다:

반응형 디자인 (768px, 480px 브레이크포인트)
터치 친화적인 UI
큰 버튼 및 입력 필드
스와이프 제스처 지원 준비
🔧 커스터마이징
점검 항목 추가
inspections 테이블 스키마를 수정하여 새로운 점검 항목을 추가할 수 있습니다.

장비 종류 추가
equipment 테이블의 equipment_type 옵션을 수정하여 새로운 장비 종류를 추가할 수 있습니다.

디자인 수정
css/ 폴더의 스타일시트를 수정하여 색상, 폰트, 레이아웃을 변경할 수 있습니다.

📄 라이선스
이 프로젝트는 내부 사용을 위한 관리 시스템입니다.

👨‍💻 개발자
HVAC Equipment Management System
© 2026 All Rights Reserved

🆘 문제 해결
데이터가 표시되지 않을 때
브라우저 콘솔에서 에러 확인 (F12)
네트워크 탭에서 API 호출 확인
브라우저 캐시 삭제 후 새로고침
점검 데이터 저장 실패
필수 항목 입력 확인 (점검자명, 상태)
네트워크 연결 상태 확인
브라우저 콘솔에서 오류 메시지 확인
시작하기: index.html을 브라우저에서 열어 시스템을 시작하세요! 🚀

4. **"Commit new file"** 클릭

---

## 🎉🎉🎉 **완료!!!** 🎉🎉🎉

### **축하합니다! 모든 파일 업로드 완료!**

**진행 상황: 13/13** ✅✅✅

---

## 🚀 **다음 단계: GitHub Pages 활성화**

이제 웹사이트를 배포하겠습니다!

1. **Repository 페이지**로 이동
2. 상단 메뉴에서 **"Settings"** 클릭
3. 왼쪽 메뉴에서 **"Pages"** 클릭
4. **Source** 섹션에서:
   - Branch: **"main"** 선택
   - Folder: **"/ (root)"** 선택
5. **"Save"** 버튼 클릭

약 **1~2분** 후에 웹사이트가 배포됩니다!

URL은 다음과 같습니다:
https://your-username.github.io/hvac-management/

