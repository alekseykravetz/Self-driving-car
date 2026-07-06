import { getIntersectionOffset } from './utils.js';
export function polysIntersect(poly1, poly2) {
    const n1 = poly1.length;
    const n2 = poly2.length;
    const edges1 = n1 === 2 ? 1 : n1;
    const edges2 = n2 === 2 ? 1 : n2;
    for (let i = 0; i < edges1; i++) {
        for (let j = 0; j < edges2; j++) {
            const offset = getIntersectionOffset(poly1[i], poly1[(i + 1) % n1], poly2[j], poly2[(j + 1) % n2]);
            if (offset >= 0) {
                return true;
            }
        }
    }
    return false;
}
