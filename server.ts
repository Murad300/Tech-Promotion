import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration matching the user's project
const firebaseConfig = {
  apiKey: "AIzaSyCuqn0W4lbTona95UEmgGS_V9gS0hiDzkg",
  authDomain: "smart-bd24.firebaseapp.com",
  databaseURL: "https://smart-bd24-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-bd24",
  storageBucket: "smart-bd24.firebasestorage.app",
  messagingSenderId: "642015758509",
  appId: "1:642015758509:web:60d1309d11b5f1f9be1e24"
};

// Initialize Firebase
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API 1: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
  });

  // API 2: Secure Server-Side Login
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      res.json({
        success: true,
        user: {
          email: userCredential.user.email,
          uid: userCredential.user.uid
        }
      });
    } catch (err: any) {
      // Admin bypass override fallback (if user isn't in Auth list yet)
      if (email === 'usamail.murad@gmail.com' && password === 'Admin@murad') {
        res.json({
          success: true,
          user: {
            email: 'usamail.murad@gmail.com',
            uid: 'admin-bypass-v3'
          }
        });
      } else {
        res.status(401).json({
          success: false,
          error: err.message || 'Incorrect credentials.'
        });
      }
    }
  });

  // API 3: Get All Contacts
  app.get('/api/contacts', async (req, res) => {
    try {
      const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || 'active'
        });
      });
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 4: Save Bulk Contacts (Instant backend writes)
  app.post('/api/contacts/bulk', async (req, res) => {
    const { phones, emails } = req.body;
    if (!Array.isArray(phones) || !Array.isArray(emails)) {
      return res.status(400).json({ success: false, error: 'Invalid payload structure' });
    }

    try {
      // Fetch existing to prevent duplicates on the backend
      const q = query(collection(db, 'contacts'));
      const snapshot = await getDocs(q);
      const existing: any[] = [];
      snapshot.forEach((docSnap) => {
        existing.push(docSnap.data());
      });

      let saveCount = 0;
      let skipCount = 0;
      const savePromises: Promise<any>[] = [];

      const maxLen = Math.max(phones.length, emails.length);
      for (let i = 0; i < maxLen; i++) {
        const phoneNumber = phones[i] ? String(phones[i]).trim() : '';
        const email = emails[i] ? String(emails[i]).trim().toLowerCase() : '';

        const isDuplicate = existing.some(c => 
          (phoneNumber && c.phoneNumber === phoneNumber) || 
          (email && c.email?.toLowerCase() === email)
        );

        if (isDuplicate) {
          skipCount++;
          continue;
        }

        const record = {
          phoneNumber,
          email,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        savePromises.push(addDoc(collection(db, 'contacts'), record));
        saveCount++;
      }

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      res.json({ success: true, saveCount, skipCount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 5: Update Contact Status (Active / Recycled)
  app.put('/api/contacts/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const contactRef = doc(db, 'contacts', id);
      await updateDoc(contactRef, { status });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 6: Delete Contact Permanently
  app.delete('/api/contacts/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const contactRef = doc(db, 'contacts', id);
      await deleteDoc(contactRef);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 7: Get All Templates
  app.get('/api/templates', async (req, res) => {
    try {
      const q = query(collection(db, 'promo_templates'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          label: data.label || '',
          text: data.text || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 8: Save New Template
  app.post('/api/templates', async (req, res) => {
    const { label, text } = req.body;
    try {
      const record = {
        label,
        text,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'promo_templates'), record);
      res.json({ success: true, id: docRef.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 9: Delete Template
  app.delete('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const templateRef = doc(db, 'promo_templates', id);
      await deleteDoc(templateRef);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite integration for full stack dev / production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
