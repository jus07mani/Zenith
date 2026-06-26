(function () {
  function activateTiltCards() {
    const cards = document.querySelectorAll(".tilt-card");

    cards.forEach((card) => {
      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const rotateY = ((x / rect.width) - 0.5) * 6;
        const rotateX = ((y / rect.height) - 0.5) * -6;

        card.style.transform = `translateY(-5px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  function activateGlassReflection() {
    const glassItems = document.querySelectorAll(".premium-glass");

    glassItems.forEach((item) => {
      item.addEventListener("mousemove", (event) => {
        const rect = item.getBoundingClientRect();

        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        item.style.setProperty("--mx", `${x}%`);
        item.style.setProperty("--my", `${y}%`);
      });
    });
  }

  function activateHeroParallax() {
    const hero = document.querySelector(".hero-section");
    const visual = document.querySelector(".hero-visual");

    if (!hero || !visual) return;

    hero.addEventListener("mousemove", (event) => {
      const rect = hero.getBoundingClientRect();

      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      visual.style.transform = `translate3d(${x * 16}px, ${y * 16}px, 0)`;
    });

    hero.addEventListener("mouseleave", () => {
      visual.style.transform = "";
    });
  }

  function initEffects() {
    activateTiltCards();
    activateGlassReflection();
    activateHeroParallax();
  }

  window.addEventListener("DOMContentLoaded", initEffects);
})();
