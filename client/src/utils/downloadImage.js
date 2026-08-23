// A plain <a download> only ever lands a mobile save in the Files/Downloads
// app, never the Photos library. The Web Share API's file sharing is what
// actually offers "Save Image"/"Save to Photos" in the native share sheet,
// so we use that on mobile (it has to be called directly from a click/tap,
// same as getUserMedia) and fall back to the classic anchor download on
// desktop browsers that don't support sharing files.
//
// Returns "share" or "file" for whichever path actually ran, or null if the
// user backed out of the share sheet without picking anything -- callers
// should only report success on a non-null result.
export async function downloadImage(dataUrl, filename) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "share";
    } catch (err) {
      if (err?.name === "AbortError") return null;
      // Sharing failed for some other reason -- fall through to a download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "file";
}
