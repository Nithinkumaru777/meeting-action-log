// Phase 5: one real screen recording per REC scene, actions cued to the voiceover words.
//   node record.mjs            # every REC scene, in video order
//   node record.mjs mt1 rw1    # only these
// Each scene starts from freshly seeded demo data, unless it has keep: true (the walkthrough continues the story).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { recordScene, API, APP } from "./lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function reseed() {
  const r = spawnSync("npx", ["tsx", "video/demo/seed.ts"], { cwd: ROOT, shell: true, encoding: "utf8",
    env: { ...process.env, MONGODB_URI: "mongodb://127.0.0.1:27099/mal_demo" } });
  if (r.status !== 0) throw new Error("reseed failed: " + r.stderr + r.stdout);
}
async function api(method, p, body) {
  const res = await fetch(API + p, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${text}`);
  return text ? JSON.parse(text).data : null;
}

// ---------- selectors ----------
const nav = (k) => `.nav a[data-nav="${k}"]`;
const fig = (n) => `.figs .fig >> nth=${n}`;
const btn = (t) => `button:has-text("${t}")`;
const undo = '.toast button:has-text("Undo")';
const lrow = (t) => `.lrow:has-text("${t}")`;
const drow = (t) => `.drow:has-text("${t}")`;
const mrow = (t) => `.mrow:has-text("${t}")`;
const att = (name) => `label[for^="att-"]:has-text("${name}")`;
const prio = (p) => `.prio-pick label:has-text("${p}")`;
const sheetBtn = (t) => `.dw-f button:has-text("${t}")`;
const tab = (t) => `.tabs button:has-text("${t}")`;
const open = async (d, title) => { await d.page.click(mrow(title)); await d.page.waitForSelector(".mast"); await sleep(700); };

// Show a raw API response at reading size. The JSON itself is untouched apart from indentation.
async function showJson(d, url) {
  await d.page.goto(APP + url, { waitUntil: "load" });
  await d.page.evaluate(() => {
    const pre = document.querySelector("pre");
    if (!pre) return;
    pre.textContent = JSON.stringify(JSON.parse(pre.textContent), null, 2);
    pre.style.fontSize = "38px";
    pre.style.lineHeight = "54px";
    pre.style.padding = "48px";
    pre.style.whiteSpace = "pre-wrap";
  });
}

// ---------- scenes ----------
const SCENES = [
  { id: "g1", blank: true, beats: [
    { at: "Open the app", run: async (d) => { await d.page.goto(APP + "/", { waitUntil: "load" }); await d.page.waitForSelector(".figs"); await sleep(500); } },
    { at: "The dark teal spine", run: async (d) => {
      await d.hover(nav("dashboard"), "Teal spine", { dwell: 150 });
      const { b } = await d.box(nav("system"));
      await d.glide(b.x + b.width / 2, b.y + b.height / 2, 1400);
      d.log("hover", "Teal spine", await d.page.locator("#nav").boundingBox());
    } },
    { at: "the open actions meter", run: (d) => d.hover(".spine-stat", "Open actions meter") },
    { at: "The top bar", run: (d) => d.hover("#crumb", "Current page") },
    { at: "the search box", run: (d) => d.hover(".search", "Search meetings") },
    { at: "This small indicator", run: (d) => d.hover(".live", "Live connection", { dwell: 1200 }) },
    { at: "the guided demo", run: (d) => d.hover("#demoBtn", "Guided demo", { dwell: 500 }) },
    { at: "the theme switch", run: (d) => d.hover("#themeBtn", "Theme", { dwell: 500 }) },
    { at: "and New meeting", run: (d) => d.hover("#newMeetingBtn", "New meeting") },
  ] },

  { id: "td1", beats: [
    { at: "Four figures", run: (d) => d.hover(".figs", "Four figures", { dwell: 300 }) },
    { at: "Open actions counts", run: (d) => d.hover(fig(0), "Open actions") },
    { at: "Overdue shows", run: (d) => d.hover(fig(1), "Overdue") },
    { at: "Completion is", run: (d) => d.hover(fig(2), "Completion") },
    { at: "Decisions without tasks", run: (d) => d.hover(fig(3), "Decisions without tasks") },
    { at: "one click", run: (d) => d.click(".fig.late", "Overdue", { after: 1500 }) },
    { at: "the work behind", run: (d) => d.click(nav("dashboard"), "Today", { after: 600 }) },
  ] },

  { id: "td2", beats: [
    { at: "Column one", run: (d) => d.hover(".sec.late", "Column 01: Overdue") },
    // Toasts drain in 4.5 s unless hovered, so the cursor rests on the toast until Undo is pressed.
    { at: "Tick a checkbox", run: async (d) => { await d.click(`.sec.late ${lrow("Renew SSL")} .chk`, "Mark done", { after: 700 }); await d.hover(".toast", "Marked done", { dwell: 300 }); } },
    { at: "Undo reverses", run: (d) => d.click(undo, "Undo", { after: 500 }) },
    { at: "Column two", run: (d) => d.hover(".sec.dec", "Column 02: No owner yet") },
    { at: "No action closes", run: async (d) => { await d.click(`.sec.dec .drow >> nth=0 >> ${btn("No action")}`, "No action", { after: 700 }); await d.hover(".toast", "Marked as no action", { dwell: 200 }); } },
    { at: "you can undo", run: (d) => d.click(undo, "Undo", { after: 500 }) },
  ] },

  { id: "td3", beats: [
    { at: "Completed per week", run: (d) => d.hover('.sec:has-text("Completed per week")', "Last 8 weeks") },
    { at: "Late, by owner", run: (d) => d.hover('.sec:has-text("Late, by owner")', "Late, by owner") },
    { at: "Coming up lists", run: (d) => d.hover('.sec:has-text("Coming up")', "Coming up") },
    { at: "Schedule opens", run: (d) => d.click(btn("Schedule"), "Schedule", { after: 1300 }) },
    { at: "book another", run: (d) => d.click(sheetBtn("Cancel"), "Cancel", { after: 400 }) },
  ] },

  { id: "mt1", url: "meetings", beats: [
    { at: "All shows", run: (d) => d.hover(tab("All"), "All") },
    { at: "Upcoming shows", run: (d) => d.click(tab("Upcoming"), "Upcoming", { after: 500 }) },
    { at: "Held shows", run: (d) => d.click(tab("Held"), "Held", { after: 900 }) },
    { at: "Each row", run: async (d) => { await d.page.click(tab("All")); await sleep(200); await d.hover(mrow("Weekly ops sync"), "Meeting row", { dwell: 1200 }); } },
    { at: "plus flags", run: (d) => d.hover(`${mrow("Weekly ops sync")} .mflags`, "Flags") },
    { at: "the slash key", run: (d) => d.key("/", "Slash") },
    { at: "Search for ops", run: async (d) => { await d.hover("#q", "Search with /", { dwell: 100 }); for (const c of "ops") { await d.page.keyboard.type(c); await sleep(160); } } },
    { at: "its cross", run: (d) => d.click('button[aria-label="Clear search"]', "Clear search", { after: 500 }) },
  ] },

  { id: "mt2", url: "meetings", beats: [
    { at: "press New meeting", run: (d) => d.click("#newMeetingBtn", "New meeting", { after: 500 }) },
    { at: "Give it a title", run: (d) => d.type("#mTitle", "Payments roadmap review", "Title") },
    { at: "The date defaults", run: (d) => d.hover("#mDate", "Date") },
    { at: "Set the start time", run: (d) => d.fill("#mTime", "14:30", "Start, IST") },
    { at: "the duration in minutes", run: (d) => d.type("#mDur", "45", "Duration") },
    { at: "Pick the attendees", run: async (d) => {
      await d.click(att("Ananya"), "Ananya Rao", { after: 200 });
      await d.click(att("Karthik"), "Karthik Shetty", { after: 200 });
      await d.click(att("Priya"), "Priya Menon", { after: 200 });
    } },
    { at: "Add an agenda", run: (d) => d.type("#mAgenda", "UPI autopay and refund timelines for Q1.", "Agenda", { after: 200 }) },
    { at: "Press Create meeting", run: (d) => d.click(sheetBtn("Create meeting"), "Create meeting", { after: 800 }) },
    { at: "own page", run: (d) => d.hover(".mast", "The new meeting") },
  ] },

  { id: "md1", url: "meetings", setup: (d) => open(d, "Weekly ops sync"), beats: [
    { at: "The header shows", run: (d) => d.hover(".mast", "The meeting record", { dwell: 1000 }) },
    { at: "Four figures", run: (d) => d.hover(".figs", "Four health figures", { dwell: 1200 }) },
    { at: "Press Edit", run: (d) => d.click(btn("Edit"), "Edit", { after: 700 }) },
    { at: "Change the duration", run: (d) => d.type("#mDur", "60", "Duration") },
    { at: "press Save changes", run: (d) => d.click(sheetBtn("Save changes"), "Save changes", { after: 900 }) },
  ] },

  { id: "md2", url: "meetings", setup: (d) => open(d, "Weekly ops sync"), beats: [
    { at: "type what was decided", run: (d) => d.type("#dtext", "Move the status page checks to every five minutes", "Log a decision", { after: 150 }) },
    { at: "Press Log", run: (d) => d.click(`#addDecision ${btn("Log")}`, "Log", { after: 900 }) },
    { at: "The toast tells", run: (d) => d.hover(".toast", "No task yet", { soft: true, dwell: 1200 }) },
    { at: "decision inbox", run: (d) => d.hover(nav("decisions"), "Decision inbox", { dwell: 1200 }) },
  ] },

  { id: "md3", url: "meetings", setup: (d) => open(d, "Weekly ops sync"), beats: [
    { at: "Press Convert to task", run: (d) => d.click(`${drow("Rotate on-call")} ${btn("Convert to task")}`, "Convert to task", { after: 800 }) },
    { at: "The sheet quotes", run: (d) => d.hover(".drawer .quote", "The decision", { dwell: 900 }) },
    { at: "Choose the owner", run: (d) => d.select("#aOwner", { label: "Rahul Nair · QA engineer" }, "Owner: Rahul Nair") },
    { at: "Check the due date", run: (d) => d.hover("#aDue", "Due date") },
    { at: "Set the priority", run: (d) => d.click(prio("High"), "Priority: High", { after: 600 }) },
    { at: "Add notes", run: (d) => d.type("#aNotes", "Publish the rota in the ops channel.", "Notes", { after: 100 }) },
    { at: "Press Create task", run: (d) => d.click(sheetBtn("Create task"), "Create task", { after: 1200 }) },
    { at: "a linked task", run: (d) => d.hover(drow("Rotate on-call"), "Linked task", { dwell: 500 }) },
    { at: "the second column", run: (d) => d.hover(lrow("Rotate on-call"), "New action") },
  ] },

  { id: "md4", url: "meetings", setup: async (d) => {
    const members = await api("GET", "/members");
    const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    const m = await api("POST", "/meetings", { title: "Weekly ops sync (duplicate entry)", date: today, startTime: "11:00", durationMin: 30, attendeeIds: [members[0].id], agenda: "Logged twice by mistake." });
    await d.page.goto(`${APP}/meetings/${m.id}`, { waitUntil: "load" });
    await d.page.waitForSelector(".mast");
  }, beats: [
    { at: "Add action opens", run: (d) => d.click(btn("Add action"), "Add action", { after: 500 }) },
    { at: "Name it", run: (d) => d.type("#aTitle", "Check rota", "Task title", { after: 50 }) },
    { at: "choose an owner", run: (d) => d.select("#aOwner", { label: "Rahul Nair · QA engineer" }, "Owner", { after: 400 }) },
    { at: "press Add action", run: (d) => d.click(sheetBtn("Add action"), "Add action", { after: 900 }) },
    { at: "the delete button", run: (d) => d.hover('button[aria-label="Delete meeting"]', "Delete meeting") },
    { at: "we delete", run: (d) => d.click('button[aria-label="Delete meeting"]', "Delete meeting", { after: 900 }) },
    { at: "return to the list", run: (d) => d.hover(".toast", "Meeting deleted", { soft: true }) },
  ] },

  { id: "dc1", url: "decisions", beats: [
    { at: "It collects", run: (d) => d.hover("#dList", "Every decision, one inbox", { dwell: 1200 }) },
    { at: "Three tabs", run: (d) => d.hover(".tabs", "Three tabs", { dwell: 800 }) },
    { at: "The converted tab", run: (d) => d.click(tab("Converted"), "Converted", { after: 800 }) },
    { at: "how many tasks", run: (d) => d.hover(".drow .dact >> nth=0", "Linked tasks") },
    { at: "On the no action tab", run: (d) => d.click(tab("No action"), "No action", { after: 500 }) },
    { at: "Reopen brings", run: (d) => d.click(`.drow ${btn("Reopen")}`, "Reopen", { after: 900 }) },
    { at: "Back in the inbox", run: (d) => d.click(tab("Without tasks"), "Without tasks", { after: 400 }) },
    { at: "No action folds", run: (d) => d.click(`.drow >> nth=0 >> ${btn("No action")}`, "No action", { after: 900 }) },
  ] },

  { id: "dc2", url: "decisions", beats: [
    { at: "Convert to task works", run: (d) => d.click(`.drow >> nth=0 >> ${btn("Convert to task")}`, "Convert to task", { after: 500 }) },
    { at: "Choose an owner", run: (d) => d.select("#aOwner", { label: "Meera Iyer · Designer" }, "Owner: Meera Iyer", { after: 300 }) },
    { at: "press Create task", run: (d) => d.click(sheetBtn("Create task"), "Create task", { after: 400 }) },
    { at: "land on the open actions", run: async (d) => { await d.hover("#sideOpen", "Open actions", { dwell: 1000 }); await d.hover(".toast", "Decision turned into a task", { dwell: 200 }); } },
    { at: "press Undo", run: (d) => d.click(undo, "Undo", { after: 900 }) },
    { at: "comes back", run: (d) => d.hover("#dList", "Restored") },
  ] },

  { id: "ov1", url: "overdue", beats: [
    { at: "Four figures", run: (d) => d.hover(".figs", "Four figures", { dwell: 1500 }) },
    { at: "late work is grouped", run: (d) => d.hover(".sec.late >> nth=0", "Karthik Shetty: most late work", { dwell: 1200 }) },
    { at: "tick it", run: (d) => d.hover(`${lrow("Load test")} .chk`, "Tick it") },
    { at: "press plus three days", run: (d) => d.click(`${lrow("Load test")} ${btn("+3 days")}`, "+3 days", { after: 900 }) },
    { at: "the toast shows", run: (d) => d.hover(".toast", "Due date moved", { soft: true }) },
  ] },

  { id: "mb1", url: "members", beats: [
    { at: "Press Add member", run: (d) => d.click(btn("Add member"), "Add member", { after: 400 }) },
    { at: "Enter the full name", run: (d) => d.type("#memName", "Sanjana Kulkarni", "Full name", { after: 100 }) },
    { at: "an email address", run: (d) => d.type("#memEmail", "sanjana@team.dev", "Email", { after: 50 }) },
    { at: "a role", run: (d) => d.type("#memRole", "Finance analyst", "Role", { after: 100 }) },
    { at: "The avatar hue", run: (d) => d.type("#memHue", "140", "Avatar hue", { after: 100 }) },
    { at: "Press Add member", run: (d) => d.click(sheetBtn("Add member"), "Add member", { after: 900 }) },
    { at: "Edit opens", run: (d) => d.click(`${drow("Sanjana Kulkarni")} ${btn("Edit")}`, "Edit", { after: 500 }) },
    { at: "change her role", run: async (d) => { await d.type("#memRole", "Finance lead", "Role", { after: 50 }); await d.click(sheetBtn("Save changes"), "Save changes", { after: 400 }); } },
    { at: "The bin button", run: (d) => d.hover('button[aria-label="Remove Sanjana Kulkarni"]', "Remove") },
    { at: "Here it works", run: (d) => d.click('button[aria-label="Remove Sanjana Kulkarni"]', "Remove", { after: 600 }) },
  ] },

  { id: "pw1", beats: [
    { at: "Press Control K", run: (d) => d.key("Control+k", "Ctrl K") },
    { at: "Type to filter", run: async (d) => { await d.hover(".cmdk-in", "Type to filter", { dwell: 100 }); for (const c of "over") { await d.page.keyboard.type(c); await sleep(120); } } },
    { at: "Press enter", run: (d) => d.key("Enter", "Enter", { after: 700 }) },
    { at: "You can also", run: async (d) => { await d.key("Control+k", "Ctrl K", { after: 300 }); await d.hover(".cmdk-list", "Pages and actions", { dwell: 200 }); } },
    { at: "switch the theme", run: async (d) => { for (const c of "theme") { await d.page.keyboard.type(c); await sleep(100); } } },
    { at: "Escape closes", run: (d) => d.key("Escape", "Escape") },
  ] },

  { id: "pw2", beats: [
    { at: "The theme button", run: (d) => d.click("#themeBtn", "Dark theme", { after: 900 }) },
    { at: "teal black", run: (d) => d.hover(".figs", "Teal black by night", { dwell: 500 }) },
    { at: "The choice is", run: (d) => d.click("#themeBtn", "Light theme", { after: 500 }) },
  ] },

  { id: "pw3", beats: [
    { at: "Guided demo is", run: (d) => d.click("#demoBtn", "Guided demo", { after: 900 }) },
    { at: "Next moves", run: (d) => d.click("#tourNext", "Next", { after: 500 }) },
    { at: "Back moves", run: (d) => d.click("#tourBack", "Back", { after: 300 }) },
    { at: "the figures", run: (d) => d.hover("#tourPop", "Step 1 of 8", { dwell: 200 }) },
    { at: "what is slipping", run: (d) => d.click("#tourNext", "Next, step 2 of 8", { after: 300 }) },
    { at: "decisions with no owner", run: (d) => d.click("#tourNext", "Next, step 3 of 8", { after: 300 }) },
    { at: "converting a task", run: (d) => d.click("#tourNext", "Next, step 4 of 8", { after: 200 }) },
    { at: "where the task lands", run: (d) => d.click("#tourNext", "Next, step 5 of 8", { after: 200 }) },
    { at: "the overdue page", run: (d) => d.click("#tourNext", "Next, step 6 of 8", { after: 200 }) },
    { at: "the meetings log", run: (d) => d.click("#tourNext", "Next, step 7 of 8", { after: 200 }) },
    { at: "and the theme", run: (d) => d.click("#tourNext", "Next, step 8 of 8", { after: 300 }) },
    { at: "Finish ends", run: (d) => d.click("#tourNext", "Finish", { after: 700 }) },
  ] },

  { id: "pw4", beats: [
    { at: "Every open tab", run: (d) => d.hover(".live", "Live connection", { dwell: 800 }) },
    { at: "We have not touched", run: async () => {
      const list = await api("GET", "/actions?overdue=true");
      const a = list.find((x) => x.title.startsWith("Load test"));
      await api("PATCH", `/actions/${a.id}/status`, { status: "done" });
    } },
    { at: "a live update toast", run: async (d) => { await d.page.waitForSelector(".toast", { timeout: 6000 }); await d.hover(".toast", "Live update", { dwell: 900 }); } },
    { at: "the numbers roll", run: (d) => d.hover(".figs", "Figures update", { dwell: 500 }) },
    { at: "this indicator", run: (d) => d.hover(".live", "Live, Reconnecting, Offline") },
  ] },

  { id: "pw5", beats: [
    { at: "The last page", run: (d) => d.click(nav("system"), "Design system", { after: 900 }) },
    // One slow continuous scroll down the page while the sections are named.
    { at: "the colour palette", run: (d) => d.scroll(3400, { ms: 8500 }) },
    { at: "It is a living", run: (d) => d.scroll(1000, { ms: 2500 }) },
  ] },

  { id: "api1", beats: [
    { at: "The health endpoint", run: async (d) => { await showJson(d, "/api/health"); await d.hover("pre", "GET /api/health", { dwell: 1500 }); } },
    { at: "The insights summary", run: async (d) => { await showJson(d, "/api/insights/summary"); await d.hover("pre", "GET /api/insights/summary", { dwell: 1500 }); } },
    { at: "Ask for a status", run: async (d) => { await showJson(d, "/api/actions?status=nope"); await d.hover("pre", "400 VALIDATION_ERROR", { dwell: 1500 }); } },
    { at: "Ask for a meeting", run: async (d) => { await showJson(d, "/api/meetings/64b000000000000000000000"); await d.hover("pre", "404 NOT_FOUND", { dwell: 1500 }); } },
  ] },

  { id: "va1", beats: [
    { at: "Open the meeting form", run: (d) => d.click("#newMeetingBtn", "New meeting", { after: 300 }) },
    { at: "almost nothing", run: async (d) => {
      await d.type("#mTitle", "Hi", "Title", { after: 100 });
      await d.type("#mDur", "2", "Duration", { after: 100 });
      await d.click(sheetBtn("Create meeting"), "Create meeting", { after: 700 });
    } },
    { at: "A title that", run: (d) => d.hover("#f-mtitle", "Title: 3 to 100 characters", { dwell: 500 }) },
    { at: "a duration", run: (d) => d.hover("#f-mdur", "Duration: 5 to 480 minutes", { dwell: 500 }) },
    { at: "no attendees", run: (d) => d.hover("#f-matt", "At least one attendee", { dwell: 500 }) },
    { at: "Correct a field", run: (d) => d.type("#mTitle", "Sprint 15 planning", "Title", { after: 200 }) },
    { at: "never thrown away", run: (d) => d.click(sheetBtn("Cancel"), "Cancel", { after: 300 }) },
  ] },

  { id: "va2", url: "meetings", setup: (d) => open(d, "Weekly ops sync"), beats: [
    { at: "The task form", run: async (d) => { await d.click(btn("Add action"), "Add action", { after: 300 }); await d.type("#aTitle", "Audit the on-call rota", "Task title", { after: 100 }); } },
    { at: "With no owner", run: async (d) => { await d.click(sheetBtn("Add action"), "Add action", { after: 500 }); await d.hover("#f-owner", "Pick who owns this task", { dwell: 300 }); } },
    { at: "due in the past", run: async (d) => {
      const y = new Date(Date.now() + 5.5 * 3600e3 - 86400e3).toISOString().slice(0, 10);
      await d.fill("#aDue", y, "Due date", { after: 200 });
      await d.click(sheetBtn("Add action"), "Add action", { after: 500 });
    } },
    { at: "In the decisions column", run: async (d) => { await d.click(sheetBtn("Cancel"), "Cancel", { after: 200 }); await d.type("#dtext", "ok", "Log a decision", { after: 100 }); } },
    { at: "is refused", run: async (d) => { await d.click(`#addDecision ${btn("Log")}`, "Log", { after: 300 }); await d.hover("#f-dtext", "At least 5 characters", { dwell: 500 }); } },
  ] },

  { id: "va3", url: "meetings", beats: [
    { at: "Search for something", run: (d) => d.type("#q", "zzz", "Search", { after: 200 }) },
    { at: "no meetings match", run: (d) => d.hover(".empty", "No meetings match", { dwell: 300 }) },
    { at: "a button to clear", run: (d) => d.click(`.empty ${btn("Clear search")}`, "Clear search", { after: 300 }) },
    { at: "a nonsense command", run: async (d) => {
      await d.key("Control+k", "Ctrl K", { after: 150 });
      for (const c of "zzz") { await d.page.keyboard.type(c); await sleep(110); }
    } },
    { at: "An address", run: async (d) => { await d.page.goto(APP + "/not-a-page", { waitUntil: "load" }); await d.page.waitForSelector(".mast"); await sleep(400); await d.hover(".mast", "Page not found", { dwell: 200 }); } },
    { at: "a link back", run: (d) => d.click('a.back:has-text("Back to Today")', "Back to Today", { after: 300 }) },
    { at: "So does", run: async (d) => { await d.page.goto(APP + "/meetings/64b000000000000000000000", { waitUntil: "load" }); await d.page.waitForSelector(".mast"); await sleep(300); await d.hover(".mast", "Meeting not found", { dwell: 300 }); } },
  ] },

  { id: "va4", url: "members", beats: [
    { at: "Try to remove", run: (d) => d.click('button[aria-label="Remove Ananya Rao"]', "Remove Ananya Rao", { after: 700 }) },
    { at: "explains why", run: (d) => d.hover(".toast", "Cannot remove member", { soft: true, dwell: 800 }) },
    { at: "In the member form", run: async (d) => {
      await d.click(btn("Add member"), "Add member", { after: 150 });
      await d.page.fill("#memName", "Dev Patel");
    } },
    { at: "a bad email", run: (d) => d.type("#memEmail", "dev.patel@", "Email", { after: 50 }) },
    { at: "before anything", run: async (d) => {
      await d.click(sheetBtn("Add member"), "Add member", { after: 300 });
      await d.hover(".drawer .field.err", "Enter a valid email", { dwell: 300 });
    } },
    { at: "the app says so", run: async (d) => {
      const pending = (await api("GET", "/decisions?status=pending&limit=100"));
      for (const p of pending) await api("POST", `/decisions/${p.id}/dismiss`, { reason: "Closed for the demo" });
      await d.page.goto(APP + "/decisions", { waitUntil: "load" });
      await d.page.waitForSelector(".empty");
      await sleep(300);
    } },
    { at: "a calm message", run: (d) => d.hover(".empty", "Every decision has an owner") },
  ] },

  { id: "rw1", beats: [
    { at: "presses New meeting", run: (d) => d.click("#newMeetingBtn", "New meeting", { after: 300 }) },
    { at: "She enters the title", run: (d) => d.type("#mTitle", "Release 2.4 planning", "Title", { after: 100 }) },
    { at: "sets ten thirty", run: async (d) => { await d.fill("#mTime", "10:30", "Start, IST", { after: 200 }); await d.type("#mDur", "45", "Duration", { after: 100 }); } },
    { at: "marks who attended", run: async (d) => {
      await d.click(att("Ananya"), "Ananya Rao", { after: 150 });
      await d.click(att("Karthik"), "Karthik", { after: 150 });
      await d.click(att("Meera"), "Meera", { after: 150 });
      await d.click(att("Rahul"), "Rahul", { after: 150 });
    } },
    { at: "She creates", run: (d) => d.click(sheetBtn("Create meeting"), "Create meeting", { after: 700 }) },
  ] },

  { id: "rw2", keep: true, url: "meetings", setup: (d) => open(d, "Release 2.4 planning"), beats: [
    { at: "Freeze new features", run: async (d) => { await d.type("#dtext", "Freeze new features by Thursday", "Log a decision", { after: 50 }); await d.page.keyboard.press("Enter"); await sleep(250); } },
    { at: "Add a rollback", run: async (d) => { await d.type("#dtext", "Add a rollback step to the release checklist", "Log a decision", { after: 50 }); await d.page.keyboard.press("Enter"); await sleep(250); } },
    { at: "Keep the old export", run: async (d) => { await d.type("#dtext", "Keep the old export for one more release", "Log a decision", { after: 50 }); await d.page.keyboard.press("Enter"); await sleep(250); } },
    { at: "she marks it", run: (d) => d.click(`${drow("Keep the old export")} ${btn("No action")}`, "No action", { after: 600 }) },
    { at: "The other two", run: (d) => d.hover(".sec.dec", "2 need owners") },
  ] },

  { id: "rw3", keep: true, url: "meetings", setup: (d) => open(d, "Release 2.4 planning"), beats: [
    { at: "She converts the first", run: async (d) => {
      await d.click(`${drow("Freeze new features")} ${btn("Convert to task")}`, "Convert to task", { after: 250 });
      await d.select("#aOwner", { label: "Karthik Shetty · Backend engineer" }, "Owner: Karthik", { after: 100 });
      await d.click(prio("High"), "Priority: High", { after: 100 });
      await d.click(sheetBtn("Create task"), "Create task", { after: 500 });
    } },
    { at: "She converts the second", run: async (d) => {
      await d.click(`${drow("Add a rollback")} ${btn("Convert to task")}`, "Convert to task", { after: 250 });
      await d.select("#aOwner", { label: "Rahul Nair · QA engineer" }, "Owner: Rahul", { after: 100 });
      await d.click(sheetBtn("Create task"), "Create task", { after: 500 });
    } },
    { at: "every decision", run: (d) => d.hover(".figs", "Every decision has an owner", { dwell: 500 }) },
  ] },

  { id: "rw4", keep: true, beats: [
    { at: "opens the Overdue page", run: (d) => d.click(nav("overdue"), "Overdue", { after: 500 }) },
    { at: "name is at the top", run: (d) => d.hover(".sec.late >> nth=0", "Karthik Shetty", { dwell: 700 }) },
    { at: "gets ticked off", run: (d) => d.click(`${lrow("Renew SSL")} .chk`, "Done", { after: 800 }) },
    { at: "three more days", run: (d) => d.click(`${lrow("signup API")} ${btn("+3 days")}`, "+3 days", { after: 700 }) },
    { at: "she checks the inbox", run: (d) => d.click(nav("decisions"), "Decision inbox", { after: 600 }) },
    { at: "Nothing has been forgotten", run: (d) => d.hover("#dList", "Nothing forgotten") },
  ] },
];

// ---------- run ----------
const want = process.argv.slice(2);
const list = want.length ? SCENES.filter((s) => want.includes(s.id)) : SCENES;
if (want.length && list.length !== want.length) throw new Error("unknown scene in: " + want.join(" "));
const report = [];
for (const s of list) {
  if (!s.keep) reseed();
  process.stdout.write(`rec ${s.id} ... `);
  try {
    const r = await recordScene(s);
    report.push(r);
    console.log(`${(r.recordedMs / 1000).toFixed(1)}s video / ${(r.audioMs / 1000).toFixed(1)}s audio, ${r.events} events${r.errors.length ? ", PAGE ERRORS: " + r.errors.join("; ") : ""}${r.late.length ? ", LATE: " + r.late.join("; ") : ""}`);
  } catch (e) {
    console.log("FAILED: " + e.message);
    report.push({ id: s.id, failed: e.message });
  }
}
const file = path.resolve(import.meta.dirname, "report.json");
const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
fs.writeFileSync(file, JSON.stringify([...prior.filter((p) => !report.some((r) => r.id === p.id)), ...report], null, 1));
const failed = report.filter((r) => r.failed).map((r) => r.id);
console.log(failed.length ? `FAILED: ${failed.join(" ")}` : "all scenes recorded");
