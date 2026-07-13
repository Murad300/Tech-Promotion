import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  LogIn, 
  User, 
  Lock, 
  Phone, 
  Mail, 
  Send, 
  Database, 
  LogOut, 
  Plus, 
  Trash2, 
  Smartphone, 
  CheckCircle, 
  RefreshCw, 
  MessageSquare, 
  Copy, 
  Check, 
  Search, 
  AlertCircle,
  Share2,
  Shuffle,
  Trash,
  RotateCcw,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Globe,
  Save,
  FileText
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

interface Contact {
  id: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  status?: 'active' | 'recycled';
}

interface PromoTemplate {
  id: string;
  label: string;
  text: string;
  createdAt: string;
}

export default function App() {
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('usamail.murad@gmail.com');
  const [loginPassword, setLoginPassword] = useState('Admin@murad');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Contacts & Custom Templates state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customTemplates, setCustomTemplates] = useState<PromoTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Input states
  const [bulkPhoneInput, setBulkPhoneInput] = useState('');
  const [bulkEmailInput, setBulkEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template creation states
  const [newTemplateLabel, setNewTemplateLabel] = useState('');
  const [newTemplateText, setNewTemplateText] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Selected promotion target and composed message
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [promoMessage, setPromoMessage] = useState('Write or select your custom saved campaign message here.');
  const [copiedText, setCopiedText] = useState(false);

  // Collapsible accordion triggers
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Terminal / Logs states
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({
    whatsappSentCount: 0,
    emailSentCount: 0
  });

  // Global blur loading and custom notification states
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Helper to trigger custom visual notification
  const showNotice = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    // Keep it up for 3 seconds for perfect visibility
    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);
    return () => clearTimeout(timer);
  };

  // Log action helper
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setSystemLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 18)]);
  };

  // 1. Firebase Auth listener with offline fallback bypass
  useEffect(() => {
    if (!auth) {
      setAuthChecking(false);
      addLog("Auth offline. Using local development override.");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        addLog(`Authenticated securely: ${firebaseUser.email}`);
      } else {
        setUser(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch contacts from Firestore with real-time updates
  useEffect(() => {
    if (!user) return;
    if (!db) {
      addLog("Firestore not found. Falling back to local device storage.");
      const cached = localStorage.getItem('tech_contacts_v3');
      if (cached) setContacts(JSON.parse(cached));
      return;
    }

    addLog("Binding real-time Firestore synchronization on 'contacts'...");
    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Contact[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || 'active',
        });
      });
      setContacts(list);
      localStorage.setItem('tech_contacts_v3', JSON.stringify(list));
      addLog(`Synchronized ${list.length} dial targets successfully.`);
    }, (error) => {
      addLog(`Firestore sync error: ${error.message}`);
      const cached = localStorage.getItem('tech_contacts_v3');
      if (cached) setContacts(JSON.parse(cached));
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch custom message templates from Firestore
  useEffect(() => {
    if (!user) return;
    if (!db) {
      const cached = localStorage.getItem('tech_templates_v3');
      if (cached) setCustomTemplates(JSON.parse(cached));
      return;
    }

    addLog("Fetching custom saved messages from Firestore...");
    const q = query(collection(db, 'promo_templates'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PromoTemplate[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          label: data.label || '',
          text: data.text || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      setCustomTemplates(list);
      localStorage.setItem('tech_templates_v3', JSON.stringify(list));
      
      // Load first custom template as default if user hasn't written anything
      if (list.length > 0 && promoMessage === 'Write or select your custom saved campaign message here.') {
        setPromoMessage(list[0].text);
      }
    }, (error) => {
      addLog(`Templates sync error: ${error.message}`);
      const cached = localStorage.getItem('tech_templates_v3');
      if (cached) setCustomTemplates(JSON.parse(cached));
    });

    return () => unsubscribe();
  }, [user]);

  // Load stats counters
  useEffect(() => {
    const cachedStats = localStorage.getItem('tech_stats_v3');
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch (e) {}
    }
  }, []);

  const updateStats = (key: 'whatsappSentCount' | 'emailSentCount') => {
    setStats(prev => {
      const next = { ...prev, [key]: prev[key] + 1 };
      localStorage.setItem('tech_stats_v3', JSON.stringify(next));
      return next;
    });
  };

  // Login authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoadingMessage("অনুমতি যাচাই করা হচ্ছে...");
    setGlobalLoading(true);
    setLoginLoading(true);
    addLog(`Authorizing access for ${loginEmail}...`);

    try {
      if (auth) {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        addLog("Firebase credentials approved successfully.");
        showNotice("লগইন সফল হয়েছে!", "success");
      } else {
        throw new Error("Authentication SDK is uninitialized.");
      }
    } catch (err: any) {
      addLog(`Firebase Auth declined: ${err.message}. Checking backup admin credentials...`);
      if (loginEmail === 'usamail.murad@gmail.com' && loginPassword === 'Admin@murad') {
        setUser({
          email: 'usamail.murad@gmail.com',
          uid: 'admin-bypass-v3'
        });
        addLog("Local Administrator Override: Authorized.");
        showNotice("লগইন সফল হয়েছে!", "success");
      } else {
        setLoginError("Incorrect credentials. Please try Admin@murad.");
        addLog("Security bypass failed.");
      }
    } finally {
      setLoginLoading(false);
      setGlobalLoading(false);
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    setSelectedContact(null);
    addLog("System logged out safely.");
  };

  // Contacts filters
  const activeContacts = useMemo(() => {
    return contacts.filter(c => (c.status || 'active') === 'active');
  }, [contacts]);

  const recycledContacts = useMemo(() => {
    return contacts.filter(c => c.status === 'recycled');
  }, [contacts]);

  // Specific high-contrast counts
  const activePhoneCount = useMemo(() => {
    return activeContacts.filter(c => !!c.phoneNumber).length;
  }, [activeContacts]);

  const activeEmailCount = useMemo(() => {
    return activeContacts.filter(c => !!c.email).length;
  }, [activeContacts]);

  // Clean and format phone number: keeps exactly whatever format they typed
  const formatPhoneNumber = (rawNumber: string): string => {
    return rawNumber.trim();
  };

  // 4. INSTANT BULK SUBMISSION WITH UNHINDERED PERFORMANCE (1-2 SECOND WRITES)
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingMessage("ডাটাবেজে সেভ হচ্ছে...");
    setGlobalLoading(true);
    setIsSubmitting(true);

    const phones = bulkPhoneInput
      .split(/[\n,;\t]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const emails = bulkEmailInput
      .split(/[\n,;\t]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (phones.length === 0 && emails.length === 0) {
      alert("Please input at least one phone number or email address.");
      setIsSubmitting(false);
      setGlobalLoading(false);
      return;
    }

    let saveCount = 0;
    let skipCount = 0;

    addLog(`Initiating instant parallelized write...`);

    try {
      const maxLen = Math.max(phones.length, emails.length);
      const savePromises: Promise<any>[] = [];

      for (let i = 0; i < maxLen; i++) {
        const phoneNumber = phones[i] ? formatPhoneNumber(phones[i]) : '';
        const email = emails[i] ? emails[i].trim().toLowerCase() : '';

        // Uniqueness check: duplicate pairs will not save twice
        const isDuplicate = contacts.some(c => 
          (phoneNumber && c.phoneNumber === phoneNumber) || 
          (email && c.email.toLowerCase() === email)
        );

        if (isDuplicate) {
          skipCount++;
          continue;
        }

        const record = {
          phoneNumber: phoneNumber,
          email: email,
          status: 'active' as const,
          createdAt: new Date().toISOString()
        };

        if (db) {
          savePromises.push(addDoc(collection(db, 'contacts'), record));
        } else {
          const localId = `local-${Date.now()}-${Math.random()}`;
          setContacts(prev => [{ id: localId, ...record }, ...prev]);
        }
        saveCount++;
      }

      if (db && savePromises.length > 0) {
        // Execute all writes instantly in parallel! Complete within 1-2 seconds
        await Promise.all(savePromises);
      }
      
      addLog(`High-speed bulk write complete: ${saveCount} active entries registered. ${skipCount} duplicates skipped.`);
      showNotice(`ডাটাবেজে সফলভাবে সেভ করা হয়েছে! (${saveCount} টি সেভ হয়েছে, ${skipCount} টি ডুপ্লিকেট বাদ পড়েছে)`, "success");

      // Clear the correct input boxes
      setBulkPhoneInput('');
      setBulkEmailInput('');

    } catch (err: any) {
      addLog(`Bulk insertion error: ${err.message}`);
      showNotice(`ভুল হয়েছে: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
      setGlobalLoading(false);
    }
  };

  // 5. SAVING DYNAMIC MESSAGES TO FIRESTORE
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateLabel.trim() || !newTemplateText.trim()) {
      alert("Please provide both a label name and message content.");
      return;
    }

    setSavingTemplate(true);
    addLog(`Saving new promotional message: "${newTemplateLabel}"...`);

    const newTemplate = {
      label: newTemplateLabel.trim(),
      text: newTemplateText.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (db) {
        await addDoc(collection(db, 'promo_templates'), newTemplate);
        addLog(`Template saved securely in Firestore.`);
      } else {
        const localId = `local-template-${Date.now()}`;
        const updated = [{ id: localId, ...newTemplate }, ...customTemplates];
        setCustomTemplates(updated);
        localStorage.setItem('tech_templates_v3', JSON.stringify(updated));
        addLog(`Template saved locally.`);
      }

      // Auto-load template into composer
      setPromoMessage(newTemplate.text);
      setNewTemplateLabel('');
      setNewTemplateText('');
      setShowTemplateManager(false);
    } catch (err: any) {
      addLog(`Error saving template: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete message template
  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this saved message template permanently?")) return;

    addLog(`Deleting template: ${id}...`);
    try {
      if (db && !id.startsWith('local-template-')) {
        await deleteDoc(doc(db, 'promo_templates', id));
        addLog("Template deleted from Firestore.");
      } else {
        const updated = customTemplates.filter(t => t.id !== id);
        setCustomTemplates(updated);
        localStorage.setItem('tech_templates_v3', JSON.stringify(updated));
        addLog("Template deleted locally.");
      }
    } catch (err: any) {
      addLog(`Template deletion failed: ${err.message}`);
    }
  };

  // 6. GENERATE TARGET TRIGGERS
  const handleGeneratePhone = () => {
    const phoneContacts = activeContacts.filter(c => !!c.phoneNumber);
    if (phoneContacts.length === 0) {
      alert("No active phone numbers found in the database yet.");
      return;
    }

    setLoadingMessage("ফোন নাম্বার জেনারেট হচ্ছে...");
    setGlobalLoading(true);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * phoneContacts.length);
      const chosen = phoneContacts[randomIndex];
      setSelectedContact({
        id: chosen.id,
        phoneNumber: chosen.phoneNumber,
        email: '', // Force empty email so ONLY WhatsApp button lights up
        createdAt: chosen.createdAt,
        status: chosen.status
      });
      addLog(`🎲 Random Phone Selected: ${chosen.phoneNumber}`);
      setGlobalLoading(false);
      showNotice("ফোন নাম্বার জেনারেট সফল হয়েছে!", "success");
    }, 800);
  };

  const handleGenerateEmail = () => {
    const emailContacts = activeContacts.filter(c => !!c.email);
    if (emailContacts.length === 0) {
      alert("No active emails found in the database yet.");
      return;
    }

    setLoadingMessage("ইমেইল জেনারেট হচ্ছে...");
    setGlobalLoading(true);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * emailContacts.length);
      const chosen = emailContacts[randomIndex];
      setSelectedContact({
        id: chosen.id,
        phoneNumber: '', // Force empty phone so ONLY Email button lights up
        email: chosen.email,
        createdAt: chosen.createdAt,
        status: chosen.status
      });
      addLog(`🎲 Random Email Selected: ${chosen.email}`);
      setGlobalLoading(false);
      showNotice("ইমেইল জেনারেট সফল হয়েছে!", "success");
    }, 800);
  };

  // 7. RECYCLE AND RECOVERY ACTIONS
  const handleMoveToRecycleBin = async (id: string, detail: string) => {
    addLog(`Moving ${detail} to Recycle Bin...`);
    try {
      if (db && !id.startsWith('local-')) {
        const contactRef = doc(db, 'contacts', id);
        await updateDoc(contactRef, { status: 'recycled' });
        addLog(`Lead Recycled: ${detail}`);
        showNotice("রিসাইকেল বিনে পাঠানো হয়েছে!", "info");
      } else {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, status: 'recycled' } : c));
        addLog(`Recycled locally: ${detail}`);
        showNotice("রিসাইকেল বিনে পাঠানো হয়েছে!", "info");
      }

      if (selectedContact?.id === id) {
        setSelectedContact(null);
      }
    } catch (err: any) {
      addLog(`Failed to recycle: ${err.message}`);
    }
  };

  const handleRestoreFromRecycleBin = async (id: string, detail: string) => {
    addLog(`Restoring ${detail} back to Active...`);
    try {
      if (db && !id.startsWith('local-')) {
        const contactRef = doc(db, 'contacts', id);
        await updateDoc(contactRef, { status: 'active' });
        addLog(`Lead Restored to active stream: ${detail}`);
        showNotice("সফলভাবে পুনরুদ্ধার করা হয়েছে!", "success");
      } else {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c));
        addLog(`Restored locally: ${detail}`);
        showNotice("সফলভাবে পুনরুদ্ধার করা হয়েছে!", "success");
      }
    } catch (err: any) {
      addLog(`Restore failed: ${err.message}`);
    }
  };

  const handlePermanentDelete = async (id: string, detail: string) => {
    if (!window.confirm(`Permanently erase ${detail} from Firestore? This is irreversible.`)) return;
    
    addLog(`Permanently deleting: ${detail}...`);
    try {
      if (db && !id.startsWith('local-')) {
        await deleteDoc(doc(db, 'contacts', id));
        addLog(`Permanently erased: ${detail}`);
        showNotice("ডাটাবেজ থেকে স্থায়ীভাবে ডিলেট করা হয়েছে!", "success");
      } else {
        setContacts(prev => prev.filter(c => c.id !== id));
        addLog(`Erased locally: ${detail}`);
        showNotice("ডাটাবেজ থেকে স্থায়ীভাবে ডিলেট করা হয়েছে!", "success");
      }
    } catch (err: any) {
      addLog(`Delete failed: ${err.message}`);
    }
  };

  // 8. ON-CLICK PROMOTION LAUNCHERS
  const handleSendWhatsApp = () => {
    if (!selectedContact || !selectedContact.phoneNumber) {
      alert("No active phone number is assigned to target.");
      return;
    }

    const cleanNum = selectedContact.phoneNumber;
    const encodedMessage = encodeURIComponent(promoMessage);
    const whatsappUrl = `https://wa.me/${cleanNum}?text=${encodedMessage}`;

    addLog(`Opening WhatsApp secure message channel to +${cleanNum}...`);
    updateStats('whatsappSentCount');
    window.open(whatsappUrl, '_blank');
  };

  const handleSendEmail = () => {
    if (!selectedContact || !selectedContact.email) {
      alert("No active email address is assigned to target.");
      return;
    }

    const targetEmail = selectedContact.email;
    const subject = encodeURIComponent("🚀 Special Deal from Tech Promotion");
    const body = encodeURIComponent(promoMessage);
    const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${body}`;

    addLog(`Opening default Mail composer with template target to ${targetEmail}...`);
    updateStats('emailSentCount');
    window.open(mailtoUrl, '_blank');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(promoMessage);
    setCopiedText(true);
    addLog("Promo text copied directly.");
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Filtered active list query
  const filteredActiveContacts = useMemo(() => {
    if (!searchQuery.trim()) return activeContacts;
    return activeContacts.filter(c => 
      c.phoneNumber.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeContacts, searchQuery]);

  // Loading Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Tech Promotion Systems Loading...</p>
      </div>
    );
  }

  // 1. MOBILE LOGIN VIEW
  if (!user) {
    return (
      <div id="login-layout" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
        <style>{`
          @keyframes borderGlow {
            0%, 100% { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 10px rgba(99, 102, 241, 0.15); }
            50% { border-color: rgba(16, 185, 129, 0.6); box-shadow: 0 0 20px rgba(16, 185, 129, 0.35); }
          }

          @keyframes textShimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          .animated-header-border {
            animation: borderGlow 4s infinite alternate;
          }

          .shimmer-text {
            background: linear-gradient(90deg, #4f46e5, #10b981, #6366f1, #059669, #4f46e5);
            background-size: 200% auto;
            color: transparent;
            -webkit-background-clip: text;
            background-clip: text;
            animation: textShimmer 3s linear infinite;
          }
        `}</style>

        {/* Custom visual notification toast */}
        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-bounce">
            <div className="bg-slate-900 border border-indigo-500/30 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 backdrop-blur-md">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-black text-emerald-400">সফল নোটিফিকেশন</p>
                <p className="text-[10px] text-slate-200 font-bold leading-normal mt-0.5">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Beautiful glassmorphic background-blur loading screen with rotating logo */}
        {globalLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-slate-950/60 transition-all duration-300">
            <div className="relative flex flex-col items-center p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl max-w-xs w-full text-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                <div className="absolute inset-4 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/50">
                  <Database className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white tracking-wide uppercase">Promotion System</h4>
                <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase animate-pulse">
                  {loadingMessage || "Processing..."}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Glow detail */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-900/10 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-sm space-y-6 z-10">
          
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-2 shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Tech Promotion
            </h1>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">
              Security Authentication Gateway
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-200">System Log In</h2>
              <p className="text-[11px] text-slate-400">Provide password access keys to enter promotional campaign workspace.</p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-[11px] font-semibold flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Campaign Username / Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full text-xs bg-slate-950 text-slate-200 pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Secret Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-xs bg-slate-950 text-slate-200 pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer mt-1"
              >
                {loginLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Enter Dials Dashboard</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 text-center text-[10px] text-slate-400 font-medium">
            <span className="font-bold text-slate-300">Authorized Client:</span>
            <div className="mt-1 flex justify-center gap-2">
              <span className="font-mono bg-slate-950/80 px-2 py-0.5 rounded text-indigo-300">{loginEmail}</span>
              <span className="font-mono bg-slate-950/80 px-2 py-0.5 rounded text-indigo-300">{loginPassword}</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 2. DASHBOARD VIEW (FULLY MOBILE OPTIMIZED)
  return (
    <div id="dashboard-layout" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none pb-8">
      
      {/* Custom visual notification toast */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-bounce">
          <div className="bg-slate-900 border border-indigo-500/30 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 backdrop-blur-md">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black text-emerald-400">সফল নোটিফিকেশন</p>
              <p className="text-[10px] text-slate-200 font-bold leading-normal mt-0.5">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Beautiful glassmorphic background-blur loading screen with rotating logo */}
      {globalLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-slate-950/60 transition-all duration-300">
          <div className="relative flex flex-col items-center p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl max-w-xs w-full text-center space-y-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
              <div className="absolute inset-4 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/50">
                <Database className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-white tracking-wide uppercase">Promotion System</h4>
              <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase animate-pulse">
                {loadingMessage || "Processing..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 animated-header-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase shimmer-text">Tech Promotion</h1>
            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-0.5">ADMIN DIALS LABS</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3 h-3" />
          <span>Exit</span>
        </button>
      </header>

      {/* METRIC CARD STATS FOR ACTIVE PHONES, EMAILS, & RECYCLE BIN */}
      <section className="bg-slate-900 text-white p-4 shrink-0 grid grid-cols-3 gap-2">
        <div className="bg-slate-950/40 border border-indigo-500/20 rounded-xl p-2.5 text-center flex flex-col justify-center">
          <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest block">Active Phones</span>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Phone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-base font-black text-white">{activePhoneCount}</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-emerald-500/20 rounded-xl p-2.5 text-center flex flex-col justify-center">
          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest block">Active Emails</span>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-base font-black text-white">{activeEmailCount}</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-rose-500/20 rounded-xl p-2.5 text-center flex flex-col justify-center">
          <span className="text-[8px] font-bold text-rose-400 uppercase tracking-widest block">Recycle Bin</span>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Trash className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-base font-black text-white">{recycledContacts.length}</span>
          </div>
        </div>
      </section>

      {/* Main Column scroll area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        
        {/* SECTION 1: INSTANT ADDS PANEL FOR PHONES AND EMAILS */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Add to Database</h2>
          </div>

          <form onSubmit={handleBulkAdd} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Phone number input on the left */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Phone Number
                </label>
                <textarea
                  value={bulkPhoneInput}
                  onChange={(e) => setBulkPhoneInput(e.target.value)}
                  placeholder="Enter phone number(s)..."
                  rows={4}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Email input on the right */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <textarea
                  value={bulkEmailInput}
                  onChange={(e) => setBulkEmailInput(e.target.value)}
                  placeholder="Enter email address(es)..."
                  rows={4}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold py-2.5 rounded-xl transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Add To Database</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* SECTION 2: MATCHING TARGET GENERATORS */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Shuffle className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Generate Target</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGeneratePhone}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm cursor-pointer text-center"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Generate Phone</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateEmail}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm cursor-pointer text-center"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Generate Email</span>
            </button>
          </div>
        </section>

        {/* SECTION 3: SAVED MESSAGE TEMPLATE CREATOR (ACCORDION MENU) */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => setShowTemplateManager(!showTemplateManager)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between transition-colors cursor-pointer text-left font-sans"
          >
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  💾 Custom Saved Messages ({customTemplates.length})
                </h3>
                <p className="text-[9px] text-slate-400 font-bold">
                  Create, save and select promotion texts dynamically
                </p>
              </div>
            </div>
            {showTemplateManager ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showTemplateManager && (
            <div className="p-4 border-t border-slate-100 bg-white space-y-4">
              <form onSubmit={handleSaveTemplate} className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 space-y-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Save New Template:</span>
                
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Template Label (e.g. Eid Discount)"
                    value={newTemplateLabel}
                    onChange={(e) => setNewTemplateLabel(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <textarea
                    required
                    placeholder="Write your promotional campaign message body copy here..."
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg leading-relaxed focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="w-full inline-flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {savingTemplate ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>Save Template to Firebase</span>
                </button>
              </form>

              {/* Saved templates list */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Your Saved Campaign Messages:</span>
                
                {customTemplates.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic py-2 text-center">No custom messages saved yet. Add your first template above.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {customTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setPromoMessage(tpl.text);
                          addLog(`Loaded saved message: ${tpl.label}`);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl cursor-pointer flex items-start justify-between gap-2 text-left transition-colors"
                      >
                        <div className="truncate pr-1">
                          <span className="text-xs font-bold text-indigo-950 block truncate">{tpl.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate leading-relaxed mt-0.5">{tpl.text}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 4: CAMPAIGN WRITER COMPOSER */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600 animate-pulse" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Campaign Message Copy</h2>
            </div>
            <button
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:underline"
            >
              {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copiedText ? 'Copied' : 'Copy Text'}
            </button>
          </div>

          {/* Quick-select chips from custom templates */}
          {customTemplates.length > 0 && (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Quick Load Template:</label>
              <div className="flex flex-wrap gap-1">
                {customTemplates.slice(0, 4).map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => { setPromoMessage(tpl.text); addLog(`Loaded template: ${tpl.label}`); }}
                    className="px-2 py-1 bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-100/40 text-[9px] font-bold text-indigo-700 rounded-lg transition-all cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Message input box */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Promo Copy Box:</label>
            <textarea
              value={promoMessage}
              onChange={(e) => setPromoMessage(e.target.value)}
              placeholder="Paste or write your promotional message..."
              rows={3}
              className="w-full text-xs p-3 font-semibold border border-slate-200 rounded-xl bg-slate-50/50 leading-relaxed resize-none focus:outline-none"
            />
            <div className="text-[8px] text-slate-400 font-bold text-right">
              {promoMessage.length} characters • ~{Math.ceil(promoMessage.length / 160)} SMS Parts
            </div>
          </div>

          {/* Active target feedback preview */}
          {selectedContact ? (
            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full pointer-events-none" />
              <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest block">ACTIVE PROMO TARGET:</span>
              <div className="flex flex-col gap-0.5 text-xs font-black text-slate-800 font-mono">
                {selectedContact.phoneNumber && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-500" />
                    {selectedContact.phoneNumber}
                  </span>
                )}
                {selectedContact.email && (
                  <span className="flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-indigo-500" />
                    {selectedContact.email}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Configure a target contact below or click Generate.</span>
            </div>
          )}

          {/* Action on-click campaign trigger buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleSendWhatsApp}
              disabled={!selectedContact || !selectedContact.phoneNumber}
              className={`flex items-center justify-center gap-1.5 text-xs font-extrabold py-3.5 rounded-xl transition-all cursor-pointer shadow-md ${
                selectedContact && selectedContact.phoneNumber
                  ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Send WhatsApp</span>
            </button>

            <button
              onClick={handleSendEmail}
              disabled={!selectedContact || !selectedContact.email}
              className={`flex items-center justify-center gap-1.5 text-xs font-extrabold py-3.5 rounded-xl transition-all cursor-pointer shadow-md ${
                selectedContact && selectedContact.email
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Send Email</span>
            </button>
          </div>
        </section>

        {/* SECTION 5: ACTIVE LEADS SYNC-LIST */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3 flex flex-col max-h-72">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Active Dialer Lead-Sync ({filteredActiveContacts.length})
              </h2>
            </div>
          </div>

          <div className="relative shrink-0">
            <Search className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search active leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none"
            />
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 space-y-1 mt-1 pr-0.5">
            {filteredActiveContacts.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-6">No active leads found.</p>
            ) : (
              filteredActiveContacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id || 
                  (selectedContact?.phoneNumber === contact.phoneNumber && selectedContact?.email === contact.email && contact.phoneNumber !== '');
                return (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
                      isSelected 
                        ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-300' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-900 truncate font-mono">
                          {contact.phoneNumber || contact.email}
                        </span>
                        {isSelected && (
                          <span className="text-[8px] font-extrabold bg-indigo-600 text-white px-1.5 py-0.2 rounded-full uppercase">Target</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono font-semibold truncate flex flex-col">
                        {contact.phoneNumber && contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5 stroke-slate-400" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToRecycleBin(contact.id, contact.phoneNumber || contact.email);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Move to Recycle Bin"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* SECTION 6: RECYCLE BIN & RECOVERY ARCHIVE (ACCORDION) */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => setShowRecycleBin(!showRecycleBin)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between transition-colors cursor-pointer text-left font-sans"
          >
            <div className="flex items-center gap-2">
              <Trash className="w-4 h-4 text-rose-500" />
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  ♻️ Recycle Bin Recovery Archive
                </h3>
                <p className="text-[9px] text-slate-400 font-bold">
                  Restore recycled items or permanently erase ({recycledContacts.length})
                </p>
              </div>
            </div>
            {showRecycleBin ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showRecycleBin && (
            <div className="p-4 border-t border-slate-100 bg-white space-y-2.5">
              <p className="text-[10px] text-slate-400 leading-normal">
                If there is any mistake or deletion by accident, click <strong className="text-indigo-600">Restore</strong> to re-enter the contact directly back to your active list.
              </p>

              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                {recycledContacts.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-6">Recycle bin is empty. Feel safe deleted leads are secured here.</p>
                ) : (
                  recycledContacts.map((contact) => (
                    <div key={contact.id} className="p-2 bg-rose-50/30 border border-rose-100/50 rounded-xl flex items-center justify-between gap-2 text-left">
                      <div className="truncate space-y-0.5">
                        <span className="text-xs font-mono font-black text-slate-900 truncate block">
                          {contact.phoneNumber || contact.email}
                        </span>
                        {contact.phoneNumber && contact.email && (
                          <span className="text-[9px] text-slate-500 font-mono font-bold block truncate">
                            {contact.email}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleRestoreFromRecycleBin(contact.id, contact.phoneNumber || contact.email)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Restore back to Active"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(contact.id, contact.phoneNumber || contact.email)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Mobile Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-[10px] text-slate-400 shrink-0">
        <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-1">
          <p className="font-bold text-slate-600">© 2026 Promotion System</p>
        </div>
      </footer>

    </div>
  );
}
