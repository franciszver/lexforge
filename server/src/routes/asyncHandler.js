// Wraps an async Express handler so a rejected promise (thrown error) is
// forwarded to next(err) instead of crashing the process. Express 4 has no
// built-in support for this.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
