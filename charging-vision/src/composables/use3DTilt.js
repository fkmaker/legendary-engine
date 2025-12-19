// Composable: use3DTilt
// 为 3D 卡片提供鼠标跟随倾斜效果。
import { ref, onBeforeUnmount } from 'vue';

export function use3DTilt(maxTilt = 14, ease = 0.25) {
  const tiltRef = ref(null);
  let frame = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animate = () => {
    frame = null;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    const el = tiltRef.value;
    if (el) {
      el.style.setProperty('--rotate-x', currentX.toFixed(2) + 'deg');
      el.style.setProperty('--rotate-y', currentY.toFixed(2) + 'deg');
    }
    if (Math.abs(currentX - targetX) > 0.1 || Math.abs(currentY - targetY) > 0.1) {
      frame = requestAnimationFrame(animate);
    }
  };

  const onMouseMove = (e) => {
    if (reduceMotion) return;
    const el = tiltRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    targetY = (x - 0.5) * (maxTilt * 2);
    targetX = -(y - 0.5) * (maxTilt * 2);
    if (!frame) frame = requestAnimationFrame(animate);
  };

  const reset = () => {
    targetX = 0; targetY = 0;
    if (!frame) frame = requestAnimationFrame(animate);
  };

  const onMouseLeave = () => { reset(); };

  onBeforeUnmount(() => { if (frame) cancelAnimationFrame(frame); });

  return { tiltRef, onMouseMove, onMouseLeave };
}

export default use3DTilt;
