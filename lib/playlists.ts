import { type MoodKey } from "./moods"

export type Track = { title: string; artist: string; url: string }

export const playlists: Record<MoodKey, Track[]> = {
  sunny: [
    { title: "Good Day", artist: "Nappy Roots", url: "https://open.spotify.com/track/3AyGbyBLU0c5fJ6kC3Bf7I" },
    { title: "Walking on Sunshine", artist: "Katrina & The Waves", url: "https://open.spotify.com/track/1Y373MqadDRtclJNdnUXVc" },
    { title: "Send Me On My Way", artist: "Rusted Root", url: "https://open.spotify.com/track/7h6xN8oQUNqvZqC3uWZ9sP" },
    { title: "Sunday Best", artist: "Surfaces", url: "https://open.spotify.com/track/5sO5WJr1kgh4QYVjpv8k8l" },
  ],
  rainy: [
    { title: "Turning Page", artist: "Sleeping At Last", url: "https://open.spotify.com/track/1xwAWUI8ZX0oiVQzG3IVnm" },
    { title: "Holocene", artist: "Bon Iver", url: "https://open.spotify.com/track/5j8RpmZspU2o6eQ5Gkbt1M" },
    { title: "Skinny Love", artist: "Bon Iver", url: "https://open.spotify.com/track/1oAOI8fEYXPLt1QvQK7rVc" },
    { title: "Yellow", artist: "Coldplay", url: "https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg" },
  ],
  cloudy: [
    { title: "Bloom", artist: "The Paper Kites", url: "https://open.spotify.com/track/2h9gS40QBA2fN1bczS6C3B" },
    { title: "Holocene", artist: "Bon Iver", url: "https://open.spotify.com/track/5j8RpmZspU2o6eQ5Gkbt1M" },
    { title: "All I Want", artist: "Kodaline", url: "https://open.spotify.com/track/6HZILIRieu8S0iqY8kIKhj" },
    { title: "Pink + White", artist: "Frank Ocean", url: "https://open.spotify.com/track/1ZMiCix7XSAbfAJlEZWMCp" },
  ],
  foggy: [
    { title: "Sea of Love", artist: "Cat Power", url: "https://open.spotify.com/track/2ypA2zd2X8q5yQGQxGCvgG" },
    { title: "Night Owl", artist: "Galimatias", url: "https://open.spotify.com/track/4PxA1nvUs61iJaBItgR9Ej" },
    { title: "Motion Picture Soundtrack", artist: "Radiohead", url: "https://open.spotify.com/track/4BVLmqs9L9M1VlzDqgW8s3" },
    { title: "Holocene", artist: "Bon Iver", url: "https://open.spotify.com/track/5j8RpmZspU2o6eQ5Gkbt1M" },
  ],
  snowy: [
    { title: "River", artist: "Joni Mitchell", url: "https://open.spotify.com/track/7IHOIqZUUInxjVkko181PB" },
    { title: "First Snow", artist: "Emancipator", url: "https://open.spotify.com/track/1bKN3c7mL8E2usN9r0uNQm" },
    { title: "Hazy Shade of Winter", artist: "Simon & Garfunkel", url: "https://open.spotify.com/track/3oVf5a7RLnQzGhbSa7fucA" },
    { title: "Winter Song", artist: "Sara Bareilles, Ingrid Michaelson", url: "https://open.spotify.com/track/6yEpFPtZ0Pj7Vt0wJH7K6b" },
  ],
  stormy: [
    { title: "Believer", artist: "Imagine Dragons", url: "https://open.spotify.com/track/0pqnGHJpmpxLKifKRmU6WP" },
    { title: "Seven Nation Army", artist: "The White Stripes", url: "https://open.spotify.com/track/3d9DChrdc6BOeFsbrZ3Is0" },
    { title: "Smells Like Teen Spirit", artist: "Nirvana", url: "https://open.spotify.com/track/5ghIJDpPoe3CfHMGu71E6T" },
    { title: "Uprising", artist: "Muse", url: "https://open.spotify.com/track/3S0OXQeoh0w6AY8WQVckRW" },
  ],
}
