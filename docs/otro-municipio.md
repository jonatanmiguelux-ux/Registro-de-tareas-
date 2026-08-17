# Poner la app en otro municipio

Esta app se construyó para la Municipalidad de La Costa, pero está preparada
para que la use cualquier otro partido. Cada municipio corre **su propia copia,
con su propia base de datos**, separada de las demás: así los datos de uno
nunca se cruzan con los de otro. Es la forma más segura de que convivan.

Para poner en marcha un municipio nuevo hay tres pasos.

---

## 1. Copiar la app

Se despliega una copia igual que la de La Costa —la guía está en
[desplegar-en-render.md](desplegar-en-render.md)— con su propio alojamiento y
su propia base. No se comparte nada con la instalación existente.

---

## 2. Editar un solo archivo

Todo lo que cambia de un municipio a otro vive en **un único archivo**:

    src/config/municipio.ts

No hay que tocar ninguna otra parte del código. Ese archivo tiene cuatro cosas,
cada una explicada adentro:

| Qué | Ejemplo (La Costa) |
|---|---|
| **Nombre del municipio** | `Municipalidad de La Costa` |
| **Coordenadas** | latitud y longitud de un punto del partido |
| **Localidades** | la sigla de cada una y su nombre completo |
| **Reparto de cuadrillas** | qué localidades cubre cada cuadrilla al arrancar |

Sobre las **coordenadas**: sirven para calcular a qué hora se hace de noche y
avisarle al vecino que prenda el flash. No hace falta precisión: con estar
dentro del partido alcanza. Para conseguirlas, entrá a Google Maps, hacé clic
derecho en cualquier punto del municipio y "¿Qué hay aquí?"; los dos números
que aparecen son la latitud y la longitud.

Sobre el **reparto de cuadrillas**: es sólo el punto de partida. Una vez que la
app está andando, se cambia desde la pantalla "Cuadrillas y zonas" sin tocar el
código.

---

## 3. Comprobar que quedó bien

Antes de desplegar, corré las pruebas:

    npm test

Hay un grupo que revisa justo este archivo: que las coordenadas sean válidas,
que no haya localidades repetidas, y —lo más importante— que **cada localidad
del reparto de cuadrillas esté escrita igual que en la lista de localidades**.
Ese es el error más fácil de cometer al copiar: escribir "Mar de Ajo" en un
lado y "Mar de Ajó" en el otro, y que esa localidad quede sin cuadrilla sin que
nadie se dé cuenta. Si eso pasa, la prueba falla y te dice cuál es.

---

## Lo que NO cambia entre municipios

- El catálogo de materiales de la planilla (se ajusta después, desde la app).
- Los dominios (cada municipio compra los suyos y se configuran en el
  despliegue).
- Las cuentas del personal (las crea cada uno entrando con Google).

## Lo que este esquema todavía no hace

Cada municipio es una instalación aparte: un alojamiento y una actualización
por separado. Para pocos municipios es lo más simple y lo más seguro. Si algún
día fueran muchos, convendría una única app que los atienda a todos —una
arquitectura distinta, con más trabajo y más cuidado para que no se filtren
datos entre partidos—; pero eso recién se justifica cuando el número lo pide.
