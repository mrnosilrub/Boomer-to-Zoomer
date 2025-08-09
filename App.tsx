// Minimal Expo RN app for: "Boomer — Plain-English Internet Trends"
// Expo SDK 53 / iOS target / Tabs: Home • Search • Favorites • Settings
// Packages used: expo-notifications, @react-native-async-storage/async-storage, expo-haptics, expo-web-browser, lucide-react-native

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
SafeAreaView,
View,
Text,
Pressable,
FlatList,
TextInput,
ScrollView,
Switch,
Alert,
Platform,
StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Home, Search, Heart, Settings as SettingsIcon, Info, ExternalLink } from "lucide-react-native";

const ACCENT = "#24D3A8";
const BG = "#0B0B0B";
const CARD = "#121212";
const TEXT = "#FFFFFF";
const MUTED = "#A1A1A1";

// 🔔 Notification handler (banner/list on iOS; no sound by default)
Notifications.setNotificationHandler({
handleNotification: async () => ({
shouldShowBanner: true,
shouldSetBadge: false,
shouldPlaySound: false,
shouldShowList: true
})
});

// --- Mock content (MVP/local) ---
type Trend = {
id: string;
title: string;
shortSummary: string;
longExplanation: string;
exampleSentence: string;
category: "Slang" | "Meme" | "Platform" | "Trend";
sources: { name: string; url: string }[];
tags: string[];
};

const TRENDS: Trend[] = [
{
id: "npc-streamer",
title: "NPC Streamer",
shortSummary: "Streamers acting like 'non-player characters' replying with preset phrases for tips.",
longExplanation:
"Some livestreamers roleplay as video-game NPCs, responding with fixed phrases or actions when viewers send paid tips or prompts. It’s performative, meme-y, and built around microtransactions.",
exampleSentence: "My niece watches an NPC streamer who says the same line every time someone tips.",
category: "Trend",
sources: [
{ name: "Know Your Meme", url: "https://knowyourmeme.com" }
],
tags: ["tiktok", "streaming", "npc"]
},
{
id: "brat-summer",
title: "Brat Summer",
shortSummary: "A tongue-in-cheek vibe of carefree confidence and messy fun.",
longExplanation:
"Borrowed from pop culture, 'brat' in this context is playful self-confidence: doing your thing, not overthinking, and embracing a slightly chaotic summer energy.",
exampleSentence: "They're calling it 'brat summer'—basically giving yourself permission to be a little silly.",
category: "Slang",
sources: [{ name: "News explainer", url: "https://www.apple.com/newsroom/" }],
tags: ["slang", "summer", "pop"]
},
{
id: "ratio",
title: "Ratio",
shortSummary: "When replies outnumber likes—used as a dunk to show disapproval.",
longExplanation:
"On social platforms, if a post has far more reply comments than likes or reposts, people say it’s 'ratioed'—a quick way to signal the audience doesn’t agree.",
exampleSentence: "That politician’s post got ratioed—more replies than likes.",
category: "Platform",
sources: [{ name: "OutOfTheLoop", url: "https://www.reddit.com/r/OutOfTheLoop/" }],
tags: ["twitter", "x", "replies"]
}
];

