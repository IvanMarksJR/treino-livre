import shutil,time
from playwright.sync_api import sync_playwright
U='http://localhost:8765/index.html';swp='/home/claude/app/sw.js';orig=open(swp).read()
try:
    with sync_playwright() as p:
        b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':780});pg.goto(U);pg.wait_for_timeout(2000);pg.reload();pg.wait_for_timeout(1500)
        print('SW controlando:',pg.evaluate("!!navigator.serviceWorker.controller"),'| aviso oculto:',pg.evaluate("document.querySelector('#upd').hidden"))
        import re;open(swp,'w').write(re.sub(r"treino-livre-v\d+",'treino-livre-v99',orig,count=1))
        pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())");pg.wait_for_function("!document.querySelector('#upd').hidden",timeout=8000)
        print('aviso Nova versão apareceu: True')
        with pg.expect_navigation(timeout=10000):pg.click('#upd button')
        pg.wait_for_timeout(1500);ks=pg.evaluate("caches.keys()");print('caches após atualizar:',ks)
        print('PASS' if 'treino-livre-v99' in ks and 'treino-livre-v12' not in ks else 'FAIL')
        b.close()
finally:
    open(swp,'w').write(orig)
