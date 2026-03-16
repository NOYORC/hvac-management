/**
 * Firebase 데이터 캐싱 헬퍼
 * LocalStorage를 사용하여 Firestore 데이터를 캐싱
 */

class CacheHelper {
    // 캐시 유효 시간 (30초 - 빠른 업데이트를 위해 단축)
    static CACHE_DURATION = 30 * 1000;
    
    /**
     * 캐시 키 생성
     * @param {string} collection - 컬렉션 이름
     * @param {string} id - 문서 ID (선택)
     * @returns {string} 캐시 키
     */
    static getCacheKey(collection, id = null) {
        return id ? `cache_${collection}_${id}` : `cache_${collection}`;
    }
    
    /**
     * 캐시에서 데이터 가져오기
     * @param {string} cacheKey - 캐시 키
     * @returns {object|null} 캐시된 데이터 또는 null
     */
    /**
     * Timestamp 객체 복원 (JSON 직렬화로 손실된 메서드 복원)
     * @param {object} obj - 복원할 객체
     * @returns {object} Timestamp가 복원된 객체
     */
    static restoreTimestamps(obj) {
        if (!obj) return obj;
        
        // 배열인 경우
        if (Array.isArray(obj)) {
            return obj.map(item => this.restoreTimestamps(item));
        }
        
        // 객체인 경우
        if (typeof obj === 'object') {
            // Timestamp 객체 복원 (seconds와 nanoseconds가 있으면 Timestamp로 간주)
            if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
                // window.FirestoreTimestamp가 있는지 확인
                if (window.FirestoreTimestamp && window.FirestoreTimestamp.fromMillis) {
                    const millis = obj.seconds * 1000 + obj.nanoseconds / 1000000;
                    return window.FirestoreTimestamp.fromMillis(millis);
                }
            }
            
            // 중첩된 객체 처리
            const restored = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    restored[key] = this.restoreTimestamps(obj[key]);
                }
            }
            return restored;
        }
        
        return obj;
    }
    
    static getFromCache(cacheKey) {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            
            // 캐시 만료 확인
            if (Date.now() - timestamp > this.CACHE_DURATION) {
                console.log(`🗑️ 캐시 만료: ${cacheKey}`);
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            // Timestamp 복원
            const restoredData = this.restoreTimestamps(data);
            
            console.log(`✅ 캐시 적중: ${cacheKey} (${Math.floor((Date.now() - timestamp) / 1000)}초 전)`);
            return restoredData;
            
        } catch (error) {
            console.error('캐시 읽기 오류:', error);
            return null;
        }
    }
    
    /**
     * 캐시에 데이터 저장
     * @param {string} cacheKey - 캐시 키
     * @param {any} data - 저장할 데이터
     */
    static saveToCache(cacheKey, data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log(`💾 캐시 저장: ${cacheKey}`);
            
        } catch (error) {
            console.error('캐시 저장 오류:', error);
            // LocalStorage 용량 초과 시 오래된 캐시 삭제
            if (error.name === 'QuotaExceededError') {
                this.clearOldCache();
                // 재시도
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                } catch (retryError) {
                    console.error('캐시 저장 재시도 실패:', retryError);
                }
            }
        }
    }
    
    /**
     * 특정 캐시 삭제
     * @param {string} cacheKey - 캐시 키
     */
    static clearCache(cacheKey) {
        localStorage.removeItem(cacheKey);
        console.log(`🗑️ 캐시 삭제: ${cacheKey}`);
    }
    
    /**
     * 컬렉션별 캐시 무효화
     * @param {string} collection - 컬렉션 이름
     */
    static invalidateCollection(collection) {
        const keys = Object.keys(localStorage);
        const pattern = `cache_${collection}`;
        
        keys.forEach(key => {
            if (key.startsWith(pattern)) {
                localStorage.removeItem(key);
                console.log(`🗑️ 캐시 무효화: ${key}`);
            }
        });
    }
    
    /**
     * 오래된 캐시 삭제 (용량 확보)
     */
    static clearOldCache() {
        console.log('🧹 오래된 캐시 정리 시작...');
        const keys = Object.keys(localStorage);
        const now = Date.now();
        let cleared = 0;
        
        keys.forEach(key => {
            if (!key.startsWith('cache_')) return;
            
            try {
                const cached = localStorage.getItem(key);
                const { timestamp } = JSON.parse(cached);
                
                // 10분 이상 된 캐시 삭제
                if (now - timestamp > 10 * 60 * 1000) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            } catch (error) {
                // 파싱 오류 시 해당 캐시 삭제
                localStorage.removeItem(key);
                cleared++;
            }
        });
        
        console.log(`🧹 ${cleared}개의 오래된 캐시 삭제 완료`);
    }
    
    /**
     * 모든 캐시 삭제
     */
    static clearAllCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('🗑️ 모든 캐시 삭제 완료');
    }
    
    /**
     * 캐시 통계
     * @returns {object} 캐시 통계 정보
     */
    static getCacheStats() {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith('cache_'));
        
        let totalSize = 0;
        let validCount = 0;
        let expiredCount = 0;
        const now = Date.now();
        
        cacheKeys.forEach(key => {
            const value = localStorage.getItem(key);
            totalSize += value.length;
            
            try {
                const { timestamp } = JSON.parse(value);
                if (now - timestamp > this.CACHE_DURATION) {
                    expiredCount++;
                } else {
                    validCount++;
                }
            } catch (error) {
                expiredCount++;
            }
        });
        
        return {
            totalCount: cacheKeys.length,
            validCount: validCount,
            expiredCount: expiredCount,
            totalSize: (totalSize / 1024).toFixed(2) + ' KB',
            maxSize: '5 MB (LocalStorage limit)'
        };
    }
}

