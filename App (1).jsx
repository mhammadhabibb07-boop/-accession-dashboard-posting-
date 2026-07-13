import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ------------------------------------------------------------------
   ACCESSION SOLUTION — social approval workspace
   Branded per the Accession Solution brand board:
     · Palette  #1c39bb (blue) · #ffd500 (yellow) · #00ffb3 (mint) · #ffffff
     · Type     Neue Machina / Bricolage Grotesque (display), Garet (body)
                — Bricolage Grotesque + Poppins load from Google Fonts as
                  web-safe stand-ins; Neue Machina & Garet slot in front of
                  the stack when their licensed webfonts are added.
     · Style    geometric shapes, hard offset shadows, 2px ink outlines
------------------------------------------------------------------- */

const C = {
  blue: "#1c39bb",
  yellow: "#ffd500",
  mint: "#00ffb3",
  ink: "#0e1e63",
  paper: "#ffffff",
  bg: "#f4f6ff",
};

const hard = (color = C.blue, px = 4) => ({ boxShadow: `${px}px ${px}px 0 ${color}` });
const outline = { border: `2px solid ${C.ink}` };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PLATFORMS = {
  Instagram: "IG",
  LinkedIn: "LI",
  X: "X",
  TikTok: "TT",
};

/* real post dimensions per platform — previews crop to these */
const ASPECT = { Instagram: "1 / 1", LinkedIn: "1.91 / 1", X: "16 / 9", TikTok: "9 / 16" };
const SIZE_HINT = { Instagram: "1080 × 1080", LinkedIn: "1200 × 627", X: "1600 × 900", TikTok: "1080 × 1920" };

const STATUS = {
  draft: { label: "Draft", spine: "#9aa3c7", chipBg: "#eef0f9", chipText: "#5a6285" },
  pending: { label: "Awaiting review", spine: C.yellow, chipBg: "#fff7c2", chipText: "#7a6400" },
  approved: { label: "Approved", spine: C.mint, chipBg: "#c8ffec", chipText: "#00734f" },
  changes_requested: { label: "Changes requested", spine: C.blue, chipBg: "#dde3ff", chipText: C.blue },
  declined: { label: "Declined", spine: "#ff4d6d", chipBg: "#ffe0e6", chipText: "#b3123a" },
};

const USERS = {
  manager: { name: "Maya Torres", role: "manager", title: "Social media manager", initials: "MT" },
  client: { name: "Daniel Cho", role: "client", title: "Founder · Accession Solution", initials: "DC" },
};

const scoreOf = (m) => (!m ? 0 : m.likes + m.comments * 3 + m.shares * 5 + m.saves * 4);
const engRate = (m) => (!m || !m.reach ? 0 : ((m.likes + m.comments + m.shares + m.saves) / m.reach) * 100);

const SEED_POSTS = [
  { id: 1, day: 0, platform: "LinkedIn", title: "Founder story: why we started", caption: "Long-form post on the origin of Accession Solution — the problem we saw, the pivot, the first 100 customers.", status: "approved", comments: [{ by: "client", text: "Love this. Ship it.", at: "Mon 09:12" }], metrics: { reach: 8400, likes: 412, comments: 58, shares: 31, saves: 24 } },
  { id: 2, day: 0, platform: "Instagram", title: "Behind-the-scenes reel", caption: "30s reel: the team at work, morning standup, office dog cameo at the end.", status: "approved", comments: [], metrics: { reach: 12100, likes: 980, comments: 74, shares: 45, saves: 120 }, media: { kind: "mock", label: "Reel · 30s · 9:16", from: C.blue, to: "#3a56d4" } },
  { id: 3, day: 1, platform: "X", title: "Hot take: onboarding speed", caption: "Thread on why week-long onboarding is a broken promise for most SaaS — and what we do instead.", status: "changes_requested", comments: [{ by: "client", text: "Tone is too combative for us. Can we make it constructive — same data, less attitude?", at: "Tue 08:40" }], metrics: null },
  { id: 4, day: 2, platform: "Instagram", title: "Customer spotlight: Ana's studio", caption: "Carousel featuring Ana's ceramics studio and how she uses our platform to manage restocks.", status: "pending", comments: [], metrics: null, media: { kind: "mock", label: "Carousel · 5 slides · 1080×1350", from: C.mint, to: "#5cffd0" } },
  { id: 5, day: 3, platform: "LinkedIn", title: "Q2 impact report teaser", caption: "Single-image post with 3 headline stats from the upcoming report. CTA to the newsletter.", status: "pending", comments: [], metrics: null, media: { kind: "mock", label: "Static image · 1200×627", from: C.yellow, to: "#ffe45c" } },
  { id: 6, day: 4, platform: "TikTok", title: "Product speed-run", caption: "POV: setting up a full workspace in under 90 seconds. Trending audio, captions baked in.", status: "draft", comments: [], metrics: null },
  { id: 7, day: 5, platform: "Instagram", title: "Weekend promo: bundle drop", caption: "Static post announcing the weekend bundle. 15% off, ends Sunday midnight.", status: "declined", comments: [{ by: "client", text: "We agreed no discounts this quarter — margins are tight. Let's do a giveaway instead.", at: "Wed 17:05" }], metrics: null },
  { id: 8, day: 6, platform: "X", title: "Sunday reading list", caption: "5 links on product-led growth our team actually read this week.", status: "approved", comments: [], metrics: { reach: 3900, likes: 150, comments: 12, shares: 22, saves: 8 } },
];

