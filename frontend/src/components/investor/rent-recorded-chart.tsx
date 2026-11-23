import {
  CHART_HEIGHT,
  CHART_WIDTH,
  chartPath,
  chartTicks,
  chartX,
  chartY,
  type RentChartModel,
} from "@/lib/investor";
import { formatDayMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Posisi persen di dalam kotak grafik, supaya titik dan label ikut melebar bersama SVG. */
function percentX(x: number) {
  return `${(x / CHART_WIDTH) * 100}%`;
}

function percentY(y: number) {
  return `${(y / CHART_HEIGHT) * 100}%`;
}

const GRID_LINES = [0, 60, 120, 180];

interface RentRecordedChartProps {
  model: RentChartModel;
  period: string;
  /** Teks pembaca layar yang merangkum grafik. */
  label: string;
}

/**
 * Grafik garis tangga sewa tercatat (Figma: Kartu saldo bagi hasil, "Area
 * grafik"). Garis lime di permukaan gelap, satu titik per tanggal bayar, garis
 * target putus-putus di atas, dan garis "Hari ini" hanya selama periode berjalan.
 * SVG melebar mengikuti kartu; garis memakai non-scaling-stroke, sedangkan titik
 * dan label berupa elemen HTML yang diposisikan dengan persen supaya tidak gepeng.
 */
export function RentRecordedChart({ model, period, label }: RentRecordedChartProps) {
  const path = chartPath(model);
  const targetY = chartY(model, model.targetIdr);
  const ticks = chartTicks(model.days);

  return (
    <figure role="img" aria-label={label} className="flex flex-col pt-[22px]">
      <div className="relative h-[180px] w-full">
        <svg
          aria-hidden
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {GRID_LINES.map((y) => (
            <line
              key={y}
              x1={0}
              x2={CHART_WIDTH}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={0}
            x2={CHART_WIDTH}
            y1={targetY}
            y2={targetY}
            className="stroke-muted-foreground"
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          {model.todayDay !== null ? (
            <line
              x1={chartX(model, model.todayDay)}
              x2={chartX(model, model.todayDay)}
              y1={0}
              y2={CHART_HEIGHT}
              className="stroke-muted-foreground"
              strokeWidth={1}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <path
            d={path}
            fill="none"
            className="stroke-success"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <span
          aria-hidden
          className="absolute right-0 -translate-y-full pb-1 font-mono text-xs leading-4 text-muted-foreground tabular-nums"
          style={{ top: percentY(targetY) }}
        >
          {formatRupiah(model.targetIdr)}
        </span>

        {model.steps.map((step) => (
          <span
            key={step.day}
            aria-hidden
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success"
            style={{
              left: percentX(chartX(model, step.day)),
              top: percentY(chartY(model, step.cumulativeIdr)),
            }}
          />
        ))}

        {model.todayDay !== null ? (
          <span
            aria-hidden
            className="absolute bottom-2 pl-1.5 text-xs leading-4 text-foreground"
            style={{ left: percentX(chartX(model, model.todayDay)) }}
          >
            Hari ini
          </span>
        ) : null}
      </div>

      <div aria-hidden className="relative mt-2 h-4 text-xs leading-4 text-muted-foreground">
        {ticks.map((day, index) => (
          <span
            key={day}
            className={cn(
              "absolute whitespace-nowrap",
              index === 0 && "left-0",
              index === ticks.length - 1 && "right-0",
              index !== 0 && index !== ticks.length - 1 && "-translate-x-1/2"
            )}
            style={
              index !== 0 && index !== ticks.length - 1
                ? { left: percentX(chartX(model, day)) }
                : undefined
            }
          >
            {formatDayMonth(`${period}-${String(day).padStart(2, "0")}`)}
          </span>
        ))}
      </div>
    </figure>
  );
}
