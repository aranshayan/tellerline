import type { Metadata } from "next"
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google"
import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { site } from "@/lib/site"
import "./globals.css"

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" })
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" })
const newsreader = Newsreader({ subsets: ["latin"], style: "italic", weight: "400", variable: "--font-newsreader" })

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: components for banking and back-office apps`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { title: site.name, description: site.description, url: site.url, siteName: site.name },
}

// Runs before paint so a stored or system dark preference never flashes light first.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-svh">
        <a href="#main" className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="font-mono text-sm font-medium tracking-tight">
            <span aria-hidden className="text-brand me-2">◆</span>
            tellerline
          </Link>
          <nav aria-label="Main" className="flex items-center gap-5 font-mono text-[13px]">
            <Link href="/components/money-input" className="text-muted-foreground hover:text-foreground hidden sm:inline">
              Money Input
            </Link>
            <Link href="/components/audit-timeline" className="text-muted-foreground hover:text-foreground hidden sm:inline">
              Audit Timeline
            </Link>
            <a href={site.repo} className="text-muted-foreground hover:text-foreground">
              GitHub
            </a>
            <ThemeToggle />
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          {children}
        </main>
        <footer className="text-muted-foreground mx-auto max-w-5xl px-5 font-mono text-xs sm:px-8">
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t py-8">
          <span>
            MIT licensed. Built by <a href={site.author.url} className="hover:text-foreground underline underline-offset-4">{site.author.name}</a>.
          </span>
          <a href={`${site.url}/r/registry.json`} className="hover:text-foreground">
            registry.json
          </a>
          </div>
        </footer>
      </body>
    </html>
  )
}
