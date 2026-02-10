// Firestore 데이터 삭제 스크립트

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

// 상태 표시
function showStatus(message, type) {
    const statusEl = document.getElementById('statusDelete');
    statusEl.className = `status ${type}`;
    statusEl.innerHTML = message;
    statusEl.style.display = 'block';
}

// 페이지 로드 시 문서 개수 표시
document.addEventListener('DOMContentLoaded', async function() {
    await waitForFirebase();
    await loadCounts();
});

// 각 컬렉션의 문서 개수 로드
async function loadCounts() {
    const collections = ['inspections', 'equipment', 'buildings', 'sites', 'inspectors'];
    
    for (const collection of collections) {
        try {
            const result = await window.FirestoreHelper.getAllDocuments(collection);
            const count = result.data ? result.data.length : 0;
            const countEl = document.getElementById(`count${capitalize(collection)}`);
            if (countEl) {
                countEl.textContent = `${count}개`;
            }
        } catch (error) {
            console.error(`${collection} 개수 조회 오류:`, error);
        }
    }
}

// 첫 글자 대문자로
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// 단일 컬렉션 삭제
async function deleteCollection(collectionName) {
    if (!confirm(`정말로 "${collectionName}" 컬렉션의 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    const buttonId = `btnDelete${capitalize(collectionName)}`;
    const btn = document.getElementById(buttonId);
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...';
        
        showStatus(`⏳ "${collectionName}" 데이터 삭제 중...`, 'info');
        
        // Firestore에서 동적 import
        const { collection, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        // 모든 문서 가져오기
        const querySnapshot = await getDocs(collection(window.db, collectionName));
        
        if (querySnapshot.empty) {
            showStatus(`ℹ️ "${collectionName}" 컬렉션에 삭제할 데이터가 없습니다.`, 'info');
            return;
        }
        
        // 각 문서 삭제
        let deletedCount = 0;
        for (const docSnap of querySnapshot.docs) {
            await deleteDoc(doc(window.db, collectionName, docSnap.id));
            deletedCount++;
        }
        
        showStatus(`✅ "${collectionName}" 컬렉션의 ${deletedCount}개 데이터가 삭제되었습니다.`, 'success');
        
        // 개수 업데이트
        await loadCounts();
        
        // 캐시 무효화
        if (window.CacheHelper) {
            window.CacheHelper.invalidateCollection(collectionName);
        }
        
    } catch (error) {
        console.error('삭제 오류:', error);
        showStatus(`❌ 삭제 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i> 삭제';
    }
}

// 모든 컬렉션 삭제
async function deleteAllCollections() {
    if (!confirm('⚠️ 경고: 모든 테스트 데이터를 삭제하시겠습니까?\n\n삭제될 데이터:\n- 점검 기록 (inspections)\n- 장비 (equipment)\n- 건물 (buildings)\n- 현장 (sites)\n- 점검자 (inspectors)\n\n이 작업은 되돌릴 수 없습니다!')) {
        return;
    }
    
    if (!confirm('정말로 삭제하시겠습니까? 마지막 확인입니다.')) {
        return;
    }
    
    const btn = document.getElementById('btnDeleteAll');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 전체 삭제 중...';
        
        showStatus('⏳ 모든 컬렉션 데이터를 삭제하고 있습니다...', 'info');
        
        const collections = ['inspections', 'equipment', 'buildings', 'sites', 'inspectors'];
        let totalDeleted = 0;
        
        // Firestore에서 동적 import
        const { collection, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        for (const collectionName of collections) {
            const querySnapshot = await getDocs(collection(window.db, collectionName));
            
            for (const docSnap of querySnapshot.docs) {
                await deleteDoc(doc(window.db, collectionName, docSnap.id));
                totalDeleted++;
            }
            
            // 캐시 무효화
            if (window.CacheHelper) {
                window.CacheHelper.invalidateCollection(collectionName);
            }
        }
        
        showStatus(`✅ 모든 테스트 데이터가 삭제되었습니다. (총 ${totalDeleted}개)`, 'success');
        
        // 개수 업데이트
        await loadCounts();
        
    } catch (error) {
        console.error('전체 삭제 오류:', error);
        showStatus(`❌ 삭제 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash-alt"></i> 모든 테스트 데이터 삭제';
    }
}
