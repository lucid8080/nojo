export type Integration = {
  id: string;
  name: string;
  description: string;
  icon?: string;
};

export type IntegrationCategory = {
  id: string;
  name: string;
  integrations: Integration[];
};

export const integrationCategories: IntegrationCategory[] = [
  {
    id: "chat",
    name: "Chat Providers",
    integrations: [
      { id: "whatsapp", name: "WhatsApp", description: "Connect with your customers" },
      { id: "telegram", name: "Telegram", description: "Messaging and bots" },
      { id: "discord", name: "Discord", description: "Community and voice" },
      { id: "slack", name: "Slack", description: "Team communication" },
      { id: "signal", name: "Signal", description: "Private messaging" },
      { id: "imessage", name: "iMessage", description: "Apple messaging" },
      { id: "teams", name: "Microsoft Teams", description: "Collaboration hub" },
      { id: "messenger", name: "Facebook Messenger", description: "Connect on Messenger" },
    ],
  },
  {
    id: "ai-models",
    name: "AI Models",
    integrations: [
      { id: "chatgpt", name: "ChatGPT", description: "Conversational AI" },
      { id: "openai", name: "OpenAI", description: "Models and APIs" },
      { id: "google-ai", name: "Google", description: "Gemini and AI tools" },
      { id: "anthropic", name: "Anthropic", description: "Claude and safety" },
      { id: "midjourney", name: "Midjourney", description: "Image generation" },
      { id: "claude", name: "Claude", description: "AI assistant" },
      { id: "perplexity", name: "Perplexity", description: "AI-powered search" },
    ],
  },
  {
    id: "productivity",
    name: "Productivity",
    integrations: [
      { id: "notion", name: "Notion", description: "Notes and wikis" },
      { id: "trello", name: "Trello", description: "Boards and cards" },
      { id: "google-calendar", name: "Google Calendar", description: "Schedule and events" },
      { id: "evernote", name: "Evernote", description: "Capture and organize" },
      { id: "slack-prod", name: "Slack", description: "Work in one place" },
    ],
  },
  {
    id: "music",
    name: "Music & Audio",
    integrations: [
      { id: "spotify", name: "Spotify", description: "Music and podcasts" },
      { id: "itunes", name: "iTunes", description: "Apple Music library" },
      { id: "soundcloud", name: "SoundCloud", description: "Discover and share audio" },
    ],
  },
  {
    id: "smart-home",
    name: "Smart Home",
    integrations: [
      { id: "philips-hue", name: "Philips Hue", description: "Smart lighting" },
      { id: "nest", name: "Nest", description: "Thermostats and cameras" },
      { id: "home-assistant", name: "Home Assistant", description: "Local home automation" },
    ],
  },
  {
    id: "tools",
    name: "Tools & Automation",
    integrations: [
      { id: "browser", name: "Browser", description: "Web automation" },
      { id: "search", name: "Search", description: "Web search" },
      { id: "voice", name: "Voice", description: "Voice input and output" },
      { id: "email", name: "Email", description: "Send and read email" },
      { id: "sms", name: "SMS", description: "Text messaging" },
      { id: "webhooks", name: "Webhooks", description: "HTTP callbacks" },
      { id: "python", name: "Python", description: "Scripts and automation" },
    ],
  },
  {
    id: "media",
    name: "Media & Services",
    integrations: [
      { id: "image-gen", name: "Image Gen", description: "Generate images" },
      { id: "pdf-search", name: "PDF Search", description: "Search documents" },
      { id: "realtime", name: "Real-time", description: "Live data streams" },
      { id: "vision", name: "Vision", description: "Image understanding" },
    ],
  },
  {
    id: "social",
    name: "Social",
    integrations: [
      { id: "twitter", name: "Twitter/X", description: "Posts and engagement" },
      { id: "reddit", name: "Reddit", description: "Communities and threads" },
    ],
  },
  {
    id: "platforms",
    name: "Platforms",
    integrations: [
      { id: "macos", name: "macOS", description: "Apple desktop" },
      { id: "ios", name: "iOS", description: "iPhone and iPad" },
      { id: "android", name: "Android", description: "Mobile and tablet" },
      { id: "windows", name: "Windows", description: "PC and Surface" },
      { id: "linux", name: "Linux", description: "Desktop and server" },
    ],
  },
  {
    id: "community",
    name: "Community Showcase",
    integrations: [
      { id: "news-search", name: "News Search", description: "Latest news and articles" },
      { id: "weather-bot", name: "Weather Bot", description: "Forecasts and alerts" },
    ],
  },
];
