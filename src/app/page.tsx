import Link from "next/link";
import { ArrowRight, Calculator, FileBarChart2, Scale, Sun } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      <header className="border-b">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            住宅性能シミュレーター
          </Link>
          <nav className="text-sm text-muted-foreground flex items-center gap-5">
            <a href="#features" className="hover:text-foreground">特徴</a>
            <a href="#how" className="hover:text-foreground">使い方</a>
            <a href="#disclaimer" className="hover:text-foreground">注意</a>
          </nav>
        </div>
      </header>

      <section className="relative border-b hero-bg">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-16 md:py-24 grid grid-cols-1 md:grid-cols-[1fr_minmax(0,440px)] gap-10 md:gap-12 items-center relative">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary mb-4">
              Neutral · Data-driven
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-normal max-w-[20ch]">
              30年でどちらが得か、<br />
              <span className="text-primary">数字で確かめる。</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-[60ch] leading-relaxed">
              断熱・気密・太陽光・蓄電池の選択を、初期費用と長期ランニングコストの両面から中立的に比較。
              営業トークではなく、計算根拠を開示しながらシミュレーションします。
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link href="/simulator" prefetch={false} className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8">
                シミュレーションを始める <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-muted-foreground">登録不要 / ブラウザ内保存</span>
            </div>
          </div>
          <div className="relative h-[280px] md:h-[420px] order-first md:order-none hero-img" aria-hidden="true" />
        </div>
      </section>

      <section id="features" className="border-b">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-20">
          <h2 className="text-2xl font-semibold tracking-tight mb-10">特徴</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Feature
              icon={<Scale className="h-5 w-5" />}
              title="中立性"
              body="メーカー名・商品名は出さず、機器カテゴリと公開されている効率値のみで試算します。"
            />
            <Feature
              icon={<Calculator className="h-5 w-5" />}
              title="計算の透明性"
              body="UA値・C値・地域デグリーデー・日射量・補助金など、すべての前提値を結果ページから確認できます。"
            />
            <Feature
              icon={<FileBarChart2 className="h-5 w-5" />}
              title="共有可能"
              body="結果は URL コピーで共有、または A4 PDF として保存できます。"
            />
          </div>
        </div>
      </section>

      <section id="how" className="border-b">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-20">
          <h2 className="text-2xl font-semibold tracking-tight mb-10">5ステップで完了</h2>
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              "建物条件",
              "住宅性能",
              "設備",
              "経済条件",
              "比較・結果",
            ].map((label, i) => (
              <li key={label} className="rounded-lg border bg-card p-4">
                <div className="font-mono text-xs text-muted-foreground">STEP {i + 1}</div>
                <div className="mt-2 font-medium">{label}</div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
            <Sun className="h-4 w-4" /> 入力 5 分・結果は即時表示。
          </div>
        </div>
      </section>

      <section id="disclaimer">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-16 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground mb-3">ご注意</h2>
          <p className="leading-relaxed max-w-[70ch]">
            実際の光熱費は気象・生活パターン・実機効率により大きく変動します。本ツールの試算は意思決定の比較材料であり、
            実測との一致を保証するものではありません。補助金は年度ごとに改訂されるため、最新の公募要領で必ずご確認ください。
          </p>
        </div>
      </section>

      <footer className="border-t">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} 住宅性能シミュレーター</span>
          <Link href="/simulator" prefetch={false} className="hover:text-foreground">シミュレーターへ →</Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
        {icon}
      </div>
      <div className="mt-4 font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