const WEEK_TREND = [
  { week: "W23", score: 1480 }, { week: "W24", score: 1720 }, { week: "W25", score: 1590 },
  { week: "W26", score: 2110 }, { week: "W27", score: 2340 }, { week: "W28", score: 2865 },
];

let nextId = 100;

export default function App() {
  const [role, setRole] = useState(null); // null = signed out
  const [tab, setTab] = useState("plan");
  const [posts, setPosts] = useState(SEED_POSTS);
  const [openPost, setOpenPost] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);

  const user = role ? USERS[role] : null;
  const active = posts.find((p) => p.id === openPost) || null;

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, changes_requested: 0, declined: 0, draft: 0 };
    posts.forEach((p) => (c[p.status] += 1));
    return c;
  }, [posts]);

  const ping = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const updatePost = (id, patch, comment) =>
    setPosts((ps) => ps.map((p) => p.id === id
      ? { ...p, ...patch, comments: comment ? [...p.comments, comment] : p.comments }
      : p));

  const submit = (id) => { updatePost(id, { status: "pending" }); ping("Sent for review"); };
  const resubmit = (id) => { updatePost(id, { status: "pending" }); ping("Resubmitted for review"); };
  const decide = (id, status, note) => {
    const comment = note ? { by: "client", text: note, at: "Just now" } : null;
    updatePost(id, { status }, comment);
    ping(status === "approved" ? "Post approved" : status === "declined" ? "Post declined" : "Changes requested");
    setOpenPost(null);
  };

  const addNote = (id, text) => {
    updatePost(id, {}, { by: role, text, at: "Just now" });
    ping("Note added");
  };

  const addPost = (draft) => {
    setPosts((ps) => [...ps, { id: nextId++, comments: [], metrics: null, status: "pending", ...draft }]);
    setShowNew(false);
    ping("Post submitted to " + USERS.client.name.split(" ")[0]);
  };

  if (!role) return <Login onLogin={setRole} />;

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.ink, fontFamily: "'Garet','Poppins',ui-sans-serif,system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Poppins:wght@400;500;600&display=swap');
        .display { font-family: 'Neue Machina','Bricolage Grotesque',ui-sans-serif,system-ui,sans-serif; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      {/* ---------------- top bar ---------------- */}
      <header style={{ background: C.blue, borderBottom: `3px solid ${C.ink}` }} className="text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 flex items-center justify-center rounded-md"
              style={{ background: C.mint, ...outline, ...hard(C.ink, 3) }}>
              <span className="display font-extrabold text-base" style={{ color: C.blue }}>AS</span>
            </div>
            <span className="display font-extrabold text-lg tracking-tight" style={{ color: C.mint }}>Accession Solution</span>
            <span className="text-xs hidden sm:inline" style={{ color: "#aebafc" }}>· social workspace</span>
          </div>

          <nav className="flex gap-1.5 ml-auto order-3 sm:order-2 w-full sm:w-auto">
            {[["plan", "Weekly plan"], ["queue", role === "client" ? `Approvals (${counts.pending})` : "Statuses"], ["score", "Scoreboard"]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className="px-3 py-1.5 rounded-md text-sm font-semibold transition-colors focus:outline-none"
                style={tab === k
                  ? { background: C.yellow, color: C.ink, ...outline, ...hard(C.ink, 2) }
                  : { color: "#cdd5ff" }}>
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 order-2 sm:order-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: C.paper, color: C.blue, ...outline }} title={user.name}>{user.initials}</div>
            <button onClick={() => { setRole(null); setOpenPost(null); setShowNew(false); setTab("plan"); }}
              className="px-2.5 py-1.5 rounded-md text-xs font-bold focus:outline-none"
              style={{ background: "#12277f", color: "#cdd5ff", ...outline }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="display text-2xl font-extrabold tracking-tight">
              {tab === "plan" ? "Week 29 · Jul 13 – 19" : tab === "queue" ? (role === "client" ? "Waiting on you" : "Where things stand") : "Scoreboard"}
            </h1>
            <p className="text-sm" style={{ color: "#5a6285" }}>Signed in as {user.name} — {user.title}</p>
          </div>
          {role === "manager" && tab === "plan" && (
            <button onClick={() => setShowNew(true)}
              className="px-4 py-2 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
              style={{ background: C.blue, color: C.paper, ...outline, ...hard(C.yellow) }}>
              + New post
            </button>
          )}
        </div>

        {tab === "plan" && <WeekBoard posts={posts} role={role} onOpen={setOpenPost} onSubmit={submit} />}
        {tab === "queue" && <Queue posts={posts} role={role} onOpen={setOpenPost} counts={counts} />}
        {tab === "score" && <Scoreboard posts={posts} />}
      </main>

      {active && (
        <ReviewModal post={active} role={role} onClose={() => setOpenPost(null)}
          onDecide={decide} onResubmit={resubmit} onSubmit={submit}
          onMedia={(id, m) => { updatePost(id, { media: m }); ping(m ? "Media updated" : "Media removed"); }}
          onNote={addNote} />
      )}
      {showNew && <NewPostModal onCancel={() => setShowNew(false)} onCreate={addPost} />}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-sm font-semibold px-4 py-2 rounded-md"
          style={{ background: C.ink, color: C.mint, ...hard(C.mint, 3) }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------- shared bits ---------------- */
function PlatformTag({ platform }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: C.paper, color: C.blue, border: `1.5px solid ${C.blue}` }}>
      {PLATFORMS[platform]}
    </span>
  );
}