// --- Fetchers ---
async function fetchTrendsFromReddit(limit: number = 30): Promise<Trend[]> {
  try {
    const resp = await fetch(
      `https://www.reddit.com/r/OutOfTheLoop/top.json?t=week&limit=${limit}`
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const items = json?.data?.children ?? [];
    const trends: Trend[] = items
      .map((c: any) => c?.data)
      .filter(Boolean)
      .map((d: any) => {
        const id: string = d.id || d.name || `${d.subreddit}_${d.created}`;
        const title: string = String(d.title || "Untitled").trim();
        const self: string = String(d.selftext || "").trim();
        const shortSummary: string = self
          ? self.split(/\n+/).find((p: string) => p.trim().length > 0)?.slice(0, 220) || title
          : title;
        return {
          id,
          title,
          shortSummary,
          longExplanation: self || title,
          exampleSentence: "",
          category: "Trend",
          sources: [{ name: "r/OutOfTheLoop", url: `https://www.reddit.com${d.permalink}` }],
          tags: (d.link_flair_text ? [String(d.link_flair_text)] : [])
        } as Trend;
      });
    return trends;
  } catch (e) {
    return [];
  }
}

// --- Persistence keys ---
const KEY_ONBOARDED = "onboarded_v1";
const KEY_FAVORITES = "favorites_v1";
const KEY_NOTIF_ENABLED = "notif_enabled_v1";

// --- Tiny tab system (no react-navigation to keep deps minimal) ---
type TabKey = "Home" | "Search" | "Favorites" | "Settings";
type StackKey = null | "Detail" | "Onboarding" | "About";

export default function App() {
  const [tab, setTab] = useState<TabKey>("Home");
  const [stack, setStack] = useState<StackKey>(null);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [onboarded, setOnboarded] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(false);
  const [trends, setTrends] = useState<Trend[]>(TRENDS);
  const [loadingTrends, setLoadingTrends] = useState<boolean>(false);
  const accent = ACCENT;

  useEffect(() => {
    (async () => {
      const [o, f, n] = await Promise.all([
        AsyncStorage.getItem(KEY_ONBOARDED),
        AsyncStorage.getItem(KEY_FAVORITES),
        AsyncStorage.getItem(KEY_NOTIF_ENABLED)
      ]);
      if (!o) {
        setOnboarded(false);
        setStack("Onboarding");
      }
      if (f) setFavorites(JSON.parse(f));
      if (n) setNotifEnabled(n === "1");
      // Fetch live trends
      setLoadingTrends(true);
      const live = await fetchTrendsFromReddit(40);
      if (live.length > 0) setTrends(live);
      setLoadingTrends(false);
    })();
  }, []);

  const refreshTrends = async () => {
    setLoadingTrends(true);
    const live = await fetchTrendsFromReddit(40);
    if (live.length > 0) setTrends(live);
    setLoadingTrends(false);
  };

// --- Notifications ---
const scheduleDailyDigest = async () => {
const perm = await Notifications.requestPermissionsAsync();
if (!perm.granted && perm.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
Alert.alert("Notifications disabled", "You can enable notifications in Settings later.");
return false;
}
// 9:00 AM local time, repeats daily
await Notifications.cancelAllScheduledNotificationsAsync();
await Notifications.scheduleNotificationAsync({
content: {
title: "Today’s 5 internet things",
body: "Open Boomer to catch up in 20 seconds.",
data: { kind: "daily-digest" }
},
trigger: { hour: 9, minute: 0, repeats: true }
});
return true;
};

const toggleNotifications = async (next: boolean) => {
if (next) {
const ok = await scheduleDailyDigest();
if (!ok) return;
} else {
await Notifications.cancelAllScheduledNotificationsAsync();
}
await AsyncStorage.setItem(KEY_NOTIF_ENABLED, next ? "1" : "0");
setNotifEnabled(next);
Haptics.selectionAsync().catch(() => {});
};

// --- Favorites ---
const isFav = (id: string) => favorites.includes(id);
const toggleFav = async (id: string) => {
const next = isFav(id) ? favorites.filter(f => f !== id) : [...favorites, id];
setFavorites(next);
await AsyncStorage.setItem(KEY_FAVORITES, JSON.stringify(next));
Haptics.selectionAsync().catch(() => {});
};

// --- Screens ---
const openDetail = (t: Trend) => {
setSelectedTrend(t);
setStack("Detail");
};

const completeOnboarding = async (enableDaily: boolean) => {
await AsyncStorage.setItem(KEY_ONBOARDED, "1");
setOnboarded(true);
setStack(null);
if (enableDaily) {
await toggleNotifications(true);
}
};

// --- Views ---
return (
<SafeAreaView style={[styles.container, { backgroundColor: BG }]}>
{/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: TEXT }]}>Boomer</Text>
          <Text style={[styles.subtitle, { color: MUTED }]}>Plain-English Internet Trends</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh" onPress={refreshTrends} style={styles.refreshBtn}>
          <Text style={{ color: loadingTrends ? MUTED : ACCENT }}>{loadingTrends ? "…" : "Refresh"}</Text>
        </Pressable>
      </View>

  {/* Body */}
  <View style={styles.body}>
    {stack === "Onboarding" && (
      <OnboardingView onDone={completeOnboarding} accent={accent} />
    )}

    {stack === "Detail" && selectedTrend && (
      <DetailView
        trend={selectedTrend}
        onBack={() => setStack(null)}
        onFav={() => toggleFav(selectedTrend.id)}
        isFav={isFav(selectedTrend.id)}
        accent={accent}
      />
    )}

    {stack === "About" && (
      <AboutView onBack={() => setStack(null)} accent={accent} />
    )}

    {stack === null && (
      <>
        {tab === "Home" && (
          <HomeView
            data={trends}
            favorites={favorites}
            onOpen={openDetail}
            onToggleFav={toggleFav}
            accent={accent}
          />
        )}
        {tab === "Search" && (
          <SearchView
            data={trends}
            onOpen={openDetail}
            onToggleFav={toggleFav}
            favorites={favorites}
            accent={accent}
          />
        )}
        {tab === "Favorites" && (
          <FavoritesView
            data={trends.filter(t => favorites.includes(t.id))}
            onOpen={openDetail}
            onToggleFav={toggleFav}
            accent={accent}
          />
        )}
        {tab === "Settings" && (
          <SettingsView
            notifEnabled={notifEnabled}
            onToggleNotif={toggleNotifications}
            openAbout={() => setStack("About")}
            accent={accent}
          />
        )}
      </>
    )}
  </View>

  {/* Tabs */}
  {stack === null && (
    <TabBar tab={tab} setTab={setTab} accent={accent} />
  )}
</SafeAreaView>
);
}
// --- Components ---
function TabBar({ tab, setTab, accent }: { tab: TabKey; setTab: (t: TabKey) => void; accent: string }) {
const Item = ({
k,
label,
Icon
}: {
k: TabKey;
label: string;
Icon: any;
}) => {
const active = tab === k;
return (
<Pressable
accessibilityRole="tab"
onPress={() => setTab(k)}
style={[styles.tabItem, active && { borderTopColor: accent }]}
>
<Icon size={22} color={active ? accent : MUTED} />
<Text style={[styles.tabLabel, { color: active ? TEXT : MUTED }]}>{label}</Text>
</Pressable>
);
};
return (
<View style={styles.tabs}>
<Item k="Home" label="Home" Icon={Home} />
<Item k="Search" label="Search" Icon={Search} />
<Item k="Favorites" label="Favorites" Icon={Heart} />
<Item k="Settings" label="Settings" Icon={SettingsIcon} />
</View>
);
}

