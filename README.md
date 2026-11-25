# EcoManagement

Plataforma web vinculada al ODS 13 (Acción por el Clima) para que la comunidad universitaria configure metas ecológicas, monitoree proyectos climáticos y envíe consultas de soporte.


## Estructura
- `index.html`: página principal
- `style.css`: estilos
- `script.js`: interactividad (hitos, filtros, formulario y notificación)
- `img/`: imágenes

## Mejora de acciones sostenibles en Servicios

El original tenía cuatro casillas sin eventos, un contador fijo «0 de 12», un impacto fijo en cero y un botón sin comportamiento. `script.js` solo gestiona Proyectos y Soporte; se mantiene intacto.

Se conserva la estructura, Arial/Georgia, las imágenes y los verdes originales. Se usa un resumen en el formulario en lugar de una ventana emergente: permite comprobar y corregir la selección sin bloquear la página ni añadir manejo de foco de un diálogo. La explicación del cálculo está en un desplegable HTML nativo (`details`). No se agregan recomendaciones, filtros ni lógica de planes.

### Archivos y fragmentos de integración (ya aplicados)

1. `index.html`, líneas 80–82: reemplazar el impacto estático con `#impacto-acciones`, `#progreso-acciones` y `#referencia-impacto`.
2. `index.html`, líneas 91–109: identificar el formulario con `id="form-acciones"`, el fieldset con `id="catalogo-acciones"` y agregar `data-co2="2"`, `"3"`, `"4"`, `"6"` a las casillas `a1`–`a4`. Las etiquetas explicitan la unidad mensual y el carácter estimado.
3. `index.html`, líneas 112–132: sustituir contador y botón estáticos por contador accesible, resumen, explicación del cálculo, estado de guardado, controles y región de mensajes. El botón de confirmación usa `type="submit" disabled` inicialmente.
4. `index.html`, línea 332: después de `script.js`, cargar el archivo independiente:

   ```html
   <script src="acciones.js"></script>
   ```

5. `acciones.js`: incorporar el archivo completo. `render()` actualiza contador, suma, barra, resumen y controles; `persistir()` maneja escritura y eliminación; el bloque final valida y recupera datos al cargar.
6. `style.css`, desde la línea 633: agregar el bloque «Gestión de acciones». Todos los selectores se limitan a `#servicios`, incluidas las reglas responsive y de foco.
7. `tests/acciones.browser.mjs`: pruebas de integración opcionales para desarrollo, sin librerías ni cambios en la aplicación.

### Cálculo, almacenamiento y control

La suma es `Σ data-co2` de las casillas marcadas, expresada en kg CO₂/mes. Las cuatro acciones suman `2 + 3 + 4 + 6 = 15`. Tanto la cantidad disponible como el máximo de la barra se calculan leyendo las casillas del catálogo, sin asumir 12 acciones. La barra compara la selección con el catálogo completo, no con una meta climática ni con una reducción medida.

Los factores proceden del prototipo original y no tienen fuente ni metodología validada. Se asume un mes de práctica habitual para hacer comparable el período; no se extrapolan los planes trimestral y anual. Antes de usar cifras como evidencia ambiental, el equipo debe validar los factores y sus supuestos. La interfaz explica estas limitaciones.

Se distingue el borrador visible de la selección confirmada. Marcar, desmarcar y «Quitar» actualizan inmediatamente el borrador; «Confirmar y guardar acciones» persiste; «Cancelar cambios» recupera la última selección confirmada. Desmarcar todo no elimina silenciosamente lo guardado: se ofrece «Eliminar acciones guardadas». La eliminación se puede deshacer mientras siga abierta la página, hasta una nueva confirmación o eliminación.

Clave de localStorage: `econmanagement.acciones.v1`. Ejemplo:

```json
{"version":1,"acciones":["a1","a3"]}
```

Se guardan IDs, no HTML ni totales: el impacto se recalcula al recuperar. Los IDs desconocidos o repetidos se omiten con aviso; un formato incompatible o JSON dañado no se borra automáticamente. Una confirmación posterior puede reemplazarlo. Ante fallos de escritura o eliminación, el estado confirmado no cambia y se conserva el borrador para reintentar con el mismo botón.

Los datos pertenecen a este navegador, dispositivo y origen (incluido el puerto). No hay servidor de datos ni sincronización de sesiones/pestañas. Los cambios sin confirmar y la posibilidad de deshacer no sobreviven a una recarga.

### Pruebas automatizadas

Con el servidor local activo, desde la carpeta que contiene `index.html`:

```powershell
node --check acciones.js
node tests/acciones.browser.mjs
```

Requisitos de desarrollo: Node 22+ y Chrome o Edge instalado. No se instala ningún paquete. Si el servidor usa otra dirección, definir `TEST_URL`; si el navegador está en otra ubicación, definir `CHROME_PATH`. La aplicación sigue siendo HTML/CSS/JS puro y no necesita Node para funcionar.

El script usa un perfil temporal aislado (no accede a las selecciones del navegador personal), ejecuta 26 comprobaciones y guarda capturas en `tests/artifacts/servicios-1440.png`, `servicios-768.png` y `servicios-390.png`. Comprueba estado vacío, suma, guardado explícito, recarga, edición, cancelación, envío vacío, eliminación, deshacer, datos dañados/desconocidos, fallos de lectura/escritura/eliminación, reintento, ampliación a cinco acciones, ausencia de excepciones y desbordamiento. También verifica que el flujo no altera el HTML de las otras secciones.

### Verificación manual y de accesibilidad

1. Abrir `http://127.0.0.1:8765/#servicios`. Sin datos previos, ver «0 de 4» y confirmación deshabilitada.
2. Marcar Bolsa reutilizable y Apagar luces: ver 2 de 4, 6 kg CO₂/mes, barra en 6 de 15 y dos filas en el resumen.
3. Confirmar y recargar: ambas casillas siguen marcadas y aparece el mensaje de recuperación.
4. Quitar una acción, cancelar y luego repetir confirmando: cancelar restaura; confirmar y recargar conserva la edición.
5. Desmarcar todas: la confirmación se deshabilita. Eliminar las guardadas, deshacer y recargar: se recupera la selección restaurada. Eliminar y recargar sin deshacer: no se recupera ninguna.
6. Abrir «¿Cómo se calcula el impacto?»: comprobar fórmula, factores, período y limitaciones.
7. Navegar solo con Tab, Mayús+Tab, Espacio y Enter. Verificar foco visible, etiquetas clicables, controles nativos y ausencia de trampas de foco. Con lector de pantalla, comprobar anuncios del contador y mensajes (`role="status"`, `aria-live="polite"`). La lectura con tecnología asistiva requiere validación manual; las pruebas automáticas no la sustituyen.
8. Probar a 390, 768 y 1440 px y con zoom de 200 %; comprobar lectura y acceso a todos los controles.

La implementación no implica una mejora demostrada en el puntaje SUS. Repetir las tareas de selección, edición y recuperación con participantes y volver a aplicar el cuestionario para comparar con los 70 puntos iniciales.

La inspección visual general se conserva en `tests/artifacts/inspeccion/report.json`. Ese análisis global señala estilos previos del sitio (sombra de la notificación de Soporte, contraste de las etiquetas de Proyectos, fondo, encabezado y video sin poster). No se modifican por estar fuera del alcance solicitado. Esto no equivale a una certificación de accesibilidad de toda la página. Las 26 pruebas funcionales de acciones sí pasan; se revisaron las capturas de Servicios en los tres anchos.
