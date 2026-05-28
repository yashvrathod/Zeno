import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DualWaveAnimation } from "./DualWaveAnimation.js";

gsap.registerPlugin(ScrollTrigger);

const defaultItems = [
  { name: "Volt R2", brand: "Tesla", image: "tesla.webp" },
  { name: "Éclat", brand: "Chanel", image: "chanel.webp" },
  { name: "Project Ion", brand: "Apple", image: "apple.webp" },
  { name: "AeroLine", brand: "BMW", image: "BMW.webp" },
  { name: "Série Noir", brand: "Saint Laurent", image: "YSL.webp" },
  { name: "UltraRun", brand: "Nike", image: "nike.webp" },
  { name: "Atelier 03", brand: "Hermès", image: "hermes.webp" },
  { name: "Pulse One", brand: "Adidas", image: "adidas.webp" },
  { name: "Linea 24", brand: "Prada", image: "prada.webp" },
  { name: "Echo Series", brand: "Google", image: "google.webp" },
  { name: "Zero", brand: "Polestar", image: "polestar.webp" },
  { name: "Shift/Black", brand: "Balenciaga", image: "balenciaga.webp" },
  { name: "Solar Drift", brand: "Audi", image: "audi.webp" },
  { name: "Nº 27", brand: "Valentino", image: "valentino.webp" },
  { name: "Mode/3", brand: "Samsung", image: "samsung.webp" },
  { name: "Pure Form", brand: "Bottega Veneta", image: "bottega.webp" },
  { name: "Edge", brand: "Sony", image: "sony.webp" },
  { name: "Stillwater", brand: "Aesop", image: "aesop.webp" },
  { name: "Parfum Nº8", brand: "Dior", image: "dior.webp" },
  { name: "Vantage", brand: "Porsche", image: "porsche.webp" },
  { name: "Core", brand: "Microsoft", image: "microsoft.webp" },
  { name: "Archive Green", brand: "Lexus", image: "lexus.webp" },
  { name: "Rosso Linea", brand: "Mercedes-Benz", image: "mercedes.webp" },
  { name: "A-17", brand: "Huawei", image: "huawei.webp" },
];

const componentStyles = `
.dual-wave-wrapper {
  display: flex;
  width: 100%;
  position: relative;
  gap: 25vw;
}

.wave-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-size: clamp(2rem, 10vw, 3rem);
  font-weight: 400;
  line-height: 0.7;
  position: relative;
  z-index: 100;
}

.wave-column-left {
  align-items: flex-start;
}

.wave-column-right {
  align-items: flex-end;
}

.animated-text {
  width: max-content;
  color: #4d4d4d;
  text-transform: uppercase;
  transition: color 300ms ease-out;
}

.animated-text.focused {
  color: white;
  z-index: 2;
}

.image-thumbnail-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, 0);
  width: 15vw;
  height: auto;
  z-index: 1;
  pointer-events: none;
  display: grid;
  place-items: center;
}

.image-thumbnail {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 30vh;
}

@media (max-width: 1023px) {
  .dual-wave-wrapper {
    gap: 10vw;
  }

  .wave-column {
    gap: 2.5rem;
    font-size: 5vw;
  }

  .image-thumbnail-wrapper {
    width: 50vw;
  }
}
`;

const imageCache = new Map();

function preloadSources(sources) {
  return new Promise((resolve) => {
    if (sources.length === 0) { resolve(); return; }
    let loaded = 0;
    const total = sources.length;
    sources.forEach((src) => {
      if (imageCache.has(src)) {
        loaded++;
        if (loaded === total) resolve();
        return;
      }
      const img = new Image();
      img.onload = () => { imageCache.set(src, img); loaded++; if (loaded === total) resolve(); };
      img.onerror = () => { loaded++; if (loaded === total) resolve(); };
      img.src = src;
    });
  });
}

export class DualWaveComponent {
  constructor(container, options = {}) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    this.items = options.items || defaultItems;
    this.waveNumber = options.waveNumber ?? 12;
    this.waveSpeed = options.waveSpeed ?? 1;
    this.loop = options.loop ?? true;
    this.currentImage = null;
    this._animation = null;
    this._styleEl = null;
  }

  async mount() {
    this._injectStyles();
    this._buildDOM();
    const sources = this._collectImageSources();
    await preloadSources(sources);
    this._initAnimation();
  }

  _injectStyles() {
    const id = "dual-wave-component-styles";
    if (document.getElementById(id)) return;
    this._styleEl = document.createElement("style");
    this._styleEl.id = id;
    this._styleEl.textContent = componentStyles;
    document.head.appendChild(this._styleEl);
  }

  _buildDOM() {
    this.container.innerHTML = "";
    this.container.className = "dual-wave-wrapper";
    this.container.dataset.waveNumber = String(this.waveNumber);
    this.container.dataset.waveSpeed = String(this.waveSpeed);

    const leftCol = document.createElement("div");
    leftCol.className = "wave-column wave-column-left";

    const rightCol = document.createElement("div");
    rightCol.className = "wave-column wave-column-right";

    const itemsToRender = this.loop ? [...this.items, ...this.items] : this.items;

    itemsToRender.forEach((item) => {
      const el = document.createElement("div");
      el.className = "animated-text";
      el.textContent = item.name;
      if (item.image) el.dataset.image = item.image;
      leftCol.appendChild(el);
    });

    itemsToRender.forEach((item) => {
      const el = document.createElement("div");
      el.className = "animated-text";
      el.textContent = item.brand;
      rightCol.appendChild(el);
    });

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "image-thumbnail-wrapper";
    const img = document.createElement("img");
    img.className = "image-thumbnail";
    img.alt = "Campaign Image";
    imgWrapper.appendChild(img);

    this.container.appendChild(leftCol);
    this.container.appendChild(imgWrapper);
    this.container.appendChild(rightCol);
  }

  _collectImageSources() {
    const sources = new Set();
    const items = this.loop ? [...this.items, ...this.items] : this.items;
    items.forEach((item) => { if (item.image) sources.add(item.image); });
    const img = this.container.querySelector("img");
    if (img) {
      const src = img.getAttribute("src");
      if (src) sources.add(src);
    }
    return [...sources];
  }

  _initAnimation() {
    this._animation = new DualWaveAnimation(this.container, {
      waveNumber: this.waveNumber,
      waveSpeed: this.waveSpeed,
    });
    this._animation.init();
  }

  destroy() {
    if (this._animation) {
      this._animation.destroy();
      this._animation = null;
    }
    this.container.innerHTML = "";
    this.container.className = "";
    if (this._styleEl && this._styleEl.parentNode) {
      this._styleEl.parentNode.removeChild(this._styleEl);
    }
  }
}
