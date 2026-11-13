const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { MongoClient } = require("mongodb");
const { io } = require("socket.io-client");
const test = require("node:test");

test("serves the latest history and only persists valid messages", { timeout: 20000 }, async (t) => {
  const mongoUrl = new URL(process.env.CHAT_TEST_MONGO_URI || "mongodb://127.0.0.1:27017");
  mongoUrl.pathname = "/chat_test_" + randomUUID().replace(/-/g, "");
  const mongo = new MongoClient(mongoUrl.href, { serverSelectionTimeoutMS: 4000 });
  const database = mongo.db();
  const messages = database.collection("messages");
  t.after(async () => {
    try {
      if (mongoConnected) await database.dropDatabase();
    } finally {
      await mongo.close();
    }
  });
  let mongoConnected = false;
  await mongo.connect();
  mongoConnected = true;
  await messages.insertMany(Array.from({ length: 65 }, (_, i) => ({
    name: "Test",
    message: "Message " + i,
    createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, Math.floor(i / 2))),
  })));

  const server = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: "0", MONGO_URI: mongoUrl.href },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    if (server.exitCode === null && !server.killed) server.kill();
  });
  let output = "";
  const port = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error("Server exited with code " + code)));
    server.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/Servidor en :(\d+)/);
      if (match && output.includes("MongoDB conectado")) resolve(Number(match[1]));
    });
  });
  assert.ok(!output.includes(mongoUrl.href));
  const origin = "http://127.0.0.1:" + port;
  assert.match(await (await fetch(origin)).text(), /src="\/socket.io\/socket.io.js"/);
  assert.equal((await fetch(origin + "/socket.io/socket.io.js")).status, 200);

  const sender = io(origin, { reconnection: false });
  const receiver = io(origin, { reconnection: false });
  t.after(() => {
    sender.disconnect();
    receiver.disconnect();
  });
  const [[history]] = await Promise.all([once(sender, "history"), once(receiver, "history")]);
  assert.deepEqual(history.map((item) => item.message),
    Array.from({ length: 60 }, (_, i) => "Message " + (i + 5)));

  const send = (data) => sender.timeout(3000).emitWithAck("message", data);
  for (const invalid of [null, {}, { message: 42 }, { message: " " },
    { message: "a".repeat(501) }, { name: {}, message: "hello" },
    { name: "a".repeat(31), message: "hello" }]) {
    assert.equal((await send(invalid)).ok, false);
  }
  assert.equal(await messages.countDocuments(), 65);

  const delivered = once(receiver, "messages");
  const payload = "<img src=x onerror=alert(1)>";
  assert.deepEqual(await send({ message: " " + payload + " " }), { ok: true });
  const [received] = await delivered;
  assert.equal(received.message, payload);
  assert.equal(received.name, "Anónimo");
  assert.equal(await messages.countDocuments(), 66);
});
