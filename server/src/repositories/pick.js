// Small allowlist helper: returns a new object containing only the keys in
// `keys` that are present on `obj`. Used by the repository create/update
// functions to keep server/system fields (trust flags, ids, timestamps, FKs)
// out of client-controlled writes.
export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}
