const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.findTicketByBarcode = functions.https.onCall(async (request) => {
  const { barcode, eventIds } = request.data;

  if (!barcode || !eventIds || !Array.isArray(eventIds)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Barcode and eventIds are required."
    );
  }

  for (const eventId of eventIds) {
    const collectionRef = admin
      .firestore()
      .collection("tickets")
      .doc("ticket_events")
      .collection(eventId);

      console.log("⏱ Starting barcode search...");
      const start = Date.now();
    // 1st Query: Check 'barcode'
    const barcodeSnap = await collectionRef
      .where("barcode", "==", barcode)
      .limit(1)
      .get();

      const durationSeconds = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`✅ Barcode query completed in ${durationSeconds} seconds`);
      console.log(`📦 Docs found: ${barcodeSnap.size}`);
    if (!barcodeSnap.empty) {
      const doc = barcodeSnap.docs[0];
      return { ticket: doc.data(), id: doc.id };
    }

    // 2nd Query: Check 'wristband_barcode'
    const wristbandSnap = await collectionRef
      .where("wristband_barcode", "==", barcode)
      .limit(1)
      .get();

    if (!wristbandSnap.empty) {
      const doc = wristbandSnap.docs[0];
      return { ticket: doc.data(), id: doc.id };
    }
  }

  throw new functions.https.HttpsError(
    "not-found",
    "No matching ticket found for the provided barcode."
  );
});


exports.searchTicketsByBarcode = functions.https.onCall(async (request) => {
  const { searchInput, eventIds } = request.data;

  if (!searchInput || !eventIds || !Array.isArray(eventIds)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Search input and eventIds are required."
    );
  }

  const lowerSearch = searchInput.toLowerCase().trim();
  const resultsMap = new Map();

  for (const eventId of eventIds) {
    if (!eventId) continue;

    const collectionRef = admin
      .firestore()
      .collection("tickets")
      .doc("ticket_events")
      .collection(eventId);

    // Load all docs
    const allDocsSnap = await collectionRef.get();

    allDocsSnap.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;

      const barcode = (data.barcode ?? "").toLowerCase();
      const wristband = (data.wristband_barcode ?? "").toLowerCase();
      const firstName = (data.attendeeFirstName ?? "").toLowerCase();
      const lastName = (data.attendeeSurname ?? "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.toLowerCase().trim();

      // Match using .includes (partial match)
      if (
        barcode.includes(lowerSearch) ||
        wristband.includes(lowerSearch) ||
        firstName.includes(lowerSearch) ||
        lastName.includes(lowerSearch) ||
        fullName.includes(lowerSearch)
      ) {
        if (!resultsMap.has(id)) {
          resultsMap.set(id, { ...data, id });
        }
      }
    });
  }

  return { tickets: Array.from(resultsMap.values()) };
});

exports.loadPaginatedTickets = functions.https.onCall(async (request) => {
  const { eventIds, limit } = request.data;

  if (!eventIds || !Array.isArray(eventIds)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventIds must be a non-empty array."
    );
  }

  const seenIds = new Set();
  const resultTickets = [];

  for (const eventId of eventIds) {
    if (!eventId) continue;

    const collectionRef = admin
      .firestore()
      .collection("tickets")
      .doc("ticket_events")
      .collection(eventId)
      .orderBy("created_at", "asc") 
      .limit(limit);

    try {
      const snapshot = await collectionRef.get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;

        if (!seenIds.has(id)) {
          seenIds.add(id);
          resultTickets.push({ ...data, id });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch tickets for event ${eventId}:`, err);
    }
  }

  return { tickets: resultTickets };
});

exports.fetchInitialTickets = functions.https.onCall(async (request) => {
  const { eventIds } = request.data;

  if (!eventIds || !Array.isArray(eventIds)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventIds must be a non-empty array."
    );
  }

  const seenIds = new Set();
  const resultTickets = [];

  for (const eventId of eventIds) {
    if (!eventId) continue;

    const collectionRef = admin
      .firestore()
      .collection("tickets")
      .doc("ticket_events")
      .collection(eventId)
      .orderBy("created_at", "asc") 
      .limit(10);

    try {
      const snapshot = await collectionRef.get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;

        if (!seenIds.has(id)) {
          seenIds.add(id);
          resultTickets.push({ ...data, id });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch tickets for event ${eventId}:`, err);
    }
  }

  return { tickets: resultTickets };
});

exports.fetchAllTickets = functions.https.onCall(async (request) => {
  const { eventIds } = request.data;

  if (!eventIds || !Array.isArray(eventIds)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "eventIds must be a non-empty array."
    );
  }

  const seenIds = new Set();
  const resultTickets = [];

  for (const eventId of eventIds) {
    if (!eventId) continue;

    const collectionRef = admin
      .firestore()
      .collection("tickets")
      .doc("ticket_events")
      .collection(eventId)
      .orderBy("created_at", "asc"); // <-- Removed .limit(10)

    try {
      const snapshot = await collectionRef.get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;

        if (!seenIds.has(id)) {
          seenIds.add(id);
          resultTickets.push({ ...data, id });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch tickets for event ${eventId}:`, err);
    }
  }

  return { tickets: resultTickets };
});

