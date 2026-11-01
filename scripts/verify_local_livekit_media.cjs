const assert = require("node:assert/strict");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const { chromium } = require("playwright");

const LIVEKIT_URL = "ws://127.0.0.1:17880";
const API_KEY = "devkey";
const API_SECRET = "secret";
const ROOM = `hrms_local_verification_${Date.now()}`;
const livekitUmd = require.resolve("livekit-client", { paths: [path.resolve("CMS")] });

function token(identity, name) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: API_KEY,
      sub: identity,
      name,
      nbf: now - 5,
      exp: now + 600,
      video: {
        room: ROOM,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    },
    API_SECRET,
    { algorithm: "HS256" }
  );
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--no-sandbox"],
  });
  const contexts = [];
  const rooms = [];
  const logs = [];

  try {
    const clients = [
      { identity: "local-host", name: "Local Host" },
      { identity: "local-guest", name: "Local Guest" },
    ];

    for (const client of clients) {
      const context = await browser.newContext({ permissions: ["camera", "microphone"] });
      contexts.push(context);
      const page = await context.newPage();
      page.on("pageerror", (error) => logs.push(`${client.identity}: ${error.message}`));
      await page.goto("http://127.0.0.1:17880", { waitUntil: "domcontentloaded" });
      await page.addScriptTag({ path: livekitUmd });
      const result = await page.evaluate(
        async ({ url, accessToken, roomName }) => {
          const { Room, RoomEvent, Track } = window.LivekitClient;
          const room = new Room({ adaptiveStream: false, dynacast: false });
          const events = [];
          room.on(RoomEvent.Connected, () => events.push("connected"));
          room.on(RoomEvent.ParticipantConnected, (participant) => events.push(`participant:${participant.identity}`));
          room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            events.push(`track:${participant.identity}:${track.kind}`);
            if (track.kind === Track.Kind.Video) {
              const video = document.createElement("video");
              video.autoplay = true;
              video.playsInline = true;
              video.srcObject = new MediaStream([track.mediaStreamTrack]);
              document.body.appendChild(video);
              void video.play().catch(() => {});
            }
          });
          await room.connect(url, accessToken, { autoSubscribe: true });
          window.__livekitRoom = room;
          window.__livekitEvents = events;
          return { state: room.state, identity: room.localParticipant.identity, room: roomName };
        },
        { url: LIVEKIT_URL, accessToken: token(client.identity, client.name), roomName: ROOM }
      );
      assert.equal(result.state, "connected", `${client.identity} failed to connect to local SFU`);
      rooms.push(page);
    }

    await rooms[0].evaluate(async () => {
      await window.__livekitRoom.localParticipant.setCameraEnabled(true);
      await window.__livekitRoom.localParticipant.setMicrophoneEnabled(true);
    });

    await rooms[1].waitForFunction(
      () => window.__livekitEvents.some((event) => event === "track:local-host:video") && window.__livekitEvents.some((event) => event === "track:local-host:audio"),
      { timeout: 30000 }
    );
    await rooms[1].waitForFunction(() => {
      const video = document.querySelector("video");
      return Boolean(video && video.readyState >= 2 && video.videoWidth > 0 && video.srcObject);
    }, { timeout: 30000 });

    const media = await rooms[1].evaluate(() => {
      const video = document.querySelector("video");
      return {
        events: window.__livekitEvents,
        videoReadyState: video?.readyState ?? 0,
        videoWidth: video?.videoWidth ?? 0,
        videoHeight: video?.videoHeight ?? 0,
        srcObjectTrackStates: video?.srcObject?.getTracks().map((track) => ({ kind: track.kind, state: track.readyState })) ?? [],
      };
    });
    assert.ok(media.videoWidth > 0 && media.videoHeight > 0, "remote video did not render frames");
    assert.ok(media.events.includes("track:local-host:audio"), "remote audio track was not subscribed");
    console.log(JSON.stringify({ status: "PASS", room: ROOM, participantsConnected: 2, ...media }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "FAIL", error: error.message, browserErrors: logs }, null, 2));
    process.exitCode = 1;
  } finally {
    for (const context of contexts) {
      for (const page of context.pages()) {
        await page.evaluate(() => window.__livekitRoom?.disconnect()).catch(() => {});
      }
      await context.close().catch(() => {});
    }
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
