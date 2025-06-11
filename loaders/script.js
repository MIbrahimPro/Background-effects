// ── CURSOR MOVEMENT ───────────────────────────────

// const cursor = document.querySelector(".cursor");

// document.addEventListener("mousemove", (e) => {
//   const cursorWidth = cursor.offsetWidth;
//   const cursorHeight = cursor.offsetHeight;
//   cursor.style.transform = `translate(${e.clientX - cursorWidth / 2 - 5}px, ${e.clientY - cursorHeight / 2 - 5}px)`;
// });



// GSAP animation (ensure GSAP library is included in your project)
gsap.to(".fruit", {
  duration: 3,
  rotation: 360,
  transformOrigin: "100px 100px", // Center of the loader
  repeat: -1,
  ease: "linear"
});