function Card({
children,
onPress
}: {
children: React.ReactNode;
onPress?: () => void;
}) {
return (
<Pressable onPress={onPress} style={styles.card}>
{children}
</Pressable>
);
}

function HomeView({
data,
favorites,
onOpen,
onToggleFav,
accent
}: {
data: Trend[];
favorites: string[];
onOpen: (t: Trend) => void;
onToggleFav: (id: string) => void;
accent: string;
}) {
return (
<FlatList
data={data}
keyExtractor={(t) => t.id}
contentContainerStyle={{ padding: 16 }}
renderItem={({ item }) => (
<Card onPress={() => onOpen(item)}>
<Text style={styles.itemTitle}>{item.title}</Text>
<Text style={styles.itemSummary}>{item.shortSummary}</Text>
<View style={styles.row}>
<Pill text={item.category} />
<View style={{ flex: 1 }} />
<FavButton
active={favorites.includes(item.id)}
onPress={() => onToggleFav(item.id)}
accent={accent}
/>
</View>
</Card>
)}
/>
);
}

function SearchView({
data,
favorites,
onOpen,
onToggleFav,
accent
}: {
data: Trend[];
favorites: string[];
onOpen: (t: Trend) => void;
onToggleFav: (id: string) => void;
accent: string;
}) {
const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    const has = (s?: string) => (s ? s.toLowerCase().includes(term) : false);
    return data.filter((t) => has(t.title) || has(t.shortSummary) || has(t.longExplanation) || (t.tags || []).some((tag) => has(tag)));
  }, [q, data]);

return (
<View style={{ flex: 1 }}>
<View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
<TextInput placeholder="Search slang, memes, platforms…" placeholderTextColor={MUTED} value={q} onChangeText={setQ} style={styles.input} accessibilityLabel="Search input" />
</View>
<FlatList
data={filtered}
keyExtractor={(t) => t.id}
contentContainerStyle={{ padding: 16 }}
renderItem={({ item }) => (
<Card onPress={() => onOpen(item)}>
<Text style={styles.itemTitle}>{item.title}</Text>
<Text style={styles.itemSummary}>{item.shortSummary}</Text>
<View style={styles.row}>
<Pill text={item.category} />
<View style={{ flex: 1 }} />
<FavButton
active={favorites.includes(item.id)}
onPress={() => onToggleFav(item.id)}
accent={accent}
/>
</View>
</Card>
)}
/>
</View>
);
}