/**
 * Cached Firestore Helper
 * FirestoreHelper를 확장하여 캐싱 기능 추가
 */
class CachedFirestoreHelper {
    /**
     * 모든 문서 가져오기 (캐싱)
     * @param {string} collection - 컬렉션 이름
     * @param {boolean} forceRefresh - 캐시 무시하고 새로 가져오기
     * @returns {Promise<object>} 문서 배열
     */
    static async getAllDocuments(collection, forceRefresh = false) {
        const cacheKey = CacheHelper.getCacheKey(collection);
        
        // 캐시 확인 (forceRefresh가 false일 때만)
        if (!forceRefresh) {
            const cached = CacheHelper.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }
        
        // Firestore에서 데이터 가져오기
        console.log(`🔄 Firestore 조회: ${collection}`);
        const result = await window.FirestoreHelper.getAllDocuments(collection);
        
        // 캐시에 저장
        if (result.success && result.data) {
            CacheHelper.saveToCache(cacheKey, result);
        }
        
        return result;
    }
    
    /**
     * 단일 문서 가져오기 (캐싱)
     * @param {string} collection - 컬렉션 이름
     * @param {string} id - 문서 ID
     * @param {boolean} forceRefresh - 캐시 무시하고 새로 가져오기
     * @returns {Promise<object>} 문서 데이터
     */
    static async getDocument(collection, id, forceRefresh = false) {
        const cacheKey = CacheHelper.getCacheKey(collection, id);
        
        // 캐시 확인
        if (!forceRefresh) {
            const cached = CacheHelper.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }
        
        // Firestore에서 데이터 가져오기
        console.log(`🔄 Firestore 조회: ${collection}/${id}`);
        const result = await window.FirestoreHelper.getDocument(collection, id);
        
        // 캐시에 저장
        if (result.success && result.data) {
            CacheHelper.saveToCache(cacheKey, result);
        }
        
        return result;
    }
    
    /**
     * 문서 추가 (캐시 무효화)
     * @param {string} collection - 컬렉션 이름
     * @param {object} data - 추가할 데이터
     * @returns {Promise<object>} 결과
     */
    static async addDocument(collection, data) {
        const result = await window.FirestoreHelper.addDocument(collection, data);
        
        // 해당 컬렉션의 캐시 무효화
        if (result.success) {
            CacheHelper.invalidateCollection(collection);
        }
        
        return result;
    }
    
    /**
     * 문서 업데이트 (캐시 무효화)
     * @param {string} collection - 컬렉션 이름
     * @param {string} id - 문서 ID
     * @param {object} data - 업데이트할 데이터
     * @returns {Promise<object>} 결과
     */
    static async updateDocument(collection, id, data) {
        console.log(`🔄 Firestore 업데이트: ${collection}/${id}`);
        
        // Firestore 업데이트
        const result = await window.FirestoreHelper.setDocument(collection, id, data);
        
        // 성공 시 캐시 무효화
        if (result.success) {
            CacheHelper.clearCache(CacheHelper.getCacheKey(collection, id));
            CacheHelper.invalidateCollection(collection);
            console.log(`🔄 캐시 무효화: ${collection}`);
        }
        
        return result;
    }
    
    /**
     * 문서 삭제 (캐시 무효화)
     * @param {string} collection - 컬렉션 이름
     * @param {string} id - 문서 ID
     * @returns {Promise<object>} 결과
     */
    static async deleteDocument(collection, id) {
        try {
            console.log(`🗑️ Firestore 삭제: ${collection}/${id}`);
            
            // Firestore에서 동적 import
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
            
            // 문서 참조
            const docRef = doc(window.db, collection, id);
            
            // 삭제
            await deleteDoc(docRef);
            
            // 캐시 무효화
            CacheHelper.clearCache(CacheHelper.getCacheKey(collection, id));
            CacheHelper.invalidateCollection(collection);
            console.log(`🔄 캐시 무효화: ${collection}`);
            
            return { success: true };
        } catch (error) {
            console.error(`❌ 삭제 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 조건부 조회 (캐싱 없음 - 동적 쿼리)
     * @param {string} collection - 컬렉션 이름
     * @param {Array} conditions - 조건 배열
     * @returns {Promise<object>} 조회 결과
     */
    static async queryDocuments(collection, conditions) {
        console.log(`🔄 Firestore 조회 (조건부): ${collection}`);
        return await window.FirestoreHelper.queryDocuments(collection, conditions);
    }
}

// 전역 객체로 내보내기
window.CacheHelper = CacheHelper;
window.CachedFirestoreHelper = CachedFirestoreHelper;

// 주기적으로 오래된 캐시 정리 (5분마다)
setInterval(() => {
    CacheHelper.clearOldCache();
}, 5 * 60 * 1000);

console.log('✅ Cache Helper 로드 완료');
