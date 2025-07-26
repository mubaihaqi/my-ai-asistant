// State untuk mode ngambek dan frozen
let isNgambek = false;
let isFrozen = false;

// Fungsi untuk mengatur dan memeriksa mode ngambek
export function setNgambek(status: boolean) {
  isNgambek = status;
  console.log(`[${new Date().toISOString()}] Ngambek mode set to: ${status}`);
}

export function getNgambekStatus() {
  return isNgambek;
}

// Fungsi untuk mengatur dan memeriksa mode frozen
export function setFrozen(status: boolean) {
  isFrozen = status;
  console.log(`[${new Date().toISOString()}] Frozen mode set to: ${status}`);
}

export function getFrozenStatus() {
  return isFrozen;
}
