// Pruebas de integración con Chrome/Edge real, sin paquetes npm. Node 22+.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const url = process.env.TEST_URL || 'http://127.0.0.1:8765';
const chrome = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
assert.ok(chrome, 'Instala Chrome/Edge o define CHROME_PATH.');
const profile = mkdtempSync(join(tmpdir(), 'econ-acciones-test-'));
const child = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true });
let ws;
let checks = 0;
try {
    const endpoint = await new Promise((resolveEndpoint, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error('Chrome no inició en 20 s.')), 20000);
        child.on('error', reject);
        child.stderr.on('data', data => {
            output += data;
            const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) { clearTimeout(timer); resolveEndpoint(match[1]); }
        });
    });
    ws = new WebSocket(endpoint);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let counter = 0;
    const pending = new Map();
    const errors = [];
    ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
        if (pending.has(msg.id)) {
            const { res, rej, timer } = pending.get(msg.id);
            clearTimeout(timer);
            pending.delete(msg.id);
            if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
        }
    };
    const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
        const id = ++counter;
        const timer = setTimeout(() => { pending.delete(id); rej(new Error(`Timeout: ${method}`)); }, 15000);
        pending.set(id, { res, rej, timer });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params) => send(method, params, sessionId);
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    const evaluate = async expression => {
        const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Error de evaluación');
        return result.result.value;
    };
    const load = async () => {
        await cdp('Page.navigate', { url });
        for (let i = 0; i < 100; i++) {
            if (await evaluate("document.readyState === 'complete' && !!document.querySelector('#form-acciones')")) return;
            await new Promise(res => setTimeout(res, 50));
        }
        throw new Error('La página no cargó. Comprueba TEST_URL y el servidor.');
    };
    const check = async (name, expression) => {
        assert.equal(await evaluate(expression), true, name);
        console.log(`OK ${++checks}. ${name}`);
    };
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const key = 'econmanagement.acciones.v1';
    await load();
    await evaluate('localStorage.clear()'); // Solo el perfil temporal aislado de estas pruebas.
    await load();
    const otrasSecciones = await evaluate("['proyectos','contacto','dashboard','nosotros','galeria','testimonios'].map(id=>document.getElementById(id).outerHTML)");
    await check('Inicio vacío y confirmación deshabilitada', "document.querySelector('#confirmar-acciones').disabled && document.querySelector('#contador-acciones').textContent.startsWith('0 de 4')");
    await click('#a1'); await click('#a3');
    await check('Dos acciones suman 6 kg y actualizan barra y resumen', "document.querySelector('#contador-acciones').textContent.startsWith('2 de 4') && document.querySelector('#impacto-acciones').textContent==='6 kg CO₂ / mes' && document.querySelector('#progreso-acciones').value===6 && document.querySelectorAll('#lista-acciones li').length===2");
    await check('Seleccionar no guarda antes de confirmar', `localStorage.getItem('${key}')===null`);
    await click('#confirmar-acciones');
    await check('Confirmación guarda solo IDs', `JSON.stringify(JSON.parse(localStorage.getItem('${key}')).acciones)==='["a1","a3"]'`);
    await load();
    await check('Recarga recupera selección y recalcula impacto', "document.querySelector('#a1').checked && document.querySelector('#a3').checked && document.querySelector('#total-acciones').textContent==='6 kg CO₂ / mes' && document.querySelector('#mensaje-acciones').textContent.includes('Recuperamos')");
    await click('#lista-acciones button');
    await check('Quitar edita sin borrar lo confirmado', `!document.querySelector('#a1').checked && JSON.parse(localStorage.getItem('${key}')).acciones.length===2`);
    await click('#cancelar-acciones');
    await check('Cancelar restaura selección confirmada', "document.querySelector('#a1').checked && document.querySelector('#a3').checked");
    await click('#a1'); await click('#confirmar-acciones'); await load();
    await check('Edición confirmada persiste al recargar', "!document.querySelector('#a1').checked && document.querySelector('#a3').checked && document.querySelector('#total-acciones').textContent==='4 kg CO₂ / mes'");
    await click('#a3');
    await evaluate("document.querySelector('#form-acciones').requestSubmit()");
    await check('Envío vacío incluso programático no sobrescribe', `document.querySelector('#confirmar-acciones').disabled && JSON.parse(localStorage.getItem('${key}')).acciones[0]==='a3' && document.querySelector('#mensaje-acciones').dataset.tipo==='aviso'`);
    await click('#cancelar-acciones'); await click('#eliminar-acciones');
    await check('Eliminar borra almacenamiento y muestra deshacer', `localStorage.getItem('${key}')===null && !document.querySelector('#deshacer-acciones').hidden && document.querySelector('#progreso-acciones').value===0`);
    await click('#deshacer-acciones');
    await check('Deshacer restaura también almacenamiento', `document.querySelector('#a3').checked && JSON.parse(localStorage.getItem('${key}')).acciones[0]==='a3'`);
    await click('#eliminar-acciones'); await load();
    await check('Eliminación persiste tras recarga', "document.querySelector('#confirmar-acciones').disabled && document.querySelector('#eliminar-acciones').hidden");
    await evaluate(`localStorage.setItem('${key}', '{dañado')`); await load();
    await check('JSON dañado no bloquea interfaz ni borra datos', `document.querySelector('#mensaje-acciones').dataset.tipo==='aviso' && localStorage.getItem('${key}')==='{dañado'`);
    await click('#a2'); await click('#confirmar-acciones');
    await check('Guardar repara datos dañados', `JSON.parse(localStorage.getItem('${key}')).acciones[0]==='a2'`);
    await evaluate(`localStorage.setItem('${key}', JSON.stringify({version:1,acciones:['a2','a2','desconocida','<img onerror=alert(1)>']}))`); await load();
    await check('IDs desconocidos y repetidos se omiten sin inyectar HTML', "document.querySelector('#contador-acciones').textContent.startsWith('1 de 4') && document.querySelector('#total-acciones').textContent==='3 kg CO₂ / mes' && document.querySelector('#mensaje-acciones').textContent.includes('omitieron')");
    await evaluate("window.originalSet = Storage.prototype.setItem; Storage.prototype.setItem = function(){throw new DOMException('Quota','QuotaExceededError')}");
    await click('#a4'); await click('#confirmar-acciones');
    await check('Fallo de escritura conserva borrador y muestra recuperación', "document.querySelector('#a4').checked && document.querySelector('#mensaje-acciones').dataset.tipo==='error' && document.querySelector('#estado-acciones').textContent.includes('sin guardar')");
    await evaluate('Storage.prototype.setItem = window.originalSet'); await click('#confirmar-acciones');
    await check('Reintento guarda el borrador', `JSON.parse(localStorage.getItem('${key}')).acciones.join(',')==='a2,a4'`);
    await evaluate("window.originalRemove=Storage.prototype.removeItem; Storage.prototype.removeItem=function(){throw new Error('Bloqueado')}");
    await click('#eliminar-acciones');
    await check('Fallo de eliminación conserva acciones guardadas', `JSON.parse(localStorage.getItem('${key}')).acciones.length===2 && document.querySelector('#a4').checked && document.querySelector('#mensaje-acciones').dataset.tipo==='error'`);
    await evaluate('Storage.prototype.removeItem=window.originalRemove');
    const script = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "Storage.prototype.getItem=function(){throw new DOMException('Blocked','SecurityError')}" });
    await load();
    await check('Fallo de lectura muestra aviso sin excepción', "document.querySelector('#mensaje-acciones').textContent.includes('No se pudieron recuperar') && document.querySelector('#confirmar-acciones').disabled");
    await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier }); await load();
    // Simula ampliación del catálogo antes de inicializar acciones.js.
    const extra = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('DOMContentLoaded',()=>{const div=document.createElement('div'); div.className='grupo-checkbox'; div.innerHTML='<input type="checkbox" id="a5" data-co2="1"><label for="a5"><b>Acción de prueba:</b> 1 kg CO₂ / mes</label>'; document.querySelector('#catalogo-acciones').prepend(div);},{once:true});` });
    await load(); await click('#a5');
    await check('Catálogo ampliado calcula cantidad y máximo automáticamente', "document.querySelector('#contador-acciones').textContent.startsWith('3 de 5') && document.querySelector('#progreso-acciones').max===16 && document.querySelector('#total-acciones').textContent==='10 kg CO₂ / mes'");
    await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: extra.identifier }); await load();
    await click('#a1'); await click('#a3');
    await check('Las cuatro acciones suman 15 kg', "document.querySelector('#total-acciones').textContent==='15 kg CO₂ / mes' && document.querySelector('#progreso-acciones').value===15");
    assert.deepEqual(await evaluate("['proyectos','contacto','dashboard','nosotros','galeria','testimonios'].map(id=>document.getElementById(id).outerHTML)"), otrasSecciones);
    console.log(`OK ${++checks}. Otras secciones permanecen intactas durante el flujo`);
    mkdirSync(new URL('./artifacts/', import.meta.url), { recursive: true });
    for (const width of [1440, 768, 390]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
        await evaluate("document.querySelector('#form-acciones').scrollIntoView({block:'center'})");
        await check(`Servicios sin desbordamiento a ${width}px`, "[...document.querySelectorAll('#servicios *')].filter(el=>el.getBoundingClientRect().width>0).every(el=>{const r=el.getBoundingClientRect();return r.left>=-1 && r.right<=innerWidth+1})");
        const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
        writeFileSync(new URL(`./artifacts/servicios-${width}.png`, import.meta.url), Buffer.from(data, 'base64'));
    }
    assert.deepEqual(errors, [], 'Sin excepciones JavaScript');
    console.log(`OK ${++checks}. Sin excepciones JavaScript\n${checks} comprobaciones superadas.`);
    await send('Browser.close');
} finally {
    ws?.close();
    child.kill();
    await new Promise(res => setTimeout(res, 700));
    // Eliminar exclusivamente el perfil temporal creado por este proceso.
    if (resolve(profile).startsWith(resolve(tmpdir()) + '/') || resolve(profile).startsWith(resolve(tmpdir()) + '\\')) {
        try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
    }
}
