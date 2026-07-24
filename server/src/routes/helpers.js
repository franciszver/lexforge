// fakePrismaClient's update/delete throw a plain Error when the record
// doesn't exist. This turns that into a null result so routes can map it to
// a 404 instead of a 500, without every route hand-rolling a try/catch.
export async function withNotFound(promise) {
  try {
    return await promise;
  } catch (err) {
    if (/not found/i.test(err.message)) return null;
    throw err;
  }
}
