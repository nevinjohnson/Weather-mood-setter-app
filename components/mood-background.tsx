"use client"

import { type MoodKey } from "@/lib/moods"
import { cn } from "@/lib/utils"

type Props = {
  mood?: MoodKey
  variant?: "full" | "side"
}

export function MoodBackground({ mood = "sunny", variant = "full" }: Props) {
  if (variant === "side") {
    return (
      <div className="absolute inset-0">
        {mood === "sunny" && <SunnySide />}
        {mood === "rainy" && <RainySide />}
        {mood === "cloudy" && <CloudySide />}
        {mood === "foggy" && <FoggySide />}
        {mood === "snowy" && <SnowySide />}
        {mood === "stormy" && <StormySide />}
      </div>
    )
  }
  return (
    <div className="absolute inset-0 -z-10">
      {mood === "sunny" && <SunnyFull />}
      {mood === "rainy" && <RainyFull />}
      {mood === "cloudy" && <CloudyFull />}
      {mood === "foggy" && <FoggyFull />}
      {mood === "snowy" && <SnowyFull />}
      {mood === "stormy" && <StormyFull />}
      {/* Soft grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: "url(/placeholder.svg?height=4&width=4&query=subtle%20noise)" }} />
    </div>
  )
}

function SunnyFull() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-300/70 blur-3xl animate-pulse-slow" />
      <div className="absolute top-12 right-12 h-24 w-24 rounded-full bg-yellow-300/70 blur-2xl animate-float" />
      <style jsx>{`
        .animate-pulse-slow { animation: pulse 6s ease-in-out infinite; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)}}
        @keyframes float { 0%,100%{transform: translateY(0)} 50%{transform: translateY(-10px)}}
      `}</style>
    </div>
  )
}
function RainyFull() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      <RainLayer />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05),transparent_50%)]" />
    </div>
  )
}
function CloudyFull() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-100">
      <CloudLayer />
    </div>
  )
}
function FoggyFull() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100">
      <FogLayer />
    </div>
  )
}
function SnowyFull() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-blue-100 to-white">
      <SnowLayer />
    </div>
  )
}
function StormyFull() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <LightningLayer />
    </div>
  )
}

function SunnySide() {
  return <div className="absolute inset-0 bg-gradient-to-bl from-yellow-200/50 to-transparent">
    <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-yellow-300/60 blur-xl" />
  </div>
}
function RainySide() {
  return <div className="absolute inset-0"><RainLayer density="side" /></div>
}
function CloudySide() { return <div className="absolute inset-0"><CloudLayer variant="side" /></div> }
function FoggySide() { return <div className="absolute inset-0"><FogLayer /></div> }
function SnowySide() { return <div className="absolute inset-0"><SnowLayer density="side" /></div> }
function StormySide() { return <div className="absolute inset-0"><LightningLayer /></div> }

function RainLayer({ density = "full" as "full" | "side" }) {
  const opacity = density === "full" ? "opacity-30" : "opacity-20"
  return (
    <div className={cn("absolute inset-0", opacity)} style={{
      backgroundImage: "repeating-linear-gradient(120deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 2px, transparent 2px, transparent 8px)",
      animation: "rain 1.2s linear infinite",
      backgroundSize: "20px 20px",
    }}>
      <style jsx>{`
        @keyframes rain {
          0% { background-position: 0 0; }
          100% { background-position: -100px 200px; }
        }
      `}</style>
    </div>
  )
}

function CloudLayer({ variant = "full" as "full" | "side" }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-10 left-[-10%] h-40 w-[120%] bg-white/60 blur-2xl rounded-full animate-cloud" />
      <div className="absolute top-24 left-[-20%] h-36 w-[140%] bg-white/50 blur-2xl rounded-full animate-cloud-slow" />
      <style jsx>{`
        .animate-cloud { animation: cloud 30s linear infinite; }
        .animate-cloud-slow { animation: cloud 45s linear infinite; }
        @keyframes cloud {
          0% { transform: translateX(-10%); }
          100% { transform: translateX(10%); }
        }
      `}</style>
    </div>
  )
}

function FogLayer() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      <div className="absolute top-1/3 left-0 right-0 h-20 bg-white/40 blur-md animate-fog" />
      <style jsx>{`
        .animate-fog { animation: fog 10s ease-in-out infinite; }
        @keyframes fog { 0%,100% { opacity: .5; } 50% { opacity: .8; } }
      `}</style>
    </div>
  )
}

function SnowLayer({ density = "full" as "full" | "side" }) {
  const count = density === "full" ? 80 : 40
  const flakes = new Array(count).fill(0).map((_, i) => {
    const left = Math.random() * 100
    const delay = Math.random() * 5
    const duration = 6 + Math.random() * 6
    const size = 2 + Math.random() * 3
    return (
      <span
        key={i}
        className="absolute top-[-10%] rounded-full bg-white/90"
        style={{
          left: `${left}%`,
          width: size,
          height: size,
          animation: `snow ${duration}s linear ${delay}s infinite`,
        }}
      />
    )
  })
  return (
    <div className="absolute inset-0 pointer-events-none">
      {flakes}
      <style jsx>{`
        @keyframes snow {
          0% { transform: translateY(-10%); opacity: 1; }
          100% { transform: translateY(110%); opacity: .7; }
        }
      `}</style>
    </div>
  )
}

function LightningLayer() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-white/0 animate-lightning pointer-events-none" />
      <style jsx>{`
        .animate-lightning {
          animation: flash 7s infinite;
        }
        @keyframes flash {
          0%, 97%, 100% { background: rgba(255,255,255,0); }
          60% { background: rgba(255,255,255,0.06); }
          62% { background: rgba(255,255,255,0.2); }
          64% { background: rgba(255,255,255,0.05); }
        }
      `}</style>
    </div>
  )
}
