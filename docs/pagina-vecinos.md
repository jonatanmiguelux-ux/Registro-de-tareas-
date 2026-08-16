# La página pública de vecinos-lacosta.com.ar

Guía para construir y mantener la cara pública del servicio: qué tiene que
decir, cómo se ve y por qué cada decisión es la que es.

La página ya existe en `src/app/(vecino)/alumbrado/page.tsx`. Este documento
es el criterio detrás de ella, para que cualquiera —vos, un diseñador, otro
programador— pueda modificarla sin romper lo que la hace funcionar.

---

## 1. Para quién es, y en qué momento

Esto no se lee sentado en un escritorio. El caso típico es:

> Son las nueve de la noche. La cuadra está a oscuras desde hace días. Alguien
> agarra el celular, con una mano, parado en la vereda o desde el sillón, y
> busca cómo avisar. No es técnico, no tiene ganas de leer, y ya tuvo una mala
> experiencia con trámites municipales.

De ahí salen tres consecuencias que mandan sobre todo lo demás:

- **Primero el celular.** No es "que también funcione en el celular": es que
  la pantalla chica es el caso principal y la de escritorio es la excepción.
- **Diez segundos para entender.** Si en ese tiempo no sabe qué puede pedir y
  qué va a pasar, se va.
- **Cero jerga.** Nada de "incidente", "derivación", "cuadrilla" antes de
  explicar qué es. La palabra que usa la gente es *luz*, no *luminaria* — la
  página puede usar las dos, pero nunca sólo la segunda.

## 2. El único trabajo de la página

**Que la persona llegue al formulario entendiendo qué va a pasar después.**

Todo lo que no sirva a eso sobra. No es una página institucional, no es una
carta de presentación del municipio, no lleva noticias ni fotos de
funcionarios.

## 3. Lo que hay que decir — y lo que no hay que prometer

Esta es la parte más importante del documento.

**Hoy el vecino no espera nada.** Va a la delegación, avisa, y no sabe más.
En cuanto la página exista, va a empezar a esperar. Si esa expectativa no se
cumple, el canal queda peor que antes: la gente lo usa dos veces, se frustra,
y después dice que "no sirve para nada".

Por eso:

| Decir | No decir |
|---|---|
| "Podés ver en qué estado quedó tu reclamo" | "Lo resolvemos en 48 horas" |
| "Entra en el trabajo del día de la cuadrilla de tu zona" | "Un equipo va a ir a tu domicilio" |
| "El municipio lo carga en el sistema" | "Reparación garantizada" |
| "No podemos prometerte una fecha" | *(callarse el tema)* |

La pregunta "¿cuánto tarda?" va **primera** en las preguntas frecuentes, y se
contesta con la verdad. Una respuesta honesta al principio compra más
paciencia que una promesa incumplida.

## 4. Lo que la página tiene que reflejar del funcionamiento real

Estos datos no son adorno: si la página dice otra cosa que la app, el vecino
se encuentra con una sorpresa.

**Las tres fallas que se pueden reportar**, y nada más:

- **No funciona** — no enciende de noche.
- **Encendida de día** — queda prendida con luz natural.
- **Intermitente** — prende y apaga sola.

**Lo que se le va a pedir en el formulario**, todo obligatorio:

localidad · calle · altura · una foto · una descripción

El correo es lo único opcional. Conviene anticiparlo en la página: alguien que
sabe de antemano que necesita sacar una foto, la saca antes de empezar.

**Lo que recibe a cambio**: un número de seguimiento, en el momento, sin crear
cuenta ni contraseña. Con ese número vuelve cuando quiera a ver el estado.

**A dónde va**: a la cuadrilla de su zona, automáticamente.

| Cuadrilla | Zona |
|---|---|
| 1 | Nueva Atlantis y Mar de Ajó |
| 2 | De Costa Azul a Mar del Tuyú |
| 3 | Santa Teresita y Costa Chica |
| 4 | De Las Toninas a San Clemente |

Mostrar las zonas cumple una función concreta: le confirma al vecino que su
localidad está cubierta. Si no ve la suya en la lista, algo hay que revisar.

## 5. Estructura de la página

En este orden. Cada sección justifica su lugar:

1. **Encabezado** — nombre del servicio y nada más. Sin menú: no hay adónde ir.
2. **La pregunta y el botón.** El título es una pregunta que el visitante
   responde que sí ("¿Hay una luz que no funciona en tu cuadra?"), una línea
   que quita la fricción principal —no hay que ir a la delegación, no hay que
   crear cuenta— y el botón. **El botón tiene que verse sin desplazar la
   pantalla en un celular.**
3. **Qué podés reportar** — las tres fallas, en tarjetas.
4. **Cómo funciona** — los cuatro pasos del circuito, numerados. Acá la
   numeración sí corresponde: es una secuencia real en el tiempo.
5. **Las cuadrillas y sus zonas** — la confirmación de cobertura.
6. **Preguntas frecuentes** — arrancando por la de los plazos.
7. **Cierre con el botón otra vez.** Quien llegó hasta abajo leyendo, ya se
   convenció; no hay que hacerlo subir de nuevo.
8. **Pie** — quién es el municipio, y el enlace al formulario.

El botón aparece **tres veces** (arriba, al cierre, en el pie). No es
repetición por descuido: en un celular, la distancia entre convencerse y poder
actuar tiene que ser cero en cualquier punto del recorrido.

## 6. El sistema visual

