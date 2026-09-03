'use client';

import { cn } from '@/shared/lib/utils';

export interface DonutSlice {
  id: string;
  label: string;
  /** Длина дуги считается по этому числу. Деньги в него приходят уже разобранными. */
  value: number;
  /** Готовая подпись значения: форматирует вызывающий, кольцо про деньги не знает. */
  valueLabel?: string;
  /** Любой CSS-цвет, в том числе `var(--chart-1)`. */
  color: string;
}

/** Радиус и толщина в единицах viewBox; наружу кольцо масштабируется как обычный svg. */
const SIZE = 120;
const RADIUS = 48;
const THICKNESS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Зазор между дугами — те самые 2px поверхности, которыми разделяются заливки. */
const GAP = 2;

interface DonutProps {
  slices: DonutSlice[];
  /** Сумма всех дуг. Приходит извне: считать её кольцу нечем — значения приходят строками. */
  total: number;
  /** Крупное значение в центре. Подменяется на значение дуги, пока курсор на ней. */
  centerValue: string;
  centerLabel: string;
  /** Подсвеченная дуга. Состоянием владеет вызывающий: легенда подсвечивает те же дуги. */
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  className?: string;
}

/**
 * Кольцевая диаграмма на чистом SVG: библиотеки графиков в проекте нет, а одно
 * кольцо — это набор окружностей с `stroke-dasharray`, ради которого её тянуть
 * незачем.
 *
 * Цвет здесь ничего не значит сам по себе: каждую дугу называет легенда рядом,
 * и она же держит точные суммы. Наведение подменяет центр — так значение дуги
 * читается без всплывающей подсказки, которая на узких экранах не помещается.
 */
export function Donut({
  slices,
  total,
  centerValue,
  centerLabel,
  hoveredId,
  onHover,
  className,
}: DonutProps) {
  const gap = slices.length > 1 ? GAP : 0;
  const hovered = slices.find((slice) => slice.id === hoveredId);

  /*
   * Смещение дуги — сумма предыдущих, поэтому считается заново на каждой:
   * накапливать его в переменной внутри map запрещает React Compiler
   * (react-hooks/immutability), а дуг здесь не больше семи.
   */
  const arcs = slices.map((slice, index) => {
    const before = slices.slice(0, index).reduce((sum, item) => sum + item.value, 0);
    const length = total > 0 ? (slice.value / total) * CIRCUMFERENCE : 0;

    return {
      slice,
      length: Math.max(length - gap, 0),
      offset: total > 0 ? (before / total) * CIRCUMFERENCE : 0,
    };
  });

  return (
    <div className={cn('relative aspect-square w-full max-w-[228px]', className)}>
      <svg
        viewBox={'0 0 ' + SIZE + ' ' + SIZE}
        className="size-full -rotate-90"
        role="img"
        aria-label={centerLabel + ': ' + centerValue}
      >
        {/* Дорожка под дугами: с ней кольцо остаётся кольцом и при пустом месяце. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={THICKNESS}
        />

        {arcs.map(({ slice, length, offset: arcOffset }) => (
          <circle
            key={slice.id}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={slice.color}
            strokeWidth={THICKNESS}
            strokeDasharray={length + ' ' + (CIRCUMFERENCE - length)}
            strokeDashoffset={-arcOffset}
            className="transition-opacity duration-150"
            opacity={hoveredId && hoveredId !== slice.id ? 0.3 : 1}
            onMouseEnter={() => onHover?.(slice.id)}
            onMouseLeave={() => onHover?.(null)}
          >
            <title>{slice.label + (slice.valueLabel ? ': ' + slice.valueLabel : '')}</title>
          </circle>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="font-heading text-xl font-extrabold sm:text-2xl">
          {hovered?.valueLabel ?? centerValue}
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {hovered?.label ?? centerLabel}
        </span>
      </div>
    </div>
  );
}
