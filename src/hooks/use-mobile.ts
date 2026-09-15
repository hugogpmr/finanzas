import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

// El servidor no conoce el ancho real del viewport: hay que darle un valor
// fijo aquí para que la primera pintada del cliente coincida con el HTML del
// servidor (si no, React lanza un error de hidratación en móvil). Justo
// después de hidratar, useSyncExternalStore vuelve a leer getSnapshot() y
// corrige el valor sin el warning de "setState dentro de un efecto".
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
