// ===== 모바일 최적화 유틸리티 =====

// 모바일 디바이스 감지
const MobileUtils = {
    // 모바일 여부 확인
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // iOS 여부 확인
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    },
    
    // Android 여부 확인
    isAndroid() {
        return /Android/i.test(navigator.userAgent);
    },
    
    // 터치 지원 여부
    hasTouch() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    // 화면 크기 확인
    isSmallScreen() {
        return window.innerWidth <= 768;
    },
    
    // PWA 설치 여부
    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }
};

// 터치 제스처 지원
class TouchGesture {
    constructor(element) {
        this.element = element;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.threshold = 50; // 최소 스와이프 거리 (px)
        
        this.init();
    }
    
    init() {
        if (!this.element) return;
        
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    }
    
    handleTouchStart(e) {
        this.startX = e.changedTouches[0].screenX;
        this.startY = e.changedTouches[0].screenY;
    }
    
    handleTouchEnd(e) {
        this.endX = e.changedTouches[0].screenX;
        this.endY = e.changedTouches[0].screenY;
        this.handleGesture();
    }
    
    handleGesture() {
        const diffX = this.endX - this.startX;
        const diffY = this.endY - this.startY;
        
        // 가로 스와이프가 세로보다 큰 경우
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > this.threshold) {
                if (diffX > 0) {
                    this.onSwipeRight();
                } else {
                    this.onSwipeLeft();
                }
            }
        } else {
            // 세로 스와이프
            if (Math.abs(diffY) > this.threshold) {
                if (diffY > 0) {
                    this.onSwipeDown();
                } else {
                    this.onSwipeUp();
                }
            }
        }
    }
    
    onSwipeLeft() {
        console.log('👈 Swipe Left');
        this.element.dispatchEvent(new CustomEvent('swipeleft'));
    }
    
    onSwipeRight() {
        console.log('👉 Swipe Right');
        this.element.dispatchEvent(new CustomEvent('swiperight'));
    }
    
    onSwipeUp() {
        console.log('👆 Swipe Up');
        this.element.dispatchEvent(new CustomEvent('swipeup'));
    }
    
    onSwipeDown() {
        console.log('👇 Swipe Down');
        this.element.dispatchEvent(new CustomEvent('swipedown'));
    }
}

// 햅틱 피드백 (진동)
const Haptic = {
    // 가벼운 피드백
    light() {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    },
    
    // 중간 피드백
    medium() {
        if ('vibrate' in navigator) {
            navigator.vibrate(20);
        }
    },
    
    // 강한 피드백
    heavy() {
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    },
    
    // 성공 피드백
    success() {
        if ('vibrate' in navigator) {
            navigator.vibrate([10, 30, 10]);
        }
    },
    
    // 경고 피드백
    warning() {
        if ('vibrate' in navigator) {
            navigator.vibrate([30, 50, 30]);
        }
    },
    
    // 에러 피드백
    error() {
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 100, 50, 100, 50]);
        }
    }
};

// 로딩 오버레이 관리
const LoadingOverlay = {
    show(message = '로딩 중...') {
        let overlay = document.getElementById('loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <p>${message}</p>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.querySelector('p').textContent = message;
        overlay.classList.add('active');
    },
    
    hide() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
};

// 오프라인 배너 관리
const OfflineBanner = {
    init() {
        let banner = document.getElementById('offline-banner');
        
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.className = 'offline-banner';
            banner.innerHTML = '<i class="fas fa-wifi-slash"></i> 오프라인 상태입니다';
            document.body.insertBefore(banner, document.body.firstChild);
        }
        
        window.addEventListener('online', () => this.hide());
        window.addEventListener('offline', () => this.show());
        
        // 초기 상태 확인
        if (!navigator.onLine) {
            this.show();
        }
    },
    
    show() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.classList.add('show');
            Haptic.warning();
        }
    },
    
    hide() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.classList.remove('show');
        }
    }
};

// 입력 필드 자동 스크롤 (iOS 키보드 대응)
const InputScroll = {
    init() {
        if (!MobileUtils.isIOS()) return;
        
        const inputs = document.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
        });
    }
};

// Pull-to-Refresh (당겨서 새로고침)
class PullToRefresh {
    constructor(callback) {
        this.callback = callback;
        this.startY = 0;
        this.pulling = false;
        this.threshold = 80; // 새로고침 임계값 (px)
        
        this.init();
    }
    
    init() {
        if (!MobileUtils.hasTouch()) return;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                this.startY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && this.startY > 0) {
                const currentY = e.touches[0].clientY;
                const diff = currentY - this.startY;
                
                if (diff > 10) {
                    this.pulling = true;
                }
                
                if (diff > this.threshold && this.pulling) {
                    // 시각적 피드백 (선택사항)
                    console.log('🔄 Pull to Refresh triggered');
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            if (this.pulling && window.scrollY === 0) {
                const currentY = event.changedTouches[0].clientY;
                const diff = currentY - this.startY;
                
                if (diff > this.threshold) {
                    Haptic.medium();
                    if (this.callback) {
                        this.callback();
                    }
                }
            }
            
            this.pulling = false;
            this.startY = 0;
        }, { passive: true });
    }
}

// 이미지 레이지 로딩
const LazyLoad = {
    init() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
            
            const lazyImages = document.querySelectorAll('img.lazy');
            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            const lazyImages = document.querySelectorAll('img.lazy');
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }
};

// 모바일 초기화
function initMobileOptimization() {
    console.log('📱 모바일 최적화 초기화 시작...');
    
    // 디바이스 정보 로깅
    console.log('Device Info:', {
        isMobile: MobileUtils.isMobile(),
        isIOS: MobileUtils.isIOS(),
        isAndroid: MobileUtils.isAndroid(),
        hasTouch: MobileUtils.hasTouch(),
        isSmallScreen: MobileUtils.isSmallScreen(),
        isStandalone: MobileUtils.isStandalone()
    });
    
    // 오프라인 배너 초기화
    OfflineBanner.init();
    
    // 입력 필드 스크롤 초기화
    InputScroll.init();
    
    // 레이지 로딩 초기화
    LazyLoad.init();
    
    // 모바일 전용 클래스 추가
    if (MobileUtils.isMobile()) {
        document.body.classList.add('mobile');
    }
    
    if (MobileUtils.isIOS()) {
        document.body.classList.add('ios');
    }
    
    if (MobileUtils.isAndroid()) {
        document.body.classList.add('android');
    }
    
    console.log('✅ 모바일 최적화 초기화 완료');
}

// DOMContentLoaded 시 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileOptimization);
} else {
    initMobileOptimization();
}

// 전역으로 export
window.MobileUtils = MobileUtils;
window.TouchGesture = TouchGesture;
window.Haptic = Haptic;
window.LoadingOverlay = LoadingOverlay;
window.OfflineBanner = OfflineBanner;
window.PullToRefresh = PullToRefresh;
window.LazyLoad = LazyLoad;
