/** One place for the public address. Install commands and the registry homepage are built from it. */
export const site = {
  name: "Tellerline",
  description: "Accessible React components for banking and back-office apps, installed with the shadcn CLI.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tellerline.vercel.app").replace(/\/$/, ""),
  repo: "https://github.com/aranshayan/tellerline",
  author: { name: "Aran Shayan", url: "https://aranshayan.com" },
}

export const installCommand = (item: string) => `npx shadcn@latest add ${site.url}/r/${item}.json`
