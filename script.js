document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. SELECCIÓN DE ELEMENTOS DEL DOM PARA PROYECTOS ---
    const tarjetasProyecto = document.querySelectorAll(".tarjeta-proyecto");
    const botonesFiltro = document.querySelectorAll(".btn-filtro");

    // --- 2. CONFIGURAR EVENTOS PARA LOS BOTONES DE HITO (+ y -) ---
    tarjetasProyecto.forEach(tarjeta => {
        const btnSumar = tarjeta.querySelector(".btn-sumar");
        const btnRestar = tarjeta.querySelector(".btn-restar");
        
        if (btnSumar && btnRestar) {
            // Evento click para incrementar el avance
            btnSumar.addEventListener("click", () => {
                actualizarHitos(tarjeta, 1);
            });

            // Evento click para decrementar el avance
            btnRestar.addEventListener("click", () => {
                actualizarHitos(tarjeta, -1);
            });
        }
    });

    // --- 3. FUNCIÓN PARA ACTUALIZAR EL PROGRESO EN TIEMPO REAL ---
    function actualizarHitos(tarjeta, cambio) {
        const textoPorcentaje = tarjeta.querySelector(".texto-porcentaje");
        const barraFill = tarjeta.querySelector(".barra-progreso-fill");
        const badge = tarjeta.querySelector(".badge");
        
        const infoTexto = tarjeta.querySelector(".info-progreso span").textContent;
        const match = infoTexto.match(/(\d+)\s+de\s+(\d+)/);
        
        if (!match) return;
        
        let actual = parseInt(match[1]);
        let total = parseInt(match[2]);

        actual += cambio;
        if (actual < 0) actual = 0;
        if (actual > total) actual = total;

        let porcentaje = Math.round((actual / total) * 100);

        if (textoPorcentaje) textoPorcentaje.textContent = `${porcentaje}%`;
        if (barraFill) barraFill.style.width = `${porcentaje}%`;
        
        const parrafoInfo = tarjeta.querySelector(".info-progreso span");
        parrafoInfo.innerHTML = `Avance: <strong class="texto-porcentaje">${porcentaje}%</strong> (${actual} de ${total} hitos)`;

        if (porcentaje === 100) {
            badge.textContent = "Completada";
            badge.className = "badge completada";
            tarjeta.setAttribute("data-estado", "Completada");
        } else if (porcentaje > 0) {
            badge.textContent = "En progreso";
            badge.className = "badge en-progreso";
            tarjeta.setAttribute("data-estado", "En progreso");
        } else {
            badge.textContent = "Pendiente";
            badge.className = "badge pendiente";
            tarjeta.setAttribute("data-estado", "Pendiente");
        }
    }

    // --- 4. CONFIGURAR EVENTOS DE FILTRADO ---
    botonesFiltro.forEach(boton => {
        boton.addEventListener("click", () => {
            botonesFiltro.forEach(b => b.classList.remove("activo"));
            boton.classList.add("activo");

            const filtroSeleccionado = boton.getAttribute("data-filtro");

            tarjetasProyecto.forEach(tarjeta => {
                const estadoTarjeta = tarjeta.getAttribute("data-estado");
                
                if (filtroSeleccionado === "todos" || estadoTarjeta === filtroSeleccionado) {
                    tarjeta.style.display = "flex";
                } else {
                    tarjeta.style.display = "none";
                }
            });
        });
    });

    // --- 5. LÓGICA DEL FORMULARIO Y NOTIFICACIÓN FLOTANTE ---
    const formulario = document.getElementById('form-contacto');
    const mensajeExito = document.getElementById('mensaje-exito');
    const notificacionFlotante = document.getElementById('notificacion-flotante');
    const textoCorto = document.getElementById('texto-corto');
    const textoCompleto = document.getElementById('texto-completo');
    
    let estaExpandida = false;

    if (formulario) {
        formulario.addEventListener('submit', function(evento) {
            evento.preventDefault();

            // Mensaje de éxito en el formulario
            mensajeExito.textContent = "Se envió correctamente tu consulta propuesta";
            mensajeExito.style.display = "block";

            // Reiniciar estado de la notificación
            estaExpandida = false;
            textoCorto.style.display = "block";
            textoCompleto.style.display = "none";
            notificacionFlotante.style.backgroundColor = "#2e7d32";

            // Mostrar notificación arriba (bajándola a 20px)
            notificacionFlotante.style.top = "20px";

            formulario.reset();

            // Ocultar mensajes tras 7 segundos
            setTimeout(function() {
                mensajeExito.style.display = "none";
                notificacionFlotante.style.top = "-200px";
            }, 7000);
        });
    }

    if (notificacionFlotante) {
        notificacionFlotante.addEventListener('click', function() {
            if (!estaExpandida) {
                textoCorto.style.display = "none";
                textoCompleto.style.display = "block";
                notificacionFlotante.style.backgroundColor = "#1b5e20";
                estaExpandida = true;
            } else {
                textoCorto.style.display = "block";
                textoCompleto.style.display = "none";
                notificacionFlotante.style.backgroundColor = "#2e7d32";
                estaExpandida = false;
            }
        });
    }
});