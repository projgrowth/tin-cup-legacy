import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const email = process.env.TIN_CUP_TEST_EMAIL;
const password = process.env.TIN_CUP_TEST_PASSWORD;
const expectedUserId = "89aeaeb7-8032-450d-a60b-581c24696044";

if (!supabaseUrl || !publishableKey || !email || !password) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, TIN_CUP_TEST_EMAIL, and TIN_CUP_TEST_PASSWORD are required",
  );
}

function device() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireData(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

function subscribeToMatch(client, matchId, channelName) {
  let resolveEvent;
  let rejectEvent;
  const event = new Promise((resolve, reject) => {
    resolveEvent = resolve;
    rejectEvent = reject;
  });
  const timer = setTimeout(() => rejectEvent(new Error(`${channelName} timed out`)), 12_000);
  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
      (payload) => {
        clearTimeout(timer);
        resolveEvent(payload);
      },
    );
  const ready = new Promise((resolve, reject) => {
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        reject(error ?? new Error(`${channelName} failed with ${status}`));
      }
    });
  });
  return { channel, event, ready };
}

const deviceOne = device();
const deviceTwo = device();

try {
  const [one, two] = await Promise.all([
    requireData(deviceOne.auth.signInWithPassword({ email, password }), "device one sign-in"),
    requireData(deviceTwo.auth.signInWithPassword({ email, password }), "device two sign-in"),
  ]);
  if (one.user?.id !== expectedUserId || two.user?.id !== expectedUserId) {
    throw new Error("Captain sessions did not preserve the expected user UUID");
  }
  if (!one.session?.access_token || !two.session?.access_token) {
    throw new Error("Captain sign-in returned no realtime access token");
  }
  deviceOne.realtime.setAuth(one.session.access_token);
  deviceTwo.realtime.setAuth(two.session.access_token);

  const visibleRoles = await requireData(
    deviceOne.from("user_roles").select("role").eq("user_id", expectedUserId),
    "read captain role",
  );
  if (!visibleRoles.some((row) => row.role === "captain")) {
    throw new Error("Temporary captain role is not visible to the authenticated user");
  }

  const match = await requireData(
    deviceOne
      .from("matches")
      .select("id,result,revision,updated_at")
      .order("sort_order")
      .limit(1)
      .single(),
    "read score row",
  );

  const twoWatching = subscribeToMatch(deviceTwo, match.id, "captain-device-two");
  await twoWatching.ready;
  const firstWrite = await requireData(
    deviceOne
      .from("matches")
      .update({ result: match.result })
      .eq("id", match.id)
      .eq("revision", match.revision)
      .select("id,revision")
      .single(),
    "device one score write",
  );
  const firstEvent = await twoWatching.event;
  if (
    firstEvent.new?.id !== match.id ||
    Number(firstEvent.new?.revision) !== Number(firstWrite.revision)
  ) {
    throw new Error("Device two received an unexpected realtime score event");
  }
  await deviceTwo.removeChannel(twoWatching.channel);

  const oneWatching = subscribeToMatch(deviceOne, match.id, "captain-device-one");
  await oneWatching.ready;
  const secondWrite = await requireData(
    deviceTwo
      .from("matches")
      .update({ result: match.result })
      .eq("id", match.id)
      .eq("revision", firstWrite.revision)
      .select("id,revision")
      .single(),
    "device two score write",
  );
  const secondEvent = await oneWatching.event;
  if (
    secondEvent.new?.id !== match.id ||
    Number(secondEvent.new?.revision) !== Number(secondWrite.revision)
  ) {
    throw new Error("Device one received an unexpected realtime score event");
  }
  await deviceOne.removeChannel(oneWatching.channel);

  console.log(
    JSON.stringify({
      captain_role_verified: true,
      authenticated_devices: 2,
      score_writes_verified: 2,
      realtime_events_verified: 2,
      optimistic_revision_checks_verified: 2,
    }),
  );
} finally {
  await Promise.allSettled([
    deviceOne.auth.signOut({ scope: "local" }),
    deviceTwo.auth.signOut({ scope: "local" }),
    deviceOne.removeAllChannels(),
    deviceTwo.removeAllChannels(),
  ]);
}
