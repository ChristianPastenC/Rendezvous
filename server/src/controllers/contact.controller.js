// controllers/contact.controller.js
const { db } = require('../config/firebaseAdmin');
const { processUserDoc } = require('../utils/processUserDoc');

exports.getContacts = async (req, res) => {
  const userId = req.user.uid;
  try {
    const contactsSnapshot = await db.collection('users').doc(userId).collection('contacts').orderBy('lastActivity', 'desc').get();
    if (contactsSnapshot.empty) return res.status(200).json([]);

    const userPromises = contactsSnapshot.docs.map(doc => db.collection('users').doc(doc.id).get());
    const userDocs = await Promise.all(userPromises);

    const contactsData = userDocs
      .map(processUserDoc)
      .filter(u => u !== null);

    res.status(200).json(contactsData);
  } catch (error) {
    console.error("Error al obtener contactos:", error);
    res.status(500).json({ error: "Error al obtener contactos." });
  }
};