function FavoritesView({
data,
onOpen,
onToggleFav,
accent
}: {
data: Trend[];
onOpen: (t: Trend) => void;
onToggleFav: (id: string) => void;
accent: string;
}) {
if (data.length === 0) {
return (
<View style={styles.center}>
<Text style={{ color: MUTED }}>No favorites yet.</Text>
</View>
);
}
return (
<FlatList
data={data}
keyExtractor={(t) => t.id}
contentContainerStyle={{ padding: 16 }}
renderItem={({ item }) => (
<Card onPress={() => onOpen(item)}>
<Text style={styles.itemTitle}>{item.title}</Text>
<Text style={styles.itemSummary}>{item.shortSummary}</Text>
<View style={styles.row}>
<Pill text={item.category} />
<View style={{ flex: 1 }} />
<FavButton
active
onPress={() => onToggleFav(item.id)}
accent={accent}
/>
</View>
</Card>
)}
/>
);
}

function SettingsView({
notifEnabled,
onToggleNotif,
openAbout,
accent
}: {
notifEnabled: boolean;
onToggleNotif: (next: boolean) => void;
openAbout: () => void;
accent: string;
}) {
return (
<ScrollView contentContainerStyle={{ padding: 16 }}>
<View style={styles.settingRow}>
<Text style={styles.settingLabel}>Daily digest (9:00 AM)</Text>
<Switch
value={notifEnabled}
onValueChange={onToggleNotif}
thumbColor={notifEnabled ? ACCENT : "#666"}
ios_backgroundColor="#222"
trackColor={{ false: "#222", true: "#1a3f36" }}
/>
</View>

  <View style={styles.divider} />

  <Pressable style={styles.settingRow} onPress={openAbout} accessibilityRole="button">
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Info size={20} color={ACCENT} />
      <Text style={styles.settingLabel}>About & Sources</Text>
    </View>
    <ExternalLink size={18} color={MUTED} />
  </Pressable>
</ScrollView>
);
}
function AboutView({ onBack, accent }: { onBack: () => void; accent: string }) {
const open = async (url: string) => {
await WebBrowser.openBrowserAsync(url);
};
return (
<ScrollView contentContainerStyle={{ padding: 16 }}>
<Pressable onPress={onBack} style={styles.backBtn}>
<Text style={{ color: TEXT }}>← Back</Text>
</Pressable>
<Text style={styles.itemTitle}>About this app</Text>
<Text style={styles.itemSummary}>
We translate internet trends and slang into plain English with short explanations and examples.
</Text>

  <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Sources we link to</Text>
  <Pill text="Know Your Meme" />
  <Pill text="Reddit r/OutOfTheLoop" />
  <Pill text="Reputable news explainers" />

  <View style={{ height: 12 }} />
  <Pressable onPress={() => open("https://knowyourmeme.com")} style={styles.linkBtn}>
    <Text style={[styles.linkText, { color: accent }]}>Open Know Your Meme</Text>
  </Pressable>
  <Pressable onPress={() => open("https://www.reddit.com/r/OutOfTheLoop/")} style={styles.linkBtn}>
    <Text style={[styles.linkText, { color: accent }]}>Open r/OutOfTheLoop</Text>
  </Pressable>
</ScrollView>
);
}
function DetailView({
trend,
onBack,
onFav,
isFav,
accent
}: {
trend: Trend;
onBack: () => void;
onFav: () => void;
isFav: boolean;
accent: string;
}) {
const openFirstSource = async () => {
const u = trend.sources[0]?.url;
if (u) await WebBrowser.openBrowserAsync(u);
};
return (
<ScrollView contentContainerStyle={{ padding: 16 }}>
<Pressable onPress={onBack} style={styles.backBtn}>
<Text style={{ color: TEXT }}>← Back</Text>
</Pressable>
<View style={styles.row}>
<Text style={styles.itemTitle}>{trend.title}</Text>
<View style={{ flex: 1 }} />
<FavButton active={isFav} onPress={onFav} accent={accent} />
</View>
<Text style={styles.itemSummary}>{trend.shortSummary}</Text>
<Text style={styles.sectionTitle}>What it means</Text>
<Text style={styles.longText}>{trend.longExplanation}</Text>
<Text style={styles.sectionTitle}>How to use it</Text>
<Text style={styles.longText}>"{trend.exampleSentence}"</Text>
<Text style={styles.sectionTitle}>Sources</Text>
{trend.sources.map((s) => (
<Pressable key={s.url} onPress={() => WebBrowser.openBrowserAsync(s.url)} style={styles.linkBtn}>
<Text style={[styles.linkText, { color: ACCENT }]}>{s.name}</Text>
</Pressable>
))}
<View style={{ height: 16 }} />
<Pressable onPress={openFirstSource} style={styles.primaryBtn}>
<Text style={styles.primaryBtnText}>Learn more</Text>
</Pressable>
</ScrollView>
);
}

