#!/bin/bash

# PWA 메타 태그
PWA_TAGS='    <!-- PWA Meta Tags -->
    <meta name="description" content="공조설비 점검 및 관리 시스템">
    <meta name="theme-color" content="#667eea">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="HVAC 관리">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/svg+xml" href="/icons/icon-192x192.svg">
    <link rel="apple-touch-icon" href="/icons/icon-192x192.svg">'

# 처리할 HTML 파일들
FILES=(
    "inspection.html"
    "dashboard.html"
    "equipment-list.html"
    "equipment-search.html"
    "equipment-history.html"
    "qr-generator.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        # 이미 PWA 태그가 있는지 확인
        if grep -q "PWA Meta Tags" "$file"; then
            echo "⏭️  $file - 이미 PWA 태그가 있음"
        else
            # <title> 태그 다음에 PWA 태그 삽입
            sed -i "/<title>/a\\
$PWA_TAGS" "$file"
            echo "✅ $file - PWA 태그 추가 완료"
        fi
    else
        echo "❌ $file - 파일 없음"
    fi
done

echo ""
echo "🎉 PWA 태그 추가 완료!"