function StatusChip({ status }) {
  const s = STATUS[status];
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: s.chipBg, color: s.chipText }}>
      {s.label}
    </span>
  );
}

function MediaPreview({ media, compact, platform }) {
  if (!media) return null;

  /* full previews crop to the platform's real post shape; vertical formats stay a sane height */
  const tall = platform === "TikTok";
  const frame = compact
    ? { height: 64, width: "100%" }
    : tall
      ? { aspectRatio: ASPECT[platform], height: 300, margin: "0 auto" }
      : { aspectRatio: (platform && ASPECT[platform]) || "16 / 9", width: "100%" };
  const frameCls = "rounded-md overflow-hidden relative";
  const border = { border: `1.5px solid ${C.ink}` };
  const badge = !compact && platform && (
    <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold rounded px-1.5 py-0.5"
      style={{ background: C.ink, color: C.paper, opacity: 0.9 }}>
      {platform} · {SIZE_HINT[platform]}
    </span>
  );

  if (media.kind === "mock") {
    return (
      <div className={`${frameCls} flex items-center justify-center`}
        style={{ ...frame, ...border, background: `linear-gradient(135deg, ${media.from}, ${media.to})` }}>
        <span className={`font-semibold rounded px-2 py-0.5 ${compact ? "text-[10px]" : "text-xs"}`}
          style={{ background: C.ink, color: C.paper }}>
          {media.label}
        </span>
        {badge}
      </div>
    );
  }
  if (media.kind === "image") {
    return (
      <div className={frameCls} style={{ ...frame, ...border }}>
        <img src={media.src} alt={media.name || "Post media"} className="w-full h-full object-cover" />
        {badge}
      </div>
    );
  }
  if (media.kind === "video") {
    return compact ? (
      <div className="rounded-md h-16 flex items-center justify-center" style={{ background: C.ink, ...border }}>
        <span className="text-[10px] font-semibold" style={{ color: C.mint }}>▶ {media.name || "Video"}</span>
      </div>
    ) : (
      <div className={frameCls} style={{ ...frame, ...border, background: C.ink }}>
        <video src={media.src} controls className="w-full h-full object-contain" />
        {badge}
      </div>
    );
  }
  return null;
}

