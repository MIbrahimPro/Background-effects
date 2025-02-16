// ── CURSOR MOVEMENT ───────────────────────────────

const cursor = document.querySelector(".cursor");

document.addEventListener("mousemove", (e) => {
  const cursorWidth = cursor.offsetWidth;
  const cursorHeight = cursor.offsetHeight;
  cursor.style.transform = `translate(${e.clientX - cursorWidth / 2 - 5}px, ${e.clientY - cursorHeight / 2 - 5}px)`;
});
