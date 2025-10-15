import { FileBrowser } from '@/components/FileBrowser'

export default function Home() {
  return (
    <main className="min-h-screen">
      <FileBrowser folderPath="./data" />
    </main>
  )
}