/* upload / replace / remove control — used in New post and when editing an existing post */
function MediaField({ media, onChange, platform }) {
  const [err, setErr] = useState(null);
  const MAX_MB = 8;

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setErr(`File is ${(f.size / 1048576).toFixed(1)} MB — the limit is ${MAX_MB} MB. Compress it and try again.`);
      e.target.value = "";
      return;
    }
    setErr(null);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => onChange({ kind: "image", src: r.result, name: f.name });
      r.readAsDataURL(f);
    } else if (f.type.startsWith("video/")) {
      onChange({ kind: "video", src: URL.createObjectURL(f), name: f.name });
    } else {
      setErr("That file type isn't supported. Upload an image (JPG, PNG, WebP) or a video (MP4, MOV).");
    }
    e.target.value = "";
  };

  return (
    <div>
      {!media ? (
        <label className="block rounded-md p-4 text-center cursor-pointer"
          style={{ border: `2px dashed ${C.blue}`, background: "#f7f9ff" }}>
          <input type="file" accept="image/*,video/*" onChange={handleFile} className="sr-only" />
          <span className="text-sm" style={{ color: "#5a6285" }}>
            <span className="font-bold" style={{ color: C.blue, textDecoration: "underline", textDecorationColor: C.mint, textDecorationThickness: 3, textUnderlineOffset: 3 }}>Upload media</span> — image or video, up to 8 MB
            {platform && <span className="block text-xs mt-0.5" style={{ color: "#8b93b8" }}>{platform} size: {SIZE_HINT[platform]}</span>}
          </span>
        </label>
      ) : (
        <div>
          <MediaPreview media={media} platform={platform} />
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <span className="text-xs truncate" style={{ color: "#5a6285" }}>{media.name || media.label || "Attached media"}</span>
            <div className="flex gap-3 shrink-0">
              <label className="text-xs font-bold cursor-pointer rounded px-1" style={{ color: C.blue }}>
                <input type="file" accept="image/*,video/*" onChange={handleFile} className="sr-only" />
                Replace
              </label>
              <button onClick={() => { onChange(null); setErr(null); }}
                className="text-xs font-bold rounded px-1 focus:outline-none" style={{ color: "#b3123a" }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {err && <div className="text-xs mt-1" style={{ color: "#b3123a" }}>{err}</div>}
    </div>
  );
}

/* ---------------- weekly plan board ---------------- */
function WeekBoard({ posts, role, onOpen, onSubmit }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {DAYS.map((day, i) => {
        const dayPosts = posts.filter((p) => p.day === i);
        return (
          <div key={day} className="min-h-40">
            <div className="flex items-baseline justify-between mb-2 px-1">
              <span className="display text-sm font-extrabold uppercase tracking-wide">{day}</span>
              <span className="text-xs" style={{ color: "#8b93b8" }}>Jul {13 + i}</span>
            </div>
            <div className="space-y-3">
              {dayPosts.length === 0 && (
                <div className="rounded-md p-3 text-center text-xs"
                  style={{ border: `2px dashed #b9c2e8`, color: "#8b93b8" }}>
                  Nothing planned
                </div>
              )}
              {dayPosts.map((p) => (
                <PostCard key={p.id} post={p} role={role} onOpen={onOpen} onSubmit={onSubmit} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PostCard({ post, role, onOpen, onSubmit }) {
  const s = STATUS[post.status];
  return (
    <button onClick={() => onOpen(post.id)}
      className="w-full text-left rounded-md overflow-hidden focus:outline-none transition-transform hover:-translate-y-0.5"
      style={{ background: C.paper, ...outline, ...hard(s.spine, 4), borderLeft: `6px solid ${s.spine}` }}>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <PlatformTag platform={post.platform} />
          <StatusChip status={post.status} />
        </div>
        <div className="text-sm font-bold leading-snug">{post.title}</div>
        {post.media && <div className="mt-1.5"><MediaPreview media={post.media} compact /></div>}
        <div className="text-xs mt-1 line-clamp-2" style={{ color: "#5a6285" }}>{post.caption}</div>
        {post.comments.length > 0 && (
          <div className="text-[11px] mt-2" style={{ color: "#8b93b8" }}>💬 {post.comments.length} comment{post.comments.length > 1 ? "s" : ""}</div>
        )}
        {role === "manager" && post.status === "draft" && (
          <span onClick={(e) => { e.stopPropagation(); onSubmit(post.id); }}
            className="inline-block mt-2 text-xs font-bold rounded px-1 -mx-1"
            style={{ color: C.blue, textDecoration: "underline", textDecorationColor: C.yellow, textDecorationThickness: 3, textUnderlineOffset: 3 }}>
            Send for review →
          </span>
        )}
      </div>
    </button>
  );
}

/* ---------------- queue / status view ---------------- */
function Queue({ posts, role, onOpen, counts }) {
  const order = role === "client"
    ? ["pending", "changes_requested", "approved", "declined", "draft"]
    : ["changes_requested", "declined", "pending", "draft", "approved"];
  const visible = role === "client" ? posts.filter((p) => p.status !== "draft") : posts;
  const sorted = [...visible].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[["pending", counts.pending], ["approved", counts.approved], ["changes_requested", counts.changes_requested], ["declined", counts.declined]].map(([k, n]) => (
          <div key={k} className="rounded-md p-3"
            style={{ background: C.paper, ...outline, ...hard(STATUS[k].spine, 4), borderLeft: `6px solid ${STATUS[k].spine}` }}>
            <div className="display text-2xl font-extrabold">{n}</div>
            <div className="text-xs" style={{ color: "#5a6285" }}>{STATUS[k].label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-md overflow-hidden" style={{ background: C.paper, ...outline, ...hard(C.blue, 5) }}>
        {sorted.map((p, idx) => (
          <button key={p.id} onClick={() => onOpen(p.id)}
            className="w-full flex items-center gap-3 p-3 text-left focus:outline-none hover:opacity-90"
            style={{ borderTop: idx === 0 ? "none" : `1.5px solid #e3e7f8` }}>
            <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: STATUS[p.status].spine }} />
            <PlatformTag platform={p.platform} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{p.title}</div>
              <div className="text-xs" style={{ color: "#5a6285" }}>{DAYS[p.day]} · {STATUS[p.status].label}</div>
            </div>
            {role === "client" && p.status === "pending" && (
              <span className="text-xs font-bold px-2 py-1 rounded shrink-0"
                style={{ background: C.yellow, color: C.ink, ...outline }}>Review</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- scoreboard ---------------- */
function Scoreboard({ posts }) {
  const scored = posts.filter((p) => p.metrics).map((p) => ({
    ...p, score: scoreOf(p.metrics), rate: engRate(p.metrics),
  })).sort((a, b) => b.score - a.score);

  const weekScore = scored.reduce((s, p) => s + p.score, 0);
  const avgRate = scored.length ? scored.reduce((s, p) => s + p.rate, 0) / scored.length : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Week 29 engagement score" value={weekScore.toLocaleString()} sub="likes ×1 · comments ×3 · shares ×5 · saves ×4" accent={C.mint} />
        <StatCard label="Average engagement rate" value={avgRate.toFixed(1) + "%"} sub="interactions ÷ reach, across published posts" accent={C.yellow} />
        <StatCard label="Posts with metrics" value={scored.length} sub="metrics sync nightly from platform APIs" accent={C.blue} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-md p-4" style={{ background: C.paper, ...outline, ...hard(C.blue, 5) }}>
          <h3 className="display font-extrabold text-sm mb-3">Score by post</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scored} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde3ff" />
              <XAxis dataKey="title" tick={false} label={{ value: "posts, ranked", position: "insideBottom", fontSize: 11, fill: "#8b93b8" }} />
              <YAxis tick={{ fontSize: 11, fill: C.ink }} />
              <Tooltip formatter={(v) => [v, "Score"]} labelFormatter={(l) => l} />
              <Bar dataKey="score" radius={[3, 3, 0, 0]} stroke={C.ink} strokeWidth={1.5}>
                {scored.map((p, i) => <Cell key={p.id} fill={i === 0 ? C.yellow : C.blue} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-md p-4" style={{ background: C.paper, ...outline, ...hard(C.mint, 5) }}>
          <h3 className="display font-extrabold text-sm mb-3">Weekly trend — last 6 weeks</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={WEEK_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde3ff" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: C.ink }} />
              <YAxis tick={{ fontSize: 11, fill: C.ink }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke={C.blue} strokeWidth={2.5}
                dot={{ r: 4, fill: C.mint, stroke: C.ink, strokeWidth: 1.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-md overflow-hidden" style={{ background: C.paper, ...outline, ...hard(C.yellow, 5) }}>
        <h3 className="display font-extrabold text-sm p-4 pb-2">Top posts this week</h3>
        <div>
          {scored.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1.5px solid #e3e7f8` }}>
              <span className="display font-extrabold text-lg w-6" style={{ color: i === 0 ? C.blue : "#b9c2e8" }}>{i + 1}</span>
              <PlatformTag platform={p.platform} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{p.title}</div>
                <div className="text-xs" style={{ color: "#5a6285" }}>
                  {p.metrics.reach.toLocaleString()} reach · {p.metrics.likes} likes · {p.metrics.comments} comments · {p.metrics.shares} shares
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="display font-extrabold">{p.score.toLocaleString()}</div>
                <div className="text-xs" style={{ color: "#5a6285" }}>{p.rate.toFixed(1)}% rate</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-md p-4" style={{ background: C.paper, ...outline, ...hard(accent, 5) }}>
      <div className="text-xs mb-1" style={{ color: "#5a6285" }}>{label}</div>
      <div className="display text-3xl font-extrabold">{value}</div>
      <div className="text-[11px] mt-1" style={{ color: "#8b93b8" }}>{sub}</div>
    </div>
  );
}

/* ---------------- review modal ---------------- */
function ReviewModal({ post, role, onClose, onDecide, onResubmit, onSubmit, onMedia, onNote }) {
  const [note, setNote] = useState("");
  const [needNote, setNeedNote] = useState(null);

  const requireNote = (status) => {
    if (!note.trim()) { setNeedNote(status); return; }
    onDecide(post.id, status, note.trim());
  };

  const inputStyle = { border: `2px solid ${C.ink}`, borderRadius: 6 };

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      style={{ background: "rgba(14,30,99,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl"
        style={{ background: C.paper, ...outline, ...hard(C.mint, 6) }} onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <PlatformTag platform={post.platform} />
                <StatusChip status={post.status} />
                <span className="text-xs" style={{ color: "#8b93b8" }}>· {DAYS[post.day]}</span>
              </div>
              <h2 className="display text-lg font-extrabold leading-tight">{post.title}</h2>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="text-xl leading-none px-1 rounded focus:outline-none" style={{ color: "#8b93b8" }}>×</button>
          </div>

          {role === "manager" && ["draft", "pending", "changes_requested"].includes(post.status) ? (
            <div className="mt-3">
              <div className="text-xs font-bold mb-1" style={{ color: "#5a6285" }}>Media</div>
              <MediaField media={post.media} onChange={(m) => onMedia(post.id, m)} platform={post.platform} />
            </div>
          ) : (
            post.media && <div className="mt-3"><MediaPreview media={post.media} platform={post.platform} /></div>
          )}

          <div className="mt-3 rounded-md p-3 text-sm" style={{ background: C.bg, border: `1.5px solid #dde3ff` }}>{post.caption}</div>

          {post.comments.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#5a6285" }}>Feedback</div>
              {post.comments.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: C.yellow, color: C.ink, border: `1.5px solid ${C.ink}` }}>
                    {USERS[c.by].initials}
                  </div>
                  <div className="rounded-md px-3 py-2 text-sm flex-1" style={{ background: C.bg }}>
                    <span className="font-bold">{USERS[c.by].name.split(" ")[0]}</span>
                    <span className="text-xs" style={{ color: "#8b93b8" }}> · {c.at}</span>
                    <div>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!(role === "client" && post.status === "pending") && (
            <NoteBox onAdd={(t) => onNote(post.id, t)} />
          )}

          {role === "client" && post.status === "pending" && (
            <div className="mt-5">
              <textarea value={note} onChange={(e) => { setNote(e.target.value); setNeedNote(null); }}
                placeholder="Add feedback (required to decline or request changes)"
                className="w-full p-2.5 text-sm focus:outline-none" style={inputStyle} rows={2} />
              {needNote && (
                <div className="text-xs mt-1" style={{ color: "#b3123a" }}>
                  Add a note first — feedback is required when you {needNote === "declined" ? "decline a post" : "request changes"}.
                </div>
              )}
              <div className="flex gap-2.5 mt-3 flex-wrap">
                <button onClick={() => onDecide(post.id, "approved", note.trim() || null)}
                  className="flex-1 min-w-28 px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
                  style={{ background: C.mint, color: C.ink, ...outline, ...hard(C.ink, 3) }}>
                  Approve
                </button>
                <button onClick={() => requireNote("changes_requested")}
                  className="flex-1 min-w-28 px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
                  style={{ background: C.yellow, color: C.ink, ...outline, ...hard(C.ink, 3) }}>
                  Request changes
                </button>
                <button onClick={() => requireNote("declined")}
                  className="flex-1 min-w-28 px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
                  style={{ background: C.paper, color: "#b3123a", border: `2px solid #b3123a`, ...hard("#ff4d6d", 3) }}>
                  Decline
                </button>
              </div>
            </div>
          )}

          {role === "client" && post.status !== "pending" && (
            <div className="mt-5 text-sm rounded-md p-3" style={{ background: C.bg, color: "#5a6285" }}>
              {post.status === "approved" && "You approved this post. It will publish automatically to the connected account at its scheduled time."}
              {post.status === "changes_requested" && "You requested changes. Maya will revise and resubmit."}
              {post.status === "declined" && "You declined this post. It won't be published."}
              {post.status === "draft" && "Still being drafted — you'll be notified when it's ready to review."}
            </div>
          )}

          {role === "manager" && (
            <div className="mt-5">
              {post.status === "draft" && (
                <button onClick={() => { onSubmit(post.id); onClose(); }}
                  className="w-full px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
                  style={{ background: C.blue, color: C.paper, ...outline, ...hard(C.yellow) }}>
                  Send for review
                </button>
              )}
              {post.status === "changes_requested" && (
                <button onClick={() => { onResubmit(post.id); onClose(); }}
                  className="w-full px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
                  style={{ background: C.blue, color: C.paper, ...outline, ...hard(C.yellow) }}>
                  Mark as revised — resubmit for review
                </button>
              )}
              {["pending", "approved", "declined"].includes(post.status) && (
                <div className="text-sm rounded-md p-3" style={{ background: C.bg, color: "#5a6285" }}>
                  {post.status === "pending" && "Waiting on Daniel's review. Approval decisions belong to the client role."}
                  {post.status === "approved" && "Approved and locked. It will publish automatically to the connected account at its scheduled time."}
                  {post.status === "declined" && "Declined by the client — see feedback above before planning a replacement."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- new post modal (manager only) ---------------- */
function NewPostModal({ onCancel, onCreate }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [day, setDay] = useState(2);
  const [err, setErr] = useState(false);
  const [media, setMedia] = useState(null);

  const create = () => {
    if (!title.trim() || !caption.trim()) { setErr(true); return; }
    onCreate({ title: title.trim(), caption: caption.trim(), platform, day, media });
  };

  const inputStyle = { border: `2px solid ${C.ink}`, borderRadius: 6 };
  const labelStyle = { color: "#5a6285" };

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      style={{ background: "rgba(14,30,99,0.55)" }} onClick={onCancel}>
      <div className="w-full max-w-lg p-5 rounded-t-xl sm:rounded-xl max-h-[90vh] overflow-y-auto"
        style={{ background: C.paper, ...outline, ...hard(C.yellow, 6) }} onClick={(e) => e.stopPropagation()}>
        <h2 className="display text-lg font-extrabold mb-4">New post</h2>

        <label className="block text-xs font-bold mb-1" style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setErr(false); }}
          placeholder="e.g. Product teaser: the new workspace"
          className="w-full p-2.5 text-sm mb-3 focus:outline-none" style={inputStyle} />

        <label className="block text-xs font-bold mb-1" style={labelStyle}>Caption / concept</label>
        <textarea value={caption} onChange={(e) => { setCaption(e.target.value); setErr(false); }} rows={3}
          placeholder="What the post says and shows"
          className="w-full p-2.5 text-sm mb-3 focus:outline-none" style={inputStyle} />

        <label className="block text-xs font-bold mb-1" style={labelStyle}>Media</label>
        <MediaField media={media} onChange={setMedia} platform={platform} />
        <div className="h-3" />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold mb-1" style={labelStyle}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="w-full p-2.5 text-sm focus:outline-none" style={inputStyle}>
              {Object.keys(PLATFORMS).map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={labelStyle}>Day</label>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))}
              className="w-full p-2.5 text-sm focus:outline-none" style={inputStyle}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d} · Jul {13 + i}</option>)}
            </select>
          </div>
        </div>
        {err && <div className="text-xs mb-3" style={{ color: "#b3123a" }}>Add a title and caption before submitting.</div>}
        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none"
            style={{ background: C.paper, color: C.ink, ...outline, ...hard("#b9c2e8", 3) }}>
            Cancel
          </button>
          <button onClick={create}
            className="flex-1 px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
            style={{ background: C.blue, color: C.paper, ...outline, ...hard(C.yellow, 3) }}>
            Submit for review
          </button>
        </div>
      </div>
    </div>
  );
}


/* ---------------- add-a-note box (both roles, any status) ---------------- */
function NoteBox({ onAdd }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-4">
      <div className="text-xs font-bold mb-1" style={{ color: "#5a6285" }}>Add a note</div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onAdd(text.trim()); setText(""); } }}
          placeholder="Share context, ideas, or questions — doesn't change the post's status"
          className="flex-1 p-2.5 text-sm focus:outline-none"
          style={{ border: `2px solid ${C.ink}`, borderRadius: 6 }} />
        <button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); } }}
          className="px-4 py-2 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
          style={{ background: C.mint, color: C.ink, ...outline, ...hard(C.ink, 3) }}>
          Add
        </button>
      </div>
    </div>
  );
}

/* ---------------- sign-in screen (demo accounts; real email auth comes with the backend) ---------------- */
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pickRole, setPickRole] = useState("manager");

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: C.blue, fontFamily: "'Garet','Poppins',ui-sans-serif,system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Poppins:wght@400;500;600&display=swap');
        .display { font-family: 'Neue Machina','Bricolage Grotesque',ui-sans-serif,system-ui,sans-serif; }
      `}</style>
      <div className="w-full max-w-sm rounded-xl p-6"
        style={{ background: C.paper, border: `2px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.mint}` }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 flex items-center justify-center rounded-md"
            style={{ background: C.mint, border: `2px solid ${C.ink}`, boxShadow: `3px 3px 0 ${C.ink}` }}>
            <span className="display font-extrabold" style={{ color: C.blue }}>AS</span>
          </div>
          <div>
            <div className="display font-extrabold text-lg leading-tight" style={{ color: C.ink }}>Accession Solution</div>
            <div className="text-xs" style={{ color: "#5a6285" }}>Social workspace</div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <button onClick={() => onLogin("manager")}
            className="w-full text-left p-3 rounded-md focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
            style={{ background: C.paper, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.yellow}` }}>
            <div className="text-sm font-bold" style={{ color: C.ink }}>Continue as Maya Torres</div>
            <div className="text-xs" style={{ color: "#5a6285" }}>Social media manager — creates &amp; submits posts</div>
          </button>
          <button onClick={() => onLogin("client")}
            className="w-full text-left p-3 rounded-md focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
            style={{ background: C.paper, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.mint}` }}>
            <div className="text-sm font-bold" style={{ color: C.ink }}>Continue as Daniel Cho</div>
            <div className="text-xs" style={{ color: "#5a6285" }}>Founder — approves, declines, requests changes</div>
          </button>
        </div>

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px" style={{ background: "#dde3ff" }} />
          <span className="text-[11px]" style={{ color: "#8b93b8" }}>or sign in with email</span>
          <div className="flex-1 h-px" style={{ background: "#dde3ff" }} />
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
          placeholder="you@company.com"
          className="w-full p-2.5 text-sm mb-2 focus:outline-none"
          style={{ border: `2px solid ${C.ink}`, borderRadius: 6, color: C.ink }} />
        <select value={pickRole} onChange={(e) => setPickRole(e.target.value)}
          className="w-full p-2.5 text-sm mb-3 focus:outline-none"
          style={{ border: `2px solid ${C.ink}`, borderRadius: 6, color: C.ink }}>
          <option value="manager">I'm the social media manager</option>
          <option value="client">I'm the founder / client</option>
        </select>
        <button onClick={() => onLogin(pickRole)}
          className="w-full px-4 py-2.5 rounded-md text-sm font-bold focus:outline-none active:translate-x-0.5 active:translate-y-0.5"
          style={{ background: C.blue, color: C.paper, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.yellow}` }}>
          Sign in
        </button>

        <p className="text-[11px] mt-3 text-center" style={{ color: "#8b93b8" }}>
          Demo sign-in — real email accounts &amp; passwords arrive with the production build.
        </p>
      </div>
    </div>
  );
}
