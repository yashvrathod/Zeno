gsap.registerPlugin(CustomEase);

CustomEase.create("hop", "0.9,0,0.1,1");
CustomEase.create("glide", "0.8,0,0.2,1");

window.addEventListener("load", () => {

  const introImages =
    document.querySelectorAll(".intro-img");

  // =========================================
  // RESPONSIVE COMPOSITION SYSTEM
  // =========================================

  const isMobile =
    window.innerWidth < 768;

  const introImgScale =
    isMobile ? 0.7 : 0.2;

  const introImgGap =
    isMobile ? 16 : 40;

  const rotations =
    [-15, 5, -7.5, 10, -2.5];

  // =========================================
  // WIDTH CALCULATIONS
  // =========================================

  const introImgScaledWidth =
    window.innerWidth * introImgScale;

  const introImgScaledHeight =
    window.innerHeight * introImgScale;

  const rowWidth =
    introImgScaledWidth * introImages.length +
    introImgGap * (introImages.length - 1);

  const centeredRowX =
    (window.innerWidth - rowWidth) / 2;

  const offscreenRowX =
    centeredRowX - window.innerWidth * 1.3;

  // =========================================
  // INITIAL STATES
  // =========================================

  introImages.forEach((img, i) => {

    const centeredX =
      centeredRowX +
      i * (introImgScaledWidth + introImgGap) +
      introImgScaledWidth / 2 -
      window.innerWidth / 2;

    const offscreenX =
      offscreenRowX +
      i * (introImgScaledWidth + introImgGap) +
      introImgScaledWidth / 2 -
      window.innerWidth / 2;

    const centeredY =
      (window.innerHeight - introImgScaledHeight) / 2;

    gsap.set(img, {
      scale: introImgScale,
      x: offscreenX,
      y: centeredY * 0.08,
      rotation: rotations[i],
      borderRadius: "2rem",
      transformOrigin: "center center",
    });

    img.dataset.centeredX = centeredX;

  });

  // =========================================
  // TIMELINE
  // =========================================

  const tl = gsap.timeline({
    delay: 0.5,
  });

  // PRELOADER

  tl.to(".preloader", {
    scaleX: 1,
    duration: 1.2,
    ease: "glide",

    onComplete: () => {
      gsap.set(".preloader", {
        transformOrigin: "right",
      });
    }
  });

  tl.to(".preloader", {
    scaleX: 0,
    duration: 1,
    ease: "hop",
  });

  tl.to(
    ".preloader-overlay",
    {
      clipPath:
        "polygon(0% 0%,100% 0%,100% 0%,0% 0%)",

      duration: 1.2,
      ease: "hop",
    },
    "<0.2"
  );

  // INTRO IMAGES ENTER

  introImages.forEach((img) => {

    tl.to(
      img,
      {
        x: parseFloat(img.dataset.centeredX),
        duration: 1.5,
        ease: "glide",
      },
      "<0.05"
    );

  });

  // SIDE IMAGES EXIT

  tl.to(
    ".intro-img:nth-child(1), .intro-img:nth-child(2)",
    {
      x: "-120vw",
      duration: 1.5,
      ease: "glide",
    },
    "spread"
  );

  tl.to(
    ".intro-img:nth-child(4), .intro-img:nth-child(5)",
    {
      x: "120vw",
      duration: 1.5,
      ease: "glide",
    },
    "spread"
  );

  // CENTER IMAGE FULLSCREEN

  tl.to(
    ".hero-img",
    {
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      borderRadius: 0,
      duration: 1.8,
      ease: "glide",
    },
    "<"
  );

});