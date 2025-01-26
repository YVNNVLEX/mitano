import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white">MITANO</h1>
        <p className="text-xl text-gray-400">Rencontrez de nouvelles personnes en toute simplicité</p>
        <Link href="/chat">
          <Button
            size="lg"
            className="text-lg px-8 py-6 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
          >
            Commencer
          </Button>
        </Link>
      </div>
    </main>
  )
}

