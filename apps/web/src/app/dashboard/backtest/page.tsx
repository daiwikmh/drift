import { Research } from "@/features/trade/components/Research";

export default function BacktestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Research</h1>
        <p className="mt-1 text-sm text-white/55">
          Let DRIFT find the best honest config for a market — optimised on past
          data, proven on data it never saw — then deploy it in one click.
        </p>
      </div>
      <Research />
    </div>
  );
}
