#!/bin/bash
echo "=== GitHub Pages 배포 상태 확인 ==="
echo ""
echo "1️⃣ 로컬 Git 상태:"
cd /home/user/webapp
git log --oneline -3
echo ""
echo "2️⃣ 원격 GitHub 최신 커밋:"
curl -s "https://api.github.com/repos/NOYORC/hvac-management/commits/main" | grep -m 1 '"sha"' | cut -d'"' -f4
echo ""
echo "3️⃣ 배포된 admin.js 파일 날짜:"
curl -s -I "https://noyorc.github.io/hvac-management/js/admin.js" | grep "last-modified"
echo ""
echo "4️⃣ 배포된 admin.js에 최신 코드 포함 여부:"
if curl -s "https://noyorc.github.io/hvac-management/js/admin.js" | grep -q "no-parts.*제거"; then
    echo "✅ 최신 코드 배포됨"
else
    echo "❌ 아직 구버전 (배포 대기 중)"
fi
echo ""
echo "5️⃣ GitHub Actions 최근 실행:"
curl -s "https://api.github.com/repos/NOYORC/hvac-management/actions/runs?per_page=1" | grep -E '"status"|"conclusion"|"created_at"' | head -3
