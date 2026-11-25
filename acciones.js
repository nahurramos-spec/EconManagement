// Gestión independiente de Servicios. No accede a Proyectos ni Soporte.
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const form = document.getElementById('form-acciones');
    if (!form) return;
    const root = document.getElementById('servicios');
    const el = id => root.querySelector(`#${id}`);
    const KEY = 'econmanagement.acciones.v1';
    // El catálogo es la única fuente de IDs y factores; nunca se confían totales guardados.
    const catalogo = [...form.querySelectorAll('#catalogo-acciones input[type="checkbox"][data-co2]')];
    const ids = () => catalogo.filter(input => input.checked).map(input => input.id);
    const factor = input => Number(input.dataset.co2);
    const formato = valor => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(valor);
    const impacto = valor => `${formato(valor)} kg CO₂ / mes`;
    const totalCatalogo = catalogo.reduce((total, input) => total + factor(input), 0);
    let guardadas = [];
    let eliminadas = null;
    let avisoCarga = '';

    function mensaje(texto, tipo = 'exito') {
        el('mensaje-acciones').textContent = texto;
        el('mensaje-acciones').dataset.tipo = tipo;
    }

    function seleccionar(seleccion) {
        catalogo.forEach(input => { input.checked = seleccion.includes(input.id); });
        render();
    }

    function render() {
        const seleccion = ids();
        const total = catalogo.filter(input => input.checked).reduce((sum, input) => sum + factor(input), 0);
        const cambios = JSON.stringify(seleccion) !== JSON.stringify(guardadas);
        el('contador-acciones').textContent = `${seleccion.length} de ${catalogo.length} seleccionadas · ${impacto(total)}`;
        el('impacto-acciones').textContent = impacto(total);
        el('total-acciones').textContent = impacto(total);
        el('progreso-acciones').max = totalCatalogo || 1;
        el('progreso-acciones').value = total;
        el('referencia-impacto').textContent = `${formato(total)} de ${impacto(totalCatalogo)} posibles en este catálogo. No representa una reducción medida.`;
        el('seleccion-vacia').hidden = seleccion.length > 0;
        const lista = el('lista-acciones');
        lista.replaceChildren();
        catalogo.filter(input => input.checked).forEach(input => {
            const nombre = input.labels[0].querySelector('b').textContent.replace(/:$/, '');
            const fila = document.createElement('li');
            const texto = document.createElement('span');
            texto.textContent = `${nombre} · ${impacto(factor(input))}`;
            const quitar = document.createElement('button');
            quitar.type = 'button';
            quitar.className = 'boton-secundario';
            quitar.textContent = 'Quitar';
            quitar.setAttribute('aria-label', `Quitar ${nombre}`);
            quitar.addEventListener('click', () => {
                input.checked = false;
                cambio();
                input.focus();
            });
            fila.append(texto, quitar);
            lista.append(fila);
        });
        el('confirmar-acciones').disabled = seleccion.length === 0;
        el('confirmar-acciones').textContent = seleccion.length ? 'Confirmar y guardar acciones' : 'Selecciona acciones para continuar';
        el('cancelar-acciones').hidden = !cambios;
        el('eliminar-acciones').hidden = guardadas.length === 0;
        el('deshacer-acciones').hidden = eliminadas === null;
        el('estado-acciones').textContent = cambios
            ? `Cambios sin guardar. ${guardadas.length} acciones guardadas. Confirma para guardar tu selección${!seleccion.length && guardadas.length ? ' o usa «Eliminar acciones guardadas» para borrarlas' : ''}.`
            : guardadas.length ? `${guardadas.length} acciones guardadas. Puedes modificarlas con las casillas o con «Quitar» y volver a confirmar.` : 'Sin acciones guardadas.';
    }

    function cambio() {
        render();
        mensaje(ids().length ? 'Selección actualizada. Revisa el resumen y confirma para guardar.' : 'No hay acciones seleccionadas. Selecciona al menos una o cancela los cambios.', 'aviso');
    }

    // Solo actualizar el estado confirmado después de que localStorage tenga éxito.
    function persistir(seleccion) {
        try {
            if (seleccion.length) {
                window.localStorage.setItem(KEY, JSON.stringify({ version: 1, acciones: seleccion }));
            } else {
                window.localStorage.removeItem(KEY);
            }
            guardadas = [...seleccion];
            return true;
        } catch {
            mensaje('No se pudo actualizar el almacenamiento. Tu selección sigue visible, pero los cambios no se guardaron. Habilita el almacenamiento del navegador o libera espacio y vuelve a intentarlo con el mismo botón.', 'error');
            return false;
        }
    }

    form.addEventListener('change', evento => {
        if (catalogo.includes(evento.target)) cambio();
    });
    form.addEventListener('submit', evento => {
        evento.preventDefault();
        const seleccion = ids();
        if (!seleccion.length) {
            mensaje('Selecciona al menos una acción antes de confirmar.', 'aviso');
            return;
        }
        if (!persistir(seleccion)) return;
        eliminadas = null;
        render();
        mensaje('Acciones guardadas correctamente. Se recuperarán al recargar en este navegador.');
    });
    el('cancelar-acciones').addEventListener('click', () => {
        seleccionar(guardadas);
        mensaje('Cambios descartados. Se muestra tu última selección guardada.', 'aviso');
        catalogo[0]?.focus();
    });
    el('eliminar-acciones').addEventListener('click', () => {
        const anteriores = [...guardadas];
        if (!persistir([])) return;
        eliminadas = anteriores;
        seleccionar([]);
        mensaje('Acciones guardadas eliminadas. Puedes deshacer esta eliminación mientras permanezcas en la página.', 'aviso');
        el('deshacer-acciones').focus();
    });
    el('deshacer-acciones').addEventListener('click', () => {
        if (!eliminadas || !persistir(eliminadas)) return;
        eliminadas = null;
        seleccionar(guardadas);
        mensaje('Acciones recuperadas y guardadas correctamente.');
        el('confirmar-acciones').focus();
    });

    try {
        const raw = window.localStorage.getItem(KEY);
        if (raw !== null) {
            const data = JSON.parse(raw);
            if (!data || data.version !== 1 || !Array.isArray(data.acciones) || data.acciones.some(id => typeof id !== 'string')) {
                throw new Error('Formato no compatible');
            }
            guardadas = catalogo.filter(input => data.acciones.includes(input.id)).map(input => input.id);
            if (data.acciones.length !== guardadas.length) avisoCarga = 'Se recuperaron las acciones válidas. Se omitieron acciones desconocidas o repetidas; revisa la selección y confirma para actualizarla.';
        }
    } catch {
        avisoCarga = 'No se pudieron recuperar las acciones guardadas. El almacenamiento puede estar bloqueado o los datos dañados. Puedes seleccionar y confirmar de nuevo para intentar guardarlas. No se han borrado los datos anteriores.';
    }
    seleccionar(guardadas);
    if (avisoCarga) mensaje(avisoCarga, 'aviso');
    else if (guardadas.length) mensaje('Recuperamos tus acciones guardadas. El impacto estimado se ha recalculado.');
});
