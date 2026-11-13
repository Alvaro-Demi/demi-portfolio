/**
 * Rectángulo en pantalla que envuelve a varios elementos (p. ej. las franjas de una tarjeta
 * de la cinta, o una tarjeta de la rueda). `null` si no ocupan nada.
 */
export function unionRect(elements: Iterable<Element>): DOMRect | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  return right > left && bottom > top ? new DOMRect(left, top, right - left, bottom - top) : null;
}
