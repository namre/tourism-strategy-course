#!/bin/sh
# Пересборка файлов для студентов: шаблоны .docx/.pptx, PDF-памятки, рабочая тетрадь с пересчитанными формулами, данные кейса .xlsx
set -e
cd "$(dirname "$0")/.."
node tools/build-docs.mjs
python3 tools/build-xlsx.py
SOFFICE="${SOFFICE:-python3 /mnt/skills/public/docx/scripts/office/soffice.py}"
TMP=$(mktemp -d)
for f in Pamyatka_Intervyu Pamyatka_Taynyy-pokupatel Forma_Otzyv-rukovoditelya Cheklisty_KT; do cp templates/$f.docx "$TMP/"; done
(cd "$TMP" && for f in *.docx; do $SOFFICE --headless --convert-to pdf "$f" >/dev/null 2>&1; done)
cp "$TMP"/*.pdf templates/
# пересчёт формул: LibreOffice сохраняет кэшированные значения, чтобы предпросмотр показывал числа
cp data/project-templates.xlsx "$TMP/wb.xlsx" && (cd "$TMP" && mkdir -p out && $SOFFICE --headless --convert-to xlsx --outdir out wb.xlsx >/dev/null 2>&1) && cp "$TMP/out/wb.xlsx" data/project-templates.xlsx
rm -rf "$TMP"; echo done
