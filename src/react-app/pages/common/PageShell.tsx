import type { ReactNode } from 'react'

export default function PageShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="page">
      {title ? <h1 className="page-title">{title}</h1> : null}
      <section className="panel">{children}</section>
    </div>
  )
}

