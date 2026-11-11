"""Opt-in real browser checks: CAM_BROWSER_TESTS=1 pytest tests/test_ledger_mobile_browser.py.

Requires playwright and Chrome (or CAM_BROWSER_CHANNEL), uses only pytest's temporary DB.
CAM_LEDGER_SCREENSHOTS optionally saves the verified screens for review.
"""
import os
from pathlib import Path
from threading import Thread

import pytest
from werkzeug.serving import make_server

from construction_maintenance import repositories as repo

pytestmark = pytest.mark.skipif(os.getenv('CAM_BROWSER_TESTS') != '1', reason='opt-in browser test')


def test_mobile_ledger_complete_workflow(app):
    browser_api = pytest.importorskip('playwright.sync_api')
    app.config.update(CSRF_ENABLED=True, SESSION_COOKIE_SECURE=False)
    with app.app_context():
        company = repo.get_main_company()
        project = repo.create_project({'company_id': company['id'], 'name': '滨河道路及附属设施综合养护工程（演示）', 'owner': '演示项目负责人', 'notes': '长项目名称与备注应在手机上完整展示，不需要横向滑动。'})
        category = repo.get_db().execute("select id from expense_categories where name='五金辅材及工具'").fetchone()['id']
        for i in range(22):
            repo.create_voucher({'project_id': project, 'voucher_date': '2026-09-16', 'category_id': category, 'transaction_type': '支出', 'amount': '123456.78', 'notes': f'道路巡检与排水设施维修材料采购，包含井盖、工具及运输费用，需保留完整事项说明。（演示 {i:02}）', 'handler_name': '演示经办人', 'payment_status': '未支付', 'review_status': '待复核', 'payment_notes': '项目负责人确认后付款'})
    server = make_server('127.0.0.1', 0, app)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    out = os.getenv('CAM_LEDGER_SCREENSHOTS')
    if out: Path(out).mkdir(parents=True, exist_ok=True)

    try:
        with browser_api.sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel=os.getenv('CAM_BROWSER_CHANNEL', 'chrome'), headless=True)
            page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            expect = browser_api.expect

            def capture(name):
                if out: page.screenshot(path=str(Path(out) / name))

            for width in [320, 375, 390, 768, 1440]:
                page.set_viewport_size({'width': width, 'height': 844 if width < 761 else 1040})
                for name, route in [('projects', '/projects'), ('project-ledger', f'/projects/{project}/vouchers'), ('vouchers', '/vouchers')]:
                    response = page.goto(origin + route, wait_until='networkidle')
                    assert response.status == 200
                    expect(page.locator('.mobile-records-ready')).to_be_visible()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (name, width)
                    table = page.locator('.mobile-records-ready')
                    if width <= 760:
                        assert table.evaluate('(el) => el.scrollWidth <= el.clientWidth'), (name, width, 'table still scrolls')
                        expect(table).to_have_css('display', 'block')
                        first = table.locator('tbody tr').first
                        # All columns and operations belong to the same visible card, with readable wrapping.
                        assert first.locator('td').evaluate_all('(cells) => cells.every(c => c.getBoundingClientRect().right <= innerWidth && c.scrollWidth <= c.clientWidth + 1)')
                        if name != 'projects':
                            expect(page.locator('.ledger-filter-disclosure')).not_to_have_attribute('open')
                            expect(page.locator('.ledger-summary-disclosure')).not_to_have_attribute('open')
                            expect(first.locator('.mobile-record-amount')).to_contain_text('123,456.78')
                            expect(first.locator('.mobile-ledger-statuses')).to_contain_text('未支付')
                            button = first.get_by_role('button', name='编辑明细', exact=True)
                            assert button.bounding_box()['height'] >= 44
                            assert first.bounding_box()['y'] < 844, (name, 'first record below first screen')
                    else:
                        expect(table).to_have_css('display', 'table')
                        if name != 'projects': expect(page.locator('.ledger-filter-disclosure')).to_have_attribute('open')
                    if width in [390, 1440]: capture(f'{name}-{width}.png')

            page.set_viewport_size({'width': 390, 'height': 844})
            page.goto(origin + f'/projects/{project}/vouchers?per_page=15', wait_until='networkidle')
            # Pagination retains the project context; applying a filter resets page and is reflected on the server.
            page.get_by_role('link', name='下一页', exact=True).click()
            page.wait_for_load_state('networkidle')
            assert 'page=2' in page.url
            expect(page.locator('#project-ledger-body tr')).to_have_count(7)
            page.locator('.ledger-filter-disclosure > summary').click()
            page.locator('.ledger-filter-band [name="payment_status"]').select_option('未支付')
            page.locator('.ledger-filter-band button[type="submit"]').click()
            page.wait_for_load_state('networkidle')
            assert 'page=2' not in page.url
            expect(page.locator('.ledger-filter-disclosure > summary')).to_contain_text('已设置 1 项')
            page.locator('.ledger-filter-disclosure > summary').click()
            capture('ledger-mobile-filter.png')
            page.get_by_role('link', name='清除筛选', exact=True).click()
            page.wait_for_load_state('networkidle')
            expect(page.locator('#project-ledger-body tr')).to_have_count(22)

            first = page.locator('#project-ledger-body tr').first
            first.locator('.mobile-ledger-details > summary').click()
            expect(first.locator('.mobile-ledger-details')).to_contain_text('项目负责人确认后付款')
            first.scroll_into_view_if_needed()
            capture('ledger-mobile-record.png')
            # Existing native form remains the save path, with CSRF enabled and the project preselected.
            page.get_by_role('button', name='录入明细', exact=False).click()
            modal = page.locator('#addVoucherModal')
            expect(modal).to_be_visible()
            expect(modal).to_have_attribute('role', 'dialog')
            assert modal.locator('.modal-content').evaluate('(el) => el.scrollWidth <= el.clientWidth')
            modal.locator('[name="voucher_date"]').fill('2026-09-17')
            modal.locator('[name="amount"]').fill('888.88')
            modal.locator('[name="payment_status"]').select_option('未支付')
            modal.locator('[name="notes"]').fill('手机项目内新增验收记录')
            capture('ledger-mobile-add.png')
            modal.get_by_role('button', name='保存', exact=True).click()
            page.wait_for_load_state('networkidle')
            assert f'/projects/{project}/vouchers' in page.url
            with app.app_context():
                entry = repo.get_db().execute("select * from vouchers where notes='手机项目内新增验收记录'").fetchone()
                assert entry and entry['project_id'] == project and entry['amount'] == 888.88

            first = page.locator('#project-ledger-body tr').filter(has_text='手机项目内新增验收记录')
            first.get_by_role('button', name='编辑明细', exact=True).click()
            edit = page.locator('#editVoucherModal')
            expect(edit.locator('[name="amount"]')).to_have_value('888.88')
            # Check the shorter viewport used when the soft keyboard occupies the lower screen.
            page.set_viewport_size({'width': 320, 'height': 568})
            edit.locator('[name="amount"]').fill('999.99')
            edit.locator('[name="payment_status"]').select_option('已支付/已报销')
            edit.get_by_role('button', name='保存', exact=True).click()
            page.wait_for_load_state('networkidle')
            with app.app_context():
                saved = repo.get_db().execute('select amount,payment_status from vouchers where id=?', (entry['id'],)).fetchone()
                assert saved['amount'] == 999.99 and saved['payment_status'] == '已支付/已报销'

            page.set_viewport_size({'width': 390, 'height': 844})
            page.goto(origin + '/vouchers', wait_until='networkidle')
            first = page.locator('#global-ledger-body tr').filter(has_text='手机项目内新增验收记录')
            expect(first.locator('.mobile-ledger-statuses')).to_contain_text('已支付/已报销')
            first.get_by_role('button', name='编辑明细', exact=True).click()
            expect(page.locator('#editVoucherModal')).to_be_visible()
            page.keyboard.press('Escape')
            expect(page.locator('#editVoucherModal')).not_to_be_visible()
            page.locator('#themeToggleBtn').click()
            first.scroll_into_view_if_needed()
            capture('ledger-mobile-dark.png')
            assert not errors, errors
            browser.close()
    finally:
        server.shutdown()
        thread.join(timeout=5)
