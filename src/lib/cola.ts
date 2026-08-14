/**
 * Cola de fotos esperando señal, guardada en el navegador (IndexedDB).
 *
 * Quien saca la foto está en la calle, muchas veces sin señal. Antes, si la
 * subida fallaba, la foto se perdía y había que volver al poste. Ahora la
 * foto queda guardada en el celular y se sube sola cuando vuelve la conexión.
 *
 * Se usa IndexedDB y no localStorage porque hay que guardar el archivo
 * entero: localStorage sólo admite texto, y pasar una foto de 5 MB a base64
 * la infla un 33% y revienta la cuota.
 *
 * ---
 *
 * **La regla que evita duplicados.** Una planilla sale de la cola cuando el
 * servidor *responde*, sea lo que sea que responda —incluso un error—, y no
 * cuando responde que salió bien.
 *
 * El motivo es que `POST /api/planillas` crea la fila de la planilla *antes*
 * de mandar la foto al modelo. Si el modelo falla, el servidor contesta 502
 * pero la planilla ya quedó guardada en estado ERROR. Reintentar eso crearía
 * una segunda planilla para la misma foto.
 *
 * Sólo se conserva en la cola lo que nunca llegó al servidor: cuando `fetch`
 * falla de red, que es el caso que esta cola viene a resolver.
 */

const BASE = "registro-tareas";
const ALMACEN = "pendientes";

export type Pendiente = {
  id: number;
  archivo: File;
  nombre: string;
  creadoEn: number;
  /** Cuántas veces se intentó subirla y no había red. */
  intentos: number;
};

export type ResultadoSubida =
  | { estado: "subida"; planillaId: string; nombre: string }
  | { estado: "rechazada"; nombre: string; motivo: string }
  | { estado: "sin-red" };

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: "id", autoIncrement: true });
      }
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}

function transaccion<T>(
  modo: IDBTransactionMode,
  fn: (almacen: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolver, rechazar) => {
        const tx = db.transaction(ALMACEN, modo);
        const pedido = fn(tx.objectStore(ALMACEN));
        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => rechazar(pedido.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** ¿Puede este navegador guardar fotos para después? */
export function hayCola(): boolean {
  return typeof indexedDB !== "undefined";
}

export async function encolar(archivo: File): Promise<void> {
  await transaccion("readwrite", (a) =>
    a.add({
      archivo,
      nombre: archivo.name || "planilla",
      creadoEn: Date.now(),
      intentos: 0,
    } as Omit<Pendiente, "id">),
  );
}

export async function listar(): Promise<Pendiente[]> {
  const filas = await transaccion<Pendiente[]>("readonly", (a) =>
    a.getAll() as IDBRequest<Pendiente[]>,
  );
  return filas.sort((x, y) => x.creadoEn - y.creadoEn);
}

export async function contar(): Promise<number> {
  if (!hayCola()) return 0;
  try {
    return await transaccion<number>("readonly", (a) => a.count());
  } catch {
    return 0;
  }
}

async function quitar(id: number): Promise<void> {
  await transaccion("readwrite", (a) => a.delete(id) as unknown as IDBRequest<undefined>);
}

async function marcarIntento(pendiente: Pendiente): Promise<void> {
  await transaccion("readwrite", (a) =>
    a.put({ ...pendiente, intentos: pendiente.intentos + 1 }),
  );
}

/**
 * Intenta subir una foto de la cola.
 *
 * Devuelve "sin-red" sólo cuando la petición no llegó a destino; en ese caso
 * la foto se conserva. Cualquier respuesta del servidor la saca de la cola,
 * por lo explicado arriba.
 */
async function subirUna(pendiente: Pendiente): Promise<ResultadoSubida> {
  const cuerpo = new FormData();
  cuerpo.append("imagen", pendiente.archivo, pendiente.nombre);

  let respuesta: Response;
  try {
    respuesta = await fetch("/api/planillas", { method: "POST", body: cuerpo });
  } catch {
    await marcarIntento(pendiente);
    return { estado: "sin-red" };
  }

  const datos = await respuesta.json().catch(() => ({}) as Record<string, unknown>);
  await quitar(pendiente.id);

  if (respuesta.ok && typeof datos.id === "string") {
    return { estado: "subida", planillaId: datos.id, nombre: pendiente.nombre };
  }

  return {
    estado: "rechazada",
    nombre: pendiente.nombre,
    motivo:
      typeof datos.error === "string"
        ? datos.error
        : "No se pudo procesar la planilla.",
  };
}

/**
 * Sube todo lo que haya en la cola, de lo más viejo a lo más nuevo.
 *
 * Se corta al primer "sin-red": si no hay conexión para una, no la hay para
 * las que siguen, y seguir intentando sólo gasta batería.
 */
export async function vaciar(): Promise<ResultadoSubida[]> {
  if (!hayCola()) return [];

  const resultados: ResultadoSubida[] = [];
  for (const pendiente of await listar()) {
    const resultado = await subirUna(pendiente);
    resultados.push(resultado);
    if (resultado.estado === "sin-red") break;
  }
  return resultados;
}
