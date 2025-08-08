export type MoodKey = "sunny" | "rainy" | "cloudy" | "foggy" | "snowy" | "stormy"

export function getMoodForWeather(main: string): MoodKey {
  const m = (main || "").toLowerCase()
  if (m.includes("clear")) return "sunny"
  if (m.includes("rain") || m.includes("drizzle")) return "rainy"
  if (m.includes("thunder")) return "stormy"
  if (m.includes("snow")) return "snowy"
  if (m.includes("mist") || m.includes("fog") || m.includes("haze") || m.includes("smoke")) return "foggy"
  if (m.includes("cloud")) return "cloudy"
  return "sunny"
}

export function isRomanticMood(mood: MoodKey) {
  return mood === "rainy" || mood === "foggy"
}

export function getMoodMeta(mood: MoodKey) {
  const maps: Record<MoodKey, {
    label: string
    subtitle: string
    message: string
    suggestion: { title: string; artist: string; url: string }
    quote: { text: string; author: string }
  }> = {
    sunny: {
      label: "Golden Glow",
      subtitle: "Sun-kissed and unstoppable",
      message: "Hello, sunshine! The world called—it said you’re the main character today.",
      suggestion: { title: "Pocketful of Sunshine", artist: "Natasha Bedingfield", url: "https://open.spotify.com/track/3JvrhDOgAt6p7K8mDyZwRd" },
      quote: { text: "Keep your face always toward the sunshine—and shadows will fall behind you.", author: "Walt Whitman" },
    },
    rainy: {
      label: "Cozy Drizzle",
      subtitle: "Rain-tapped windows & warm hearts",
      message: "Rain’s the universe’s way of saying: ‘Slow down, get cozy, and romanticize everything.’",
      suggestion: { title: "Turning Page", artist: "Sleeping At Last", url: "https://open.spotify.com/track/1xwAWUI8ZX0oiVQzG3IVnm" },
      quote: { text: "Some people walk in the rain, others just get wet.", author: "Roger Miller" },
    },
    cloudy: {
      label: "Soft Overcast",
      subtitle: "Gentle and grounded",
      message: "Clouds are just sky blankets—perfect for grounded thoughts and slow magic.",
      suggestion: { title: "Bloom", artist: "The Paper Kites", url: "https://open.spotify.com/track/2h9gS40QBA2fN1bczS6C3B" },
      quote: { text: "There are no rules of architecture for a castle in the clouds.", author: "G.K. Chesterton" },
    },
    foggy: {
      label: "Dreamy Haze",
      subtitle: "Mystic, mellow, and a bit romantic",
      message: "Fog outside, mystery inside. Let the day feel like a soft-focus movie.",
      suggestion: { title: "Sea of Love", artist: "Cat Power", url: "https://open.spotify.com/track/2ypA2zd2X8q5yQGQxGCvgG" },
      quote: { text: "Sometimes you have to play a long time to be able to play like yourself.", author: "Miles Davis" },
    },
    snowy: {
      label: "Crystal Quiet",
      subtitle: "Sparkly calm and cocoa calls",
      message: "Snow is glitter that fell asleep—bundle up and make your own sparkle.",
      suggestion: { title: "Holocene", artist: "Bon Iver", url: "https://open.spotify.com/track/5j8RpmZspU2o6eQ5Gkbt1M" },
      quote: { text: "To appreciate the beauty of a snowflake, it is necessary to stand out in the cold.", author: "Aristotle" },
    },
    stormy: {
      label: "Electric Pulse",
      subtitle: "Bold, loud, and alive",
      message: "Thunder says: be dramatic, be fearless. You’re the storm now.",
      suggestion: { title: "Believer", artist: "Imagine Dragons", url: "https://open.spotify.com/track/0pqnGHJpmpxLKifKRmU6WP" },
      quote: { text: "The best way out is always through.", author: "Robert Frost" },
    },
  }
  return maps[mood]
}
