(function () {
  function initAnimations() {
    if (typeof gsap === "undefined") return;

    gsap.from(".top-hud", {
      y: -28,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      delay: 0.15
    });

    gsap.from(".hero-copy > *", {
      y: 34,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      delay: 0.35
    });

    gsap.from(".hero-visual", {
      scale: 0.88,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      delay: 0.45
    });

    gsap.from(".dashboard > *", {
      y: 42,
      opacity: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.7
    });

    gsap.from(".intel-card", {
      y: 34,
      opacity: 0,
      duration: 0.8,
      stagger: 0.06,
      ease: "power3.out",
      delay: 0.9
    });
  }

  window.addEventListener("DOMContentLoaded", initAnimations);
})();