function OnboardingView({
onDone,
accent
}: {
onDone: (enableDaily: boolean) => void;
accent: string;
}) {
const [enableDaily, setEnableDaily] = useState(true);
return (
<View style={styles.overlay}>
<View style={styles.onboardCard}>
<Text style={[styles.title, { color: TEXT, marginBottom: 12 }]}>Welcome</Text>
<Text style={styles.itemSummary}>
Get a short daily digest of internet trends in plain English. Big text, high contrast, quick reads.
</Text>
<View style={[styles.settingRow, { marginTop: 16 }]}>
<Text style={styles.settingLabel}>Daily digest at 9:00 AM</Text>
<Switch
value={enableDaily}
onValueChange={setEnableDaily}
thumbColor={enableDaily ? ACCENT : "#666"}
ios_backgroundColor="#222"
trackColor={{ false: "#222", true: "#1a3f36" }}
/>
</View>
<Pressable onPress={() => onDone(enableDaily)} style={[styles.primaryBtn, { marginTop: 16 }]}>
<Text style={styles.primaryBtnText}>Continue</Text>
</Pressable>
</View>
</View>
);
}

function Pill({ text }: { text: string }) {
return (
<View style={styles.pill}>
<Text style={styles.pillText}>{text}</Text>
</View>
);
}

function FavButton({ active, onPress, accent }: { active: boolean; onPress: () => void; accent: string }) {
return (
<Pressable
onPress={onPress}
accessibilityRole="button"
accessibilityLabel={active ? "Remove from favorites" : "Save to favorites"}
style={[
styles.favBtn,
{ borderColor: active ? accent : "#333", backgroundColor: active ? "#132721" : "transparent" }
]}
>
<Heart size={18} color={active ? accent : MUTED} />
<Text style={{ color: active ? TEXT : MUTED, marginLeft: 6 }}>{active ? "Saved" : "Save"}</Text>
</Pressable>
);
}

// --- Styles ---
const styles = StyleSheet.create({
container: { flex: 1 },
header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomColor: "#1c1c1c", borderBottomWidth: StyleSheet.hairlineWidth },
title: { fontSize: 22, fontWeight: "700" },
subtitle: { fontSize: 12 },
body: { flex: 1 },
tabs: { flexDirection: "row", borderTopColor: "#1c1c1c", borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: CARD },
tabItem: { flex: 1, paddingVertical: 10, alignItems: "center", gap: 4, borderTopWidth: 2, borderTopColor: "transparent" },
tabLabel: { fontSize: 11 },
card: { backgroundColor: CARD, padding: 14, borderRadius: 14, marginBottom: 12, borderColor: "#1f1f1f", borderWidth: 1 },
itemTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
itemSummary: { color: MUTED, marginTop: 6, lineHeight: 20 },
sectionTitle: { color: TEXT, fontSize: 14, fontWeight: "700", marginTop: 14, marginBottom: 6 },
longText: { color: TEXT, lineHeight: 22 },
row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
pill: { borderColor: "#2a2a2a", borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#111" },
pillText: { color: MUTED, fontSize: 12 },
favBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
input: { backgroundColor: CARD, color: TEXT, borderColor: "#1f1f1f", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
center: { flex: 1, alignItems: "center", justifyContent: "center" },
settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: CARD, borderColor: "#1f1f1f", borderWidth: 1, padding: 14, borderRadius: 14, marginBottom: 12 },
settingLabel: { color: TEXT, fontSize: 16 },
divider: { height: 1, backgroundColor: "#1c1c1c", marginVertical: 8 },
linkBtn: { paddingVertical: 8 },
linkText: { fontSize: 15 },
primaryBtn: { backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
primaryBtnText: { color: "#0b0b0b", fontWeight: "700" },
backBtn: { marginBottom: 10 },
overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center" },
onboardCard: { width: "88%", backgroundColor: CARD, borderColor: "#1f1f1f", borderWidth: 1, borderRadius: 16, padding: 16 }
});
