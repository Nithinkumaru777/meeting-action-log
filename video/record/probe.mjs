// Checks what the narration claims against the running demo API, before anything is recorded.
const API = "http://localhost:5000/api";
const call = async (m, p, b) => {
  const r = await fetch(API + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
console.log("health", JSON.stringify((await call("GET", "/health")).body));
console.log("summary", JSON.stringify((await call("GET", "/insights/summary")).body));
const bad = await call("GET", "/actions?status=nope");
console.log("bad status", bad.status, JSON.stringify(bad.body));
const nf = await call("GET", "/meetings/64b000000000000000000000");
console.log("not found", nf.status, JSON.stringify(nf.body));
const over = (await call("GET", "/insights/overdue")).body.data;
console.log("overdue groups", over.map((g) => `${g.owner.name}:${g.count}`).join(" "), "|", over.flatMap((g) => g.actions.map((a) => a.title)).join(" ; "));

// The on-screen Undo after +3 days restores the old (past) due date. Does the server allow it?
const a = over[0].actions[0];
const ext = await call("POST", `/actions/${a.id}/extend`, { days: 3 });
console.log("extend", ext.status, a.dueDate, "->", ext.body.data?.dueDate);
const back = await call("PATCH", `/actions/${a.id}`, { dueDate: a.dueDate });
console.log("undo extend", back.status, JSON.stringify(back.body).slice(0, 220));

const del = await call("GET", "/members");
const ananya = del.body.data.find((m) => m.name === "Ananya Rao");
const blocked = await call("DELETE", `/members/${ananya.id}`);
console.log("remove Ananya", blocked.status, JSON.stringify(blocked.body).slice(0, 220));
