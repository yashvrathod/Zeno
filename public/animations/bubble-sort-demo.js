() => ({
  name: "Bubble Sort",
  totalSteps: 10,
  defaults: {
    array: [5, 2, 8, 1, 9, 3],
    target: 0
  },
  computeStep({ array, stepIndex }) {
    let arr = [...array];
    const steps = [];

    // Pre-compute all bubble sort steps
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        steps.push({ compare: [j, j + 1], swap: arr[j] > arr[j + 1] });
      }
    }

    const current = steps[stepIndex] || { compare: [0, 0], swap: false };
    const [a, b] = current.compare;
    if (a >= 0 && b >= 0 && a < arr.length && b < arr.length) {
      if (current.swap && arr[a] > arr[b]) {
        [arr[a], arr[b]] = [arr[b], arr[a]];
      }
    }

    const explanation = !current.swap
      ? `Comparing arr[${a}]=${arr[a]} and arr[${b}]=${arr[b]} — no swap needed (already in order)`
      : `Comparing arr[${a}]=${array[a]} and arr[${b}]=${array[b]} — SWAPPING! ${array[b]} > ${array[a]}`;

    return {
      array: arr,
      explain: explanation,
      leftIdx: a,
      rightIdx: b,
      highlightIndices: [a, b],
      done: stepIndex >= steps.length - 1,
    };
  },
  render(ctx, step, w, h) {
    const { array, leftIdx, rightIdx } = step;
    const barWidth = Math.min(60, (w - 100) / array.length);
    const startX = (w - array.length * barWidth) / 2;
    const maxVal = Math.max(...array, 1);
    const barMaxH = h - 80;

    array.forEach((val, i) => {
      const barH = (val / maxVal) * barMaxH;
      const x = startX + i * barWidth;
      const y = h - 40 - barH;

      // Color based on state
      let color = "#a855f7";
      if (i === leftIdx) color = "#ef4444";
      else if (i === rightIdx) color = "#f59e0b";

      // Draw bar
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(x + 5, y, barWidth - 10, barH, 6);
      ctx.fill();

      // Draw value
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#f4f4f5";
      ctx.font = "14px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(val.toString(), x + barWidth / 2, y - 12);

      // Draw index
      ctx.fillStyle = "#71717a";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(`[${i}]`, x + barWidth / 2, h - 20);
    });

    // Legend
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#52525b";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Comparing indices ${leftIdx} and ${rightIdx}`, 20, 25);
  }
})
