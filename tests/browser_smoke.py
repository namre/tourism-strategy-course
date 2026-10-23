"""Offline browser checks: HTTP requests are fulfilled from local files, no server needed."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=next(p for p in ["/usr/bin/chromium","/opt/pw-browsers/chromium"] if Path(p).exists()), headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    def serve(route):
        from urllib.parse import urlparse
        path = urlparse(route.request.url).path
        file = root / (path.lstrip("/") or "index.html")
        types = {".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".json": "application/json", ".txt": "text/plain", ".vtt": "text/vtt", ".csv": "text/csv"}
        if file.is_file() and file.resolve().is_relative_to(root):
            route.fulfill(status=200, body=file.read_bytes(), content_type=types.get(file.suffix, "application/octet-stream"))
        else:
            route.fulfill(status=404, body="Not found")
    page.route("http://course.test/**", serve)
    page.goto("http://course.test/")
    page.get_by_role("heading", name="Стратегия начинается с решения.").wait_for()
    page.goto("http://course.test/#m1l1")
    page.locator("#lesson-answer").fill("Моя обоснованная стратегия с ограничениями.")
    page.locator("input[name=q0][value='1']").check()
    page.locator("input[name=q1][value='2']").check()
    page.get_by_role("button", name="Проверить понимание").click()
    assert "2 из 2" in page.locator("#quiz-result").inner_text()
    page.locator("#complete-lesson").click()
    assert "завершён" in page.locator("#complete-lesson").inner_text()
    page.locator(".skip").evaluate("e=>e.click()")
    assert page.url.endswith("#m1l1")
    page.goto("http://course.test/#lab")
    assert page.locator("#calendar").is_hidden()
    page.locator("#initial-reason").fill("Корпоративный пакет: 1 010 000 до вытеснения; нужен календарь.")
    page.locator("#reveal").click()
    assert page.locator("#calendar").is_visible()
    assert "Прямой" in page.locator("#lab-results h2").inner_text()
    page.locator("#lab-band svg, #lab-band div").first.wait_for()
    page.locator("#margin").fill("1800")
    page.locator("#margin").dispatch_event("input")
    assert "Агрегатор" in page.locator("#lab-results h2").inner_text()
    page.locator("#revision").fill("При 1800 выбираю агрегатор.")
    page.reload()
    assert page.locator("#margin").input_value() == "1800"
    assert page.locator("#revision").input_value() == "При 1800 выбираю агрегатор."
    page.goto("http://course.test/#project")
    long_answer = "Обоснованное решение и его ограничения. " * 300
    page.locator("#project-problem").fill(long_answer)
    page.locator("[data-profile=student]").fill("Иванова Анна Сергеевна")
    with page.expect_download() as dl:
        page.locator("#export-project").click()
    docx_path = Path(dl.value.path())
    import zipfile
    xml = zipfile.ZipFile(docx_path).read("word/document.xml").decode("utf-8")
    assert "Астраханский государственный технический университет" in xml and "Иванова Анна Сергеевна" in xml and "Обоснованное решение" in xml
    assert dl.value.suggested_filename.endswith(".docx")
    page.evaluate("window.print=()=>{}")
    page.locator("#print-project").click()
    assert long_answer in page.locator("#printable-project").inner_text()
    page.goto("http://course.test/#capstone")
    page.locator("[data-track=case]").click()
    assert "Выбрано" in page.locator("[data-track=case]").inner_text()
    page.goto("http://course.test/#kt0")
    for el in page.locator("[data-kt]").all():
        el.fill("Паспорт объекта: экотропа, мощность 120 мест в день.")
    for el in page.locator("[data-check]").all():
        el.check()
    assert "готова" in page.locator("#kt-status").inner_text()
    assert "✓ КТ-0" in page.locator("#sidebar").inner_text()
    page.goto("http://course.test/#m2l2")
    page.locator("figure.media-svg svg, figure.media svg").first.wait_for(timeout=5000)
    page.goto("http://course.test/#guide")
    page.get_by_role("heading", name="Как работать с курсом").wait_for()
    page.goto("http://course.test/#resources")
    with page.expect_download() as event:
        page.locator("#export-all").click()
    data = json.loads(Path(event.value.path()).read_text())
    assert "m1l1" in data["completed"]
    assert data["lab"]["margin"] == 1800
    assert data["capstone"]["track"] == "case" and data["capstone"]["checks"]["kt0_0"] is True
    # Кейсы мировой практики в уроке
    page.goto("http://course.test/#m1r")
    assert page.locator(".case-study").count() == 2
    assert "Вопрос к" in page.locator(".case-study").first.inner_text()
    assert page.locator(".case-study a[href^='https://']").count() >= 2
    # Повторить урок с ИИ: копирование промпта с текстом урока
    page.goto("http://course.test/#m1l1")
    page.locator("details.ai-study summary").click()
    page.evaluate("window.__copied='';document.execCommand=function(){const t=[...document.querySelectorAll('body > textarea[readonly]')].pop();window.__copied=t?t.value:'';return true;}")
    page.locator("[data-copy-prompt=p1]").click()
    copied = page.evaluate("window.__copied")
    assert copied.startswith("Не используй поиск") and "Стратегия начинается с выбора" in copied and "[ТЕКСТ УРОКА]" not in copied
    page.locator("[data-copy-prompt=p4]").click()
    assert "Моя обоснованная стратегия с ограничениями." in page.evaluate("window.__copied")
    # Страница «ИИ в работе» и якорь раздела
    page.goto("http://course.test/#ai")
    page.get_by_role("heading", name="ИИ в работе").wait_for()
    assert page.locator(".prompt-card").count() == 8 and page.locator(".ai-rule").count() >= 6
    page.goto("http://course.test/#ai-pipeline")
    page.get_by_role("heading", name="Итоговая работа с ИИ: восемь шагов").wait_for()
    # Приложения А и Б попадают в Word таблицами
    page.goto("http://course.test/#project")
    page.locator("#project-ailog").fill("14.11 | ГигаЧат | Поиск статистики | Промпт «Найди первоисточники» | Ссылка на Росстат | Цифра +25% не подтвердилась")
    page.locator("#project-claims").fill("1 | Норма тропы 16 человек в день | Паспорт маршрута 1-Д | с. 2 | проверено")
    with page.expect_download() as dl2:
        page.locator("#export-project").click()
    xml2 = zipfile.ZipFile(Path(dl2.value.path())).read("word/document.xml").decode("utf-8")
    assert "ЖУРНАЛ ИСПОЛЬЗОВАНИЯ ИИ" in xml2.upper() and "Норма тропы 16 человек в день" in xml2 and "Что отверг и почему" in xml2
    # Таблица, вставленная из ИИ в формате Markdown или из Excel (табуляция), распознаётся без сдвига колонок
    page.locator("#project-claims").fill("| № | Утверждение | Откуда | Страница или фрагмент | Статус |\n|---|---|---|---|---|\n| 1 | Норма тропы 16 человек в день | Паспорт маршрута 1-Д | с. 2 | проверено |\n2\tПик — середина июля\tRUSSPASS\tабзац 3\tпроверено")
    assert "Распознано строк таблицы: 2" in page.locator("#status-claims").inner_text()
    with page.expect_download() as dl3:
        page.locator("#export-project").click()
    xml3 = zipfile.ZipFile(Path(dl3.value.path())).read("word/document.xml").decode("utf-8")
    assert "---" not in xml3 and "RUSSPASS" in xml3 and xml3.count("Страница или фрагмент") == 1
    # На КТ-6 первой кнопкой скачивается итоговая стратегия с приложениями
    page.goto("http://course.test/#kt6")
    with page.expect_download() as dl4:
        page.locator("#export-strategy-kt").click()
    xml4 = zipfile.ZipFile(Path(dl4.value.path())).read("word/document.xml").decode("utf-8")
    assert "Обоснованное решение" in xml4 and "ТАБЛИЦА УТВЕРЖДЕНИЙ" in xml4.upper()
    with page.expect_download() as dl5:
        page.locator("#export-capstone-kt").click()
    xml5 = zipfile.ZipFile(Path(dl5.value.path())).read("word/document.xml").decode("utf-8")
    assert "Итоговая стратегия" in xml5 and "ЖУРНАЛ ИСПОЛЬЗОВАНИЯ ИИ" in xml5.upper()
    # Мобильная вёрстка без горизонтальной прокрутки на новых страницах
    page.set_viewport_size({"width": 390, "height": 844})
    for route in ["home", "m1r", "m2p", "ai", "kt6", "project"]:
        page.goto(f"http://course.test/#{route}")
        page.wait_for_timeout(150)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), route
    assert errors == [], errors
    print("PASS: lesson, quiz, completion, skip link, staged case, sensitivity, persistence, print, export, case cards, AI prompts copy, AI page, appendices in Word, mobile layout; no JS errors")
    browser.close()
