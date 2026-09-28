import Link from "next/link";

// SHIG 60: a 404 page with a way out instead of the framework default
export default function NotFound() {
  return (
    <div className="max-w-[600px] mx-auto px-5 py-20 text-center">
      <h1 className="text-xl font-semibold">ページが見つかりません</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        URL が変わったか、途中で切れている可能性があります。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
        <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center rounded-md border px-4 hover:bg-muted">
          トップページへ
        </Link>
        <Link href="/simulator" prefetch={false} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-primary-foreground hover:bg-primary/90">
          シミュレーターへ
        </Link>
      </div>
    </div>
  );
}
