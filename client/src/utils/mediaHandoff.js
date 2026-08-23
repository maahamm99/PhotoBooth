// A MediaStream can't be put in router navigation state -- pushState requires
// structured-cloneable values, and MediaStream throws a DataCloneError. This
// hands the stream acquired on the home page's create/join click across to
// the booth page via a plain in-memory reference instead (safe as long as
// it's a same-tab SPA navigation, which is all React Router ever does).
let pendingStream = null;

export function setPendingStream(stream) {
  pendingStream = stream;
}

export function takePendingStream() {
  const stream = pendingStream;
  pendingStream = null;
  return stream;
}
