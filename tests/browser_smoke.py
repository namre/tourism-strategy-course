"""Offline browser checks: HTTP requests are fulfilled from local files, no server needed."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    def serve(route):
        from urllib.parse import urlparse
        path = urlparse(route.request.url).path
        file = root / (path.lstrip("/") or "index.html")
        types = {".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".md": "text/plain", ".csv": "text/csv"}
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
    assert "Прямое привлечение" in page.locator("#lab-results h2").inner_text()
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
    page.evaluate("window.print=()=>{}")
    page.locator("#print-project").click()
    assert long_answer in page.locator("#printable-project").inner_text()
    page.goto("http://course.test/#resources")
    with page.expect_download() as event:
        page.locator("#export-all").click()
    data = json.loads(Path(event.value.path()).read_text())
    assert "m1l1" in data["completed"]
    assert data["lab"]["margin"] == 1800
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto("http://course.test/#home")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert errors == [], errors
    print("PASS: lesson, quiz, completion, skip link, staged case, sensitivity, persistence, print, export, mobile layout; no JS errors")
    browser.close()
