(function () {
  const cursor = document.querySelector(".zenith-cursor");
  if (!cursor) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;

  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.18;
    cursorY += (mouseY - cursorY) * 0.18;

    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  const interactiveItems = document.querySelectorAll(
    "button, a, input, .magnetic-btn, .best-sky-card"
  );

  interactiveItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      cursor.classList.add("cursor-active");
    });

    item.addEventListener("mouseleave", () => {
      cursor.classList.remove("cursor-active");
      item.style.transform = "";
    });

    item.addEventListener("mousemove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      item.style.transform = `translate(${x * 0.06}px, ${y * 0.06}px)`;
    });
  });
})();
