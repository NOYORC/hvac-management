# 점검 유형별 필드 구분 완료

## 📋 작업 요약

**일시**: 2026-02-10  
**커밋**: bba79e5  
**상태**: ✅ 완료

---

## ✅ **최종 결과**

### 1. 일반점검 (정기 점검)
```
┌─────────────────────────────┐
│  기본 점검 항목              │
│  - 실내온도                  │
│  - 설정온도                  │
│  - 냉매고압/저압             │
│  - R/S/T상 전류              │
├─────────────────────────────┤
│  📝 특이사항                 │
│  (이상 사항이 있으면 입력)   │
└─────────────────────────────┘
```

### 2. 고장정비 (고장 발생 시)
```
┌─────────────────────────────┐
│  기본 점검 항목              │
│  - 실내온도                  │
│  - 설정온도                  │
│  - 냉매고압/저압             │
│  - R/S/T상 전류              │
├─────────────────────────────┤
│  🔧 정비 내용                │
│                              │
│  📝 정비내용                 │
│  (정비 작업 내용 상세 입력)  │
└─────────────────────────────┘
```

---

## 🔧 **구현 상세**

### HTML 구조 (inspection.html)

#### 일반점검용 필드
```html
<div id="normalNotes" class="form-group">
    <label><i class="fas fa-comment"></i> 특이사항</label>
    <textarea id="notesNormal" rows="4" 
              placeholder="특이사항이 있으면 입력하세요"></textarea>
</div>
```

#### 고장정비용 필드
```html
<div id="repairFields" class="form-section" style="display: none;">
    <h3>정비 내용</h3>
    <div class="form-group">
        <label><i class="fas fa-wrench"></i> 정비내용</label>
        <textarea id="notesRepair" rows="4" 
                  placeholder="정비 내용을 상세히 입력하세요"></textarea>
    </div>
</div>
```

### JavaScript 로직 (inspection.js)

#### 필드 전환 함수
```javascript
function updateFormFields() {
    const inspectionType = document.querySelector('input[name="inspectionType"]:checked').value;
    const normalNotes = document.getElementById('normalNotes');
    const repairFields = document.getElementById('repairFields');
    
    if (inspectionType === '고장정비') {
        normalNotes.style.display = 'none';    // 특이사항 숨김
        repairFields.style.display = 'block';  // 정비내용 표시
    } else {
        normalNotes.style.display = 'block';   // 특이사항 표시
        repairFields.style.display = 'none';   // 정비내용 숨김
    }
}
```

#### 데이터 저장 로직
```javascript
// 점검 유형에 따라 올바른 textarea 선택
let notes = '';
if (inspectionType === '고장정비') {
    notes = document.getElementById('notesRepair').value || '';
} else {
    notes = document.getElementById('notesNormal').value || '';
}

const inspectionData = {
    // ... 다른 필드들
    notes: notes
};
```

### 대시보드 표시 (dashboard.js)

#### 조건부 메시지
```javascript
${insp.notes || (insp.inspection_type === '고장정비' ? '정비내용 없음' : '특이사항 없음')}
```

#### 엑셀 컬럼명
```javascript
'정비내용/특이사항': insp.notes || '-'
```

---

## 🎯 **동작 흐름**

### 일반점검 선택 시
1. 사용자가 "일반점검" 라디오 버튼 클릭
2. `updateFormFields()` 실행
3. `normalNotes` 표시, `repairFields` 숨김
4. "특이사항" 입력란 표시
5. 저장 시 `notesNormal` 값을 `notes` 필드에 저장

### 고장정비 선택 시
1. 사용자가 "고장정비" 라디오 버튼 클릭
2. `updateFormFields()` 실행
3. `normalNotes` 숨김, `repairFields` 표시
4. "정비 내용" 섹션 + "정비내용" 입력란 표시
5. 저장 시 `notesRepair` 값을 `notes` 필드에 저장

---

## 🧪 **테스트 시나리오**

### 테스트 1: 일반점검
```
1. 점검 페이지 접속
   https://noyorc.github.io/hvac-management/inspection.html

2. "일반점검" 선택 (기본값)

3. 확인 사항:
   ✅ 기본 점검 항목 표시
   ✅ 마지막에 "특이사항" 입력란 표시
   ✅ "정비 내용" 섹션 없음

4. 점검 데이터 입력 후 저장

5. 대시보드에서 확인:
   ✅ 특이사항 입력 내용 표시
   ✅ 미입력 시 "특이사항 없음" 표시
```

### 테스트 2: 고장정비
```
1. 점검 페이지 접속

2. "고장정비" 선택

3. 확인 사항:
   ✅ 기본 점검 항목 표시
   ✅ "정비 내용" 섹션 표시
   ✅ "정비내용" 입력란 표시
   ✅ "특이사항" 입력란 없음

4. 정비 데이터 입력 후 저장

5. 대시보드에서 확인:
   ✅ 정비내용 입력 내용 표시
   ✅ 미입력 시 "정비내용 없음" 표시
```

### 테스트 3: 전환 테스트
```
1. 점검 페이지 접속

2. "일반점검" 선택
   ✅ "특이사항" 입력란 표시

3. "고장정비" 선택
   ✅ "정비 내용" 섹션 표시
   ✅ "특이사항" 입력란 숨김

4. 다시 "일반점검" 선택
   ✅ "특이사항" 입력란 다시 표시
   ✅ "정비 내용" 섹션 숨김
```

---

## 📝 **커밋 정보**

```
bba79e5 - fix: 점검 유형별 입력 필드 구분 개선
```

**변경 파일**: 3 files changed, 31 insertions(+), 16 deletions(-)
- `inspection.html`
- `js/inspection.js`
- `js/dashboard.js`

---

## 🔗 **링크**

- **점검 페이지**: https://noyorc.github.io/hvac-management/inspection.html
- **대시보드**: https://noyorc.github.io/hvac-management/dashboard.html

---

## 💬 **요약**

✅ **일반점검**: 기본 점검 항목 + **특이사항** 입력  
✅ **고장정비**: 기본 점검 항목 + **정비 내용** 섹션 + **정비내용** 입력  
✅ 라디오 버튼 전환 시 자동으로 필드 변경  
✅ 각 유형에 맞는 데이터 저장 및 표시  

**모든 요청사항이 완료되었습니다!** 🎉
