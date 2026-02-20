// Firebase Firestore 헬퍼 함수들
// 모든 Firestore 작업을 위한 유틸리티

// Firestore import (HTML에서 이미 초기화됨)
// window.db가 전역에서 사용 가능

// Firestore 모듈 동적 import
let firestoreFunctions = null;

async function getFirestoreFunctions() {
    if (!firestoreFunctions) {
        const module = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        firestoreFunctions = {
            collection: module.collection,
            getDocs: module.getDocs,
            getDoc: module.getDoc,
            addDoc: module.addDoc,
            setDoc: module.setDoc,
            deleteDoc: module.deleteDoc,
            doc: module.doc,
            query: module.query,
            where: module.where,
            orderBy: module.orderBy,
            limit: module.limit,
            Timestamp: module.Timestamp
        };
    }
    return firestoreFunctions;
}

// 컬렉션의 모든 문서 가져오기
async function getAllDocuments(collectionName) {
    try {
        const { collection, getDocs } = await getFirestoreFunctions();
        const querySnapshot = await getDocs(collection(window.db, collectionName));
        const documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return { success: true, data: documents, total: documents.length };
    } catch (error) {
        console.error(`Error getting ${collectionName}:`, error);
        return { success: false, data: [], total: 0, error: error.message };
    }
}

// 단일 문서 가져오기
async function getDocument(collectionName, documentId) {
    try {
        const { doc, getDoc } = await getFirestoreFunctions();
        const docRef = doc(window.db, collectionName, documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
        } else {
            return { success: false, error: 'Document not found' };
        }
    } catch (error) {
        console.error(`Error getting document:`, error);
        return { success: false, error: error.message };
    }
}

// 문서 추가
async function addDocument(collectionName, data) {
    try {
        const { collection, addDoc, Timestamp } = await getFirestoreFunctions();
        
        // 타임스탬프 필드 변환
        if (data.inspection_date) {
            // toDate 메서드가 있으면 이미 Timestamp (어떤 버전이든)
            if (typeof data.inspection_date.toDate === 'function') {
                // Timestamp → Date → Timestamp로 재변환 (동일한 Timestamp 클래스 사용)
                const dateValue = data.inspection_date.toDate();
                data.inspection_date = Timestamp.fromDate(dateValue);
            } 
            // Date 객체인 경우
            else if (data.inspection_date instanceof Date) {
                data.inspection_date = Timestamp.fromDate(data.inspection_date);
            }
            // 문자열인 경우
            else if (typeof data.inspection_date === 'string') {
                data.inspection_date = Timestamp.fromDate(new Date(data.inspection_date));
            }
        }
        
        const docRef = await addDoc(collection(window.db, collectionName), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error(`Error adding document:`, error);
        return { success: false, error: error.message };
    }
}

// 문서 업데이트 (ID로)
async function setDocument(collectionName, documentId, data) {
    try {
        const { doc, setDoc } = await getFirestoreFunctions();
        const docRef = doc(window.db, collectionName, documentId);
        await setDoc(docRef, data, { merge: true });
        return { success: true };
    } catch (error) {
        console.error(`Error setting document:`, error);
        return { success: false, error: error.message };
    }
}

// 쿼리 (조건부 조회)
async function queryDocuments(collectionName, conditions = []) {
    try {
        const { collection, query, where, getDocs } = await getFirestoreFunctions();
        const collectionRef = collection(window.db, collectionName);
        
        let q = collectionRef;
        if (conditions.length > 0) {
            const whereClauses = conditions.map(c => where(c.field, c.operator, c.value));
            q = query(collectionRef, ...whereClauses);
        }
        
        const querySnapshot = await getDocs(q);
        const documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return { success: true, data: documents, total: documents.length };
    } catch (error) {
        console.error(`Error querying ${collectionName}:`, error);
        return { success: false, data: [], total: 0, error: error.message };
    }
}

// 문서 삭제
async function deleteDocument(collectionName, documentId) {
    try {
        const { doc, deleteDoc } = await getFirestoreFunctions();
        const docRef = doc(window.db, collectionName, documentId);
        await deleteDoc(docRef);
        return { success: true };
    } catch (error) {
        console.error(`Error deleting document:`, error);
        return { success: false, error: error.message };
    }
}

// 전역 객체로 내보내기
window.FirestoreHelper = {
    getAllDocuments,
    getDocument,
    addDocument,
    setDocument,
    queryDocuments,
    deleteDocument
};
