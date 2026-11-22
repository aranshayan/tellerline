import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const alt = "Tellerline: the parts of a banking screen that are easy to get wrong"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file))

export default async function Image() {
  const [regular, semibold, italic] = await Promise.all([
    font("Archivo-Regular.ttf"),
    font("Archivo-SemiBold.ttf"),
    font("Newsreader-Italic.ttf"),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f5f2ea",
          color: "#171614",
          fontFamily: "Archivo",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
          <div style={{ width: 22, height: 22, background: "#b0481f", transform: "rotate(45deg)" }} />
          tellerline
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 76, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05 }}>
            <span>The parts of a banking screen that are&nbsp;</span>
            <span style={{ fontFamily: "Newsreader", fontStyle: "italic", fontWeight: 400, color: "#b0481f", letterSpacing: 0 }}>easy to get wrong</span>
            <span>.</span>
          </div>
          <div style={{ fontSize: 30, color: "#5f5b53" }}>Accessible React components for money, audit trails and approvals.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#5f5b53" }}>
          <span>Money Input · Audit Timeline · Maker-checker</span>
          <span>npx shadcn add</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
        { name: "Archivo", data: semibold, weight: 600, style: "normal" },
        { name: "Newsreader", data: italic, weight: 400, style: "italic" },
      ],
    },
  )
}