Colores claros, alto contraste. Estos valores ya están definidos como variables
en `src/app/globals.css` y **no hay que inventar otros**: usar los que están es
lo que hace que la página del vecino y la del municipio se sientan del mismo
sistema aunque no compartan nada visible.

| Rol | Valor | Dónde |
|---|---|---|
| Fondo de página | `#f4f6f9` | El plano de atrás |
| Superficie | `#ffffff` | Tarjetas, encabezado, pie |
| Tinta principal | `#0f1620` | Títulos y texto fuerte |
| Tinta secundaria | `#4a5666` | Párrafos y explicaciones |
| Tinta terciaria | `#6b7686` | Notas al pie, datos menores |
| Acento | `#1d4ed8` | Botones y enlaces |
| Acento suave | `#eef3ff` | Fondos de realce, números de paso |
| Línea | `#e3e8ef` | Separadores y bordes de tarjeta |

**Un solo acento.** El azul es lo único saturado de la página. Si algo más
pide color, es señal de que compite con el botón — y el botón tiene que ganar
siempre.

**El texto secundario es más oscuro de lo que se estila.** `#4a5666` en vez de
un gris claro. Esta página se lee a veces al sol, parado en la vereda: los
grises tibios de moda directamente desaparecen.

**Tipografía**: la del sistema (`system-ui`). No hay ninguna fuente cargada, y
es a propósito — una tipografía externa son entre 50 y 200 KB que alguien
descarga con datos móviles antes de ver la primera palabra. La del sistema
aparece instantánea y es la que esa persona ya lee todo el día.

Jerarquía:

- Título principal: 1.875 rem en celular, 2.25 rem en pantalla grande, peso 600
- Títulos de sección: 1.125 rem, peso 600
- Texto: 1 rem, interlineado holgado
- Notas: 0.75 rem

**Sin modo oscuro.** La app entera es sólo en claro. Un modo oscuro a medias
se ve peor que no tenerlo.

## 7. Que funcione en el celular

**Se diseña para 360 px de ancho y se agranda desde ahí**, no al revés.

- Todo en **una sola columna** hasta 640 px. Las tarjetas de fallas y de
  cuadrillas pasan a dos o tres columnas recién en pantallas grandes.
- **Ningún elemento tocable mide menos de 44 px de alto.** Es lo que mide un
  dedo. Vale para el botón, para los enlaces del pie, para todo.
- El botón principal ocupa **todo el ancho** en celular.
- **Nada se desplaza en horizontal.** Si una tabla no entra, va dentro de un
  contenedor con desplazamiento propio, nunca haciendo mover la página entera.
- Márgenes laterales de 16 px como mínimo: el texto pegado al borde de la
  pantalla se lee mal y se toca peor.

Probalo achicando la ventana del navegador hasta 360 px de ancho. Si algo se
desborda o hay que hacer zoom para leer, está mal.

## 8. Accesibilidad

No es un extra: mucha de la gente que reporta una luz quemada es gente grande.

- Contraste mínimo 4.5:1 entre texto y fondo. Los valores de la tabla de
  arriba ya lo cumplen.
- El foco del teclado tiene que verse. Ya hay un anillo definido en
  `globals.css` para toda la app.
- Nada depende sólo del color: si algo está resaltado, además dice por qué.
- Los títulos van en orden (`h1`, después `h2`), sin saltarse niveles: es como
  navega un lector de pantalla.
- Las imágenes decorativas van con `aria-hidden`, no con descripciones
  inventadas.

## 9. Lo que NO hay que hacer

- **Un carrusel.** Nadie lo desliza y esconde lo importante.
- **Una ventana emergente** de cookies, de novedades, de nada. Es lo primero
  que hace irse a alguien apurado.
- **Fotos de archivo** de operarios sonriendo. Se nota que son compradas y
  restan credibilidad.
- **Un video explicativo.** Nadie lo mira, y son megas de datos móviles.
- **Pedir datos "para conocerte mejor".** Cada campo de más es gente que
  abandona.
- **Un menú de navegación.** La página tiene un solo destino.
- **Contadores de "reclamos resueltos"** si el número no sale de datos reales
  y actualizados. Un contador congelado es peor que ninguno.

## 10. Cómo tocarla

```
src/app/(vecino)/alumbrado/page.tsx    La página
src/app/(vecino)/layout.tsx            Encabezado y pie
src/app/globals.css                    Colores, tipografía, botones
src/lib/cuadrillas.ts                  Las zonas (se leen solas de acá)
src/lib/reclamos-vecinales.ts          Los tres tipos de falla
```

Las zonas y los tipos de falla **no están escritos a mano en la página**: se
leen de los mismos archivos que usa la app. Si mañana cambia el reparto de
cuadrillas, la página se actualiza sola y no queda diciendo algo que ya no es
cierto.

Para verla mientras trabajás:

```bash
npm run dev
```

y entrá a `http://localhost:3000/alumbrado`. En producción esa misma página es
la portada de `vecinos-lacosta.com.ar`.

---

## Antes de publicarla

- [ ] Se lee entera en un celular sin hacer zoom ni desplazar en horizontal
- [ ] El botón se ve sin desplazar la pantalla al entrar
- [ ] Las once localidades del partido aparecen en alguna zona
- [ ] Los tres tipos de falla coinciden con los del formulario
- [ ] Ninguna frase promete un plazo
- [ ] El formulario se puede completar y enviar de punta a punta
- [ ] El número de seguimiento aparece y sirve para volver a consultar
