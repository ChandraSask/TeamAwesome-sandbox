/**
 * Pager — Google-style numbered pagination.
 *
 * Shows a WINDOW of page numbers around the current page plus first/last:
 *
 *     ‹ Prev  1 … 14 15 [16] 17 18 … 236  Next ›
 *
 * Purely presentational — the caller owns the page state and the fetch.
 */

export function pageWindow(page, pages, span = 2) {
  if (pages <= 1) return [1]
  const out = []
  const lo = Math.max(2, page - span)
  const hi = Math.min(pages - 1, page + span)

  out.push(1)
  if (lo > 2) out.push('gap')
  for (let p = lo; p <= hi; p++) out.push(p)
  if (hi < pages - 1) out.push('gap')
  if (pages > 1) out.push(pages)
  return out
}

export default function Pager({ page, pages, total, pageSize, onPage, disabled = false }) {
  if (pages <= 1) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const btn =
    'min-w-[34px] rounded-lg border px-2.5 py-1.5 text-[13px] transition disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <nav className="flex flex-col items-center gap-2 py-2" aria-label="Result pages">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={disabled || page <= 1}
          className={btn + ' border-slate-700 text-slate-300 hover:bg-slate-800'}
        >
          ‹ Prev
        </button>

        {pageWindow(page, pages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-slate-500 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              disabled={disabled}
              aria-current={p === page ? 'page' : undefined}
              className={
                btn +
                (p === page
                  ? ' border-cyan-500 bg-cyan-500/15 font-semibold text-cyan-300'
                  : ' border-slate-700 text-slate-300 hover:bg-slate-800')
              }
            >
              {p.toLocaleString()}
            </button>
          ),
        )}

        <button
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={disabled || page >= pages}
          className={btn + ' border-slate-700 text-slate-300 hover:bg-slate-800'}
        >
          Next ›
        </button>
      </div>

      <div className="text-[11px] text-slate-500">
        Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()} · page{' '}
        {page.toLocaleString()} of {pages.toLocaleString()}
      </div>
    </nav>
  )
}
