const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const { JSDOM } = require("jsdom");

test("renders history and live payloads as text, including after reconnect", () => {
  const html = readFileSync("index (1).html", "utf8");
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  try {
    const handlers = new Map();
    dom.window.io = () => ({ on: (name, handler) => handlers.set(name, handler) });
    dom.window.eval(dom.window.document.querySelector("script:not([src])").textContent);

    const payload = '<img src=x onerror="window.injected = true">';
    const history = { _id: "1", name: payload, message: payload };
    const live = { _id: "2", name: "Guest", message: payload };
    handlers.get("messages")(history);
    handlers.get("messages")(live);
    handlers.get("history")([history]);

    const messages = dom.window.document.querySelector("#messages");
    assert.equal(messages.querySelectorAll(".msg").length, 2);
    assert.equal(messages.querySelector(".name").textContent, payload);
    assert.deepEqual(Array.from(messages.querySelectorAll(".text"), (el) => el.textContent),
      [payload, payload]);
    assert.equal(messages.querySelector("img"), null);

    handlers.get("disconnect")();
    handlers.get("history")([live]);
    assert.equal(messages.querySelectorAll(".msg").length, 1);
  } finally {
    dom.window.close();
  }
});
