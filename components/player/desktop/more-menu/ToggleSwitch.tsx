'use client';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  isRotated: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

// player 浮层菜单局部开关：button + role=switch 实现，含 glow 与横屏尺寸分支。
export function ToggleSwitch({
  checked,
  onChange,
  isRotated,
  disabled = false,
  ariaLabel,
}: ToggleSwitchProps) {
  const active = checked && !disabled;

  const background = disabled
    ? 'bg-white/5 opacity-40 cursor-not-allowed'
    : checked
      ? 'bg-[var(--accent-color)] shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.6)] cursor-pointer'
      : 'bg-white/5 hover:bg-white/10 cursor-pointer';

  const buttonSize = isRotated ? 'w-6 h-3.5' : 'w-8 h-[18px] sm:w-10 sm:h-6';
  const thumbSize = isRotated ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5 sm:w-4.5 sm:h-4.5';
  const thumbTranslate = active
    ? (isRotated ? 'translate-x-2.5' : 'translate-x-3.5 sm:translate-x-4.5')
    : 'translate-x-0';

  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-checked={checked}
      aria-label={ariaLabel}
      role="switch"
      className={`relative rounded-full transition-all duration-300 flex-shrink-0 border border-white/20 ${background} ${buttonSize}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 bg-white rounded-full transition-transform duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.4)] ${thumbSize} ${thumbTranslate}`}
      />
    </button>
  );
}
