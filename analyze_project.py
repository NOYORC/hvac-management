#!/usr/bin/env python3
import os
import json

# 프로젝트 구조 분석
structure = {
    "pages": [],
    "scripts": [],
    "styles": [],
    "total_size": 0
}

# HTML 파일 분석
for file in os.listdir('.'):
    if file.endswith('.html') and not file.startswith('setup') and not file.startswith('migrate') and not file.startswith('add-inspectors'):
        size = os.path.getsize(file)
        structure["pages"].append({"name": file, "size": size})
        structure["total_size"] += size

# JS 파일 분석
if os.path.exists('js'):
    for file in os.listdir('js'):
        if file.endswith('.js'):
            size = os.path.getsize(f'js/{file}')
            structure["scripts"].append({"name": file, "size": size})
            structure["total_size"] += size

# CSS 파일 분석
if os.path.exists('css'):
    for file in os.listdir('css'):
        if file.endswith('.css'):
            size = os.path.getsize(f'css/{file}')
            structure["styles"].append({"name": file, "size": size})
            structure["total_size"] += size

# 정렬
structure["pages"].sort(key=lambda x: x["size"], reverse=True)
structure["scripts"].sort(key=lambda x: x["size"], reverse=True)
structure["styles"].sort(key=lambda x: x["size"], reverse=True)

print(json.dumps(structure, indent=2, ensure_ascii=False))
