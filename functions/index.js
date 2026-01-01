const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();

exports.getUsers = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const listUsers = await admin.auth().listUsers();
      const users = listUsers.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "No Name",
        provider: user.providerData[0]?.providerId || "Unknown",
        createdAt: new Date(user.metadata.creationTime).toLocaleString(),
        lastSignIn: new Date(user.metadata.lastSignInTime).toLocaleString(),
      }));
      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({error: error.message});
    }
  });
});

exports.createUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const {email, password, displayName} = req.body;
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      });
      res.status(201).json(userRecord);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({error: error.message});
    }
  });
});

exports.updateUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const {uid, ...updateData} = req.body;
      const userRecord = await admin.auth().updateUser(uid, updateData);
      res.status(200).json(userRecord);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({error: error.message});
    }
  });
});

exports.deleteUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const {uid} = req.body;
      await admin.auth().deleteUser(uid);
      res.status(200).json({message: "User deleted successfully"});
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({error: error.message});
    }
  });
});
