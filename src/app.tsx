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
  FileText,
  Eye,
  EyeOff,
  Menu,
  X,
  Award,
  Archive,
  Briefcase,
  LayoutDashboard,
  Edit2,
  MessageCircle
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
  onSnapshot,
  where
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
  status?: 'active' | 'recycled';
}

interface ClientDocument {
  id: string;
  platform: string; // বাজি, সিএক্স, জিৎবাজ, বাবু 88, নগদ ৮৮, কৃকিয়া, আদার্স
  username: string;
  password?: string;
  email?: string;
  phoneNumber?: string;
  dob?: string;
  fullName?: string;
  whatsappNumber?: string;
  createdAt: string;
}

export default function App() {
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Contacts & Custom Templates state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customTemplates, setCustomTemplates] = useState<PromoTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // View navigation states
  const [currentView, setCurrentView] = useState<'dashboard' | 'active-leads' | 'recycle-bin' | 'saved-documents'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Client/Customer Documents state
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  
  // New Client Document form states
  const [docPlatform, setDocPlatform] = useState('Baji');
  const [docUsername, setDocUsername] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhoneNumber, setDocPhoneNumber] = useState('');
  const [docDob, setDocDob] = useState('');
  const [docFullName, setDocFullName] = useState('');
  const [docWhatsappNumber, setDocWhatsappNumber] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [showDocForm, setShowDocForm] = useState(false);

  // Input states
  const [bulkPhoneInput, setBulkPhoneInput] = useState('');
  const [bulkEmailInput, setBulkEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template creation and editing states
  const [newTemplateLabel, setNewTemplateLabel] = useState('');
  const [newTemplateText, setNewTemplateText] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Selected promotion target and composed message
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [promoMessage, setPromoMessage] = useState('Write or select your custom saved campaign message here.');
  const [copiedText, setCopiedText] = useState(false);

  // Collapsible accordion triggers
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showHomepageDocs, setShowHomepageDocs] = useState(false);
  const [recycleTab, setRecycleTab] = useState<'phones' | 'emails' | 'templates'>('phones');
  const [leadsTab, setLeadsTab] = useState<'phones' | 'emails'>('phones');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null);

  // Terminal / Logs states
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({
    whatsappSentCount: 0,
    emailSentCount: 0,
    telegramSentCount: 0,
    imoSentCount: 0,
    smsSentCount: 0
  });

  // Global blur loading and custom notification states
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const noticeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper to trigger custom visual notification for 5-7 seconds (using 6000ms)
  const showNotice = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setNotification({ message, type });
    const timer = setTimeout(() => {
      setNotification(null);
      noticeTimerRef.current = null;
    }, 6000); // 6 seconds for perfect readability
    noticeTimerRef.current = timer;
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
    const cacheKey = `tech_contacts_v3_${user.uid}`;
    if (!db) {
      addLog("Firestore not found. Falling back to local device storage.");
      const cached = localStorage.getItem(cacheKey);
      if (cached) setContacts(JSON.parse(cached));
      return;
    }

    addLog("Binding real-time Firestore synchronization on 'contacts'...");
    const q = query(collection(db, 'contacts'), where('userId', '==', user.uid));
    
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
      // Sort in memory to avoid index requirements
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setContacts(list);
      localStorage.setItem(cacheKey, JSON.stringify(list));
      addLog(`Synchronized ${list.length} dial targets successfully.`);
    }, (error) => {
      addLog(`Firestore sync error: ${error.message}`);
      const cached = localStorage.getItem(cacheKey);
      if (cached) setContacts(JSON.parse(cached));
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch custom message templates from Firestore
  useEffect(() => {
    if (!user) return;
    const cacheKey = `tech_templates_v3_${user.uid}`;
    if (!db) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) setCustomTemplates(JSON.parse(cached));
      return;
    }

    addLog("Fetching custom saved messages from Firestore...");
    const q = query(collection(db, 'promo_templates'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PromoTemplate[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          label: data.label || '',
          text: data.text || '',
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || 'active'
        });
      });
      // Sort in memory
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCustomTemplates(list);
      localStorage.setItem(cacheKey, JSON.stringify(list));
      
      // Load first custom template as default if user hasn't written anything
      if (list.length > 0 && promoMessage === 'Write or select your custom saved campaign message here.') {
        setPromoMessage(list[0].text);
      }
    }, (error) => {
      addLog(`Templates sync error: ${error.message}`);
      const cached = localStorage.getItem(cacheKey);
      if (cached) setCustomTemplates(JSON.parse(cached));
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch saved customer documents from Firestore
  useEffect(() => {
    if (!user) return;
    const cacheKey = `tech_client_docs_v3_${user.uid}`;
    if (!db) {
      addLog("Firestore not found. Loading cached user documents locally.");
      const cached = localStorage.getItem(cacheKey);
      if (cached) setClientDocuments(JSON.parse(cached));
      return;
    }

    addLog("Binding real-time Firestore synchronization on 'client_documents'...");
    const q = query(collection(db, 'client_documents'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ClientDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          platform: data.platform || 'বাজি',
          username: data.username || '',
          password: data.password || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          dob: data.dob || '',
          fullName: data.fullName || '',
          whatsappNumber: data.whatsappNumber || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      // Sort in memory
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setClientDocuments(list);
      localStorage.setItem(cacheKey, JSON.stringify(list));
      addLog(`Synchronized ${list.length} customer documents successfully.`);
    }, (error) => {
      addLog(`Client documents sync error: ${error.message}`);
      const cached = localStorage.getItem(cacheKey);
      if (cached) setClientDocuments(JSON.parse(cached));
    });

    return () => unsubscribe();
  }, [user]);

  // Load stats counters
  useEffect(() => {
    if (!user) return;
    const cacheKey = `tech_stats_v3_${user.uid}`;
    const cachedStats = localStorage.getItem(cacheKey);
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch (e) {}
    } else {
      // Reset stats for new logins
      setStats({
        whatsappSentCount: 0,
        emailSentCount: 0,
        telegramSentCount: 0,
        imoSentCount: 0,
        smsSentCount: 0
      });
    }
  }, [user]);

  const updateStats = (key: 'whatsappSentCount' | 'emailSentCount' | 'telegramSentCount' | 'imoSentCount' | 'smsSentCount') => {
    if (!user) return;
    const cacheKey = `tech_stats_v3_${user.uid}`;
    setStats(prev => {
      const next = { ...prev, [key]: (prev[key] || 0) + 1 };
      localStorage.setItem(cacheKey, JSON.stringify(next));
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
        setLoginError("ভুল ইমেইল বা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় সঠিক তথ্য দিয়ে চেষ্টা করুন।");
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
    return contacts.filter(c => c.status === 'recycled' || c.status === 'deep-recycled');
  }, [contacts]);

  const activeTemplates = useMemo(() => {
    return customTemplates.filter(t => (t.status || 'active') === 'active');
  }, [customTemplates]);

  const recycledTemplates = useMemo(() => {
    return customTemplates.filter(t => t.status === 'recycled');
  }, [customTemplates]);

  const recycledPhones = useMemo(() => {
    return contacts.filter(c => c.status === 'recycled' && !!c.phoneNumber);
  }, [contacts]);

  const deepRecycledPhones = useMemo(() => {
    return contacts.filter(c => c.status === 'deep-recycled' && !!c.phoneNumber);
  }, [contacts]);

  const recycledEmails = useMemo(() => {
    return contacts.filter(c => c.status === 'recycled' && !!c.email);
  }, [contacts]);

  const deepRecycledEmails = useMemo(() => {
    return contacts.filter(c => c.status === 'deep-recycled' && !!c.email);
  }, [contacts]);

  const filteredClientDocuments = useMemo(() => {
    if (!docSearchQuery.trim()) return clientDocuments;
    const q = docSearchQuery.toLowerCase();
    return clientDocuments.filter(d => 
      d.username.toLowerCase().includes(q) ||
      d.platform.toLowerCase().includes(q) ||
      (d.fullName && d.fullName.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q)) ||
      (d.phoneNumber && d.phoneNumber.includes(q)) ||
      (d.whatsappNumber && d.whatsappNumber.includes(q))
    );
  }, [clientDocuments, docSearchQuery]);

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

    // Validate that no email is submitted in the phone box
    const emailInPhones = phones.find(p => p.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p));
    if (emailInPhones) {
      showNotice(`ফোনের বক্সে ইমেইল সাবমিট করা হয়েছে (${emailInPhones})! দয়া করে ফোনের বক্সে শুধুমাত্র ফোন নাম্বার দিন।`, "error");
      addLog(`Validation failed: Email found in Phone box (${emailInPhones})`);
      setIsSubmitting(false);
      setGlobalLoading(false);
      return;
    }

    // Validate that no phone number (or invalid content) is submitted in the email box
    // A standard email must have an @ symbol. If it does not contain '@' or consists of phone chars like digits/plus, it's a mistake.
    const phoneInEmails = emails.find(e => !e.includes('@') || /^\+?[0-9\-() ]+$/.test(e));
    if (phoneInEmails) {
      showNotice(`ইমেইলের বক্সে ফোন নাম্বার সাবমিট করা হয়েছে (${phoneInEmails})! দয়া করে ইমেইলের বক্সে শুধুমাত্র ইমেইল এড্রেস দিন।`, "error");
      addLog(`Validation failed: Phone number/non-email found in Email box (${phoneInEmails})`);
      setIsSubmitting(false);
      setGlobalLoading(false);
      return;
    }

    if (phones.length === 0 && emails.length === 0) {
      alert("Please input at least one phone number or email address.");
      setIsSubmitting(false);
      setGlobalLoading(false);
      return;
    }

    let saveCount = 0;
    let skipCount = 0;
    const duplicatePhones: string[] = [];
    const duplicateEmails: string[] = [];
    const processedPhones = new Set<string>();
    const processedEmails = new Set<string>();

    addLog(`Initiating instant parallelized write...`);

    try {
      const maxLen = Math.max(phones.length, emails.length);
      const savePromises: Promise<any>[] = [];

      for (let i = 0; i < maxLen; i++) {
        const phoneNumber = phones[i] ? formatPhoneNumber(phones[i]) : '';
        const email = emails[i] ? emails[i].trim().toLowerCase() : '';

        // Uniqueness checks
        let isBatchDuplicate = false;
        if (phoneNumber) {
          if (processedPhones.has(phoneNumber)) {
            isBatchDuplicate = true;
            if (!duplicatePhones.includes(phoneNumber)) {
              duplicatePhones.push(phoneNumber);
            }
          } else {
            processedPhones.add(phoneNumber);
          }
        }
        if (email) {
          if (processedEmails.has(email)) {
            isBatchDuplicate = true;
            if (!duplicateEmails.includes(email)) {
              duplicateEmails.push(email);
            }
          } else {
            processedEmails.add(email);
          }
        }

        const existingDuplicatePhone = phoneNumber ? contacts.find(c => c.phoneNumber === phoneNumber) : null;
        const existingDuplicateEmail = email ? contacts.find(c => c.email && c.email.toLowerCase() === email) : null;

        if (existingDuplicatePhone) {
          if (!duplicatePhones.includes(phoneNumber)) {
            duplicatePhones.push(phoneNumber);
          }
        }
        if (existingDuplicateEmail) {
          if (!duplicateEmails.includes(email)) {
            duplicateEmails.push(email);
          }
        }

        if (existingDuplicatePhone || existingDuplicateEmail || isBatchDuplicate) {
          skipCount++;
          continue;
        }

        const record = {
          phoneNumber: phoneNumber,
          email: email,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          userId: user?.uid || ''
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

      if (saveCount === 0) {
        let errMsg = "সাবমিট করা সকল তথ্য ইতিমধ্যেই সার্ভারে সংরক্ষিত আছে!";
        const details: string[] = [];
        if (duplicatePhones.length > 0) {
          details.push(`ফোন: ${duplicatePhones.join(', ')}`);
        }
        if (duplicateEmails.length > 0) {
          details.push(`ইমেইল: ${duplicateEmails.join(', ')}`);
        }
        if (details.length > 0) {
          errMsg += ` (${details.join(' | ')})`;
        }
        showNotice(errMsg, "error");
      } else if (skipCount > 0) {
        let successMsg = `নতুন ${saveCount} টি তথ্য সফলভাবে সেভ হয়েছে!`;
        const details: string[] = [];
        if (duplicatePhones.length > 0) {
          details.push(`ফোন: ${duplicatePhones.join(', ')}`);
        }
        if (duplicateEmails.length > 0) {
          details.push(`ইমেইল: ${duplicateEmails.join(', ')}`);
        }
        if (details.length > 0) {
          successMsg += ` বাদ পড়া ডুপ্লিকেটসমূহ: ${details.join(' | ')}`;
        }
        showNotice(successMsg, "success");
      } else {
        showNotice(`ডাটাবেজে সফলভাবে সেভ করা হয়েছে! (${saveCount} টি নতুন তথ্য সেভ হয়েছে)`, "success");
      }

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

  // 5. SAVING OR UPDATING DYNAMIC MESSAGES TO FIRESTORE
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateLabel.trim() || !newTemplateText.trim()) {
      alert("Please provide both a label name and message content.");
      return;
    }

    setSavingTemplate(true);

    const templateData = {
      label: newTemplateLabel.trim(),
      text: newTemplateText.trim(),
      userId: user?.uid || ''
    };

    try {
      if (editingTemplateId) {
        addLog(`Updating promotional message: "${newTemplateLabel}"...`);
        if (db && !editingTemplateId.startsWith('local-template-')) {
          await updateDoc(doc(db, 'promo_templates', editingTemplateId), templateData);
          addLog(`Template updated securely in Firestore.`);
          showNotice("মেসেজ টেম্পলেটটি সফলভাবে আপডেট করা হয়েছে!", "success");
        } else {
          const updated = customTemplates.map(t => t.id === editingTemplateId ? { ...t, ...templateData } : t);
          setCustomTemplates(updated);
          localStorage.setItem(`tech_templates_v3_${user?.uid}`, JSON.stringify(updated));
          addLog(`Template updated locally.`);
          showNotice("মেসেজ টেম্পলেটটি সফলভাবে আপডেট করা হয়েছে!", "success");
        }
        setEditingTemplateId(null);
      } else {
        addLog(`Saving new promotional message: "${newTemplateLabel}"...`);
        const newTemplate = {
          ...templateData,
          createdAt: new Date().toISOString(),
          status: 'active' as const,
          userId: user?.uid || ''
        };

        if (db) {
          await addDoc(collection(db, 'promo_templates'), newTemplate);
          addLog(`Template saved securely in Firestore.`);
          showNotice("নতুন মেসেজ সফলভাবে সেভ করা হয়েছে!", "success");
        } else {
          const localId = `local-template-${Date.now()}`;
          const updated = [{ id: localId, ...newTemplate }, ...customTemplates];
          setCustomTemplates(updated);
          localStorage.setItem(`tech_templates_v3_${user?.uid}`, JSON.stringify(updated));
          addLog(`Template saved locally.`);
          showNotice("নতুন মেসেজ সফলভাবে সেভ করা হয়েছে!", "success");
        }
        // Auto-load template into composer
        setPromoMessage(newTemplate.text);
      }

      setNewTemplateLabel('');
      setNewTemplateText('');
      setShowTemplateManager(false);
    } catch (err: any) {
      addLog(`Error saving template: ${err.message}`);
      showNotice(`টেম্পলেট সেভ করতে ব্যর্থ হয়েছে: ${err.message}`, "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Start editing a message template
  const handleStartEditTemplate = (tpl: PromoTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTemplateId(tpl.id);
    setNewTemplateLabel(tpl.label);
    setNewTemplateText(tpl.text);
    setShowTemplateManager(true); // Open accordion if it was closed
    addLog(`Editing message template: "${tpl.label}"`);
  };

  // Cancel editing template
  const handleCancelEditTemplate = () => {
    setEditingTemplateId(null);
    setNewTemplateLabel('');
    setNewTemplateText('');
    addLog(`Cancelled template editing.`);
  };

  // Soft-delete (Recycle) message template
  const handleDeleteTemplate = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addLog(`Moving template to Recycle Bin: ${id}...`);
    try {
      if (db && !id.startsWith('local-template-')) {
        await updateDoc(doc(db, 'promo_templates', id), { status: 'recycled' });
        addLog("Template moved to Recycle Bin in Firestore.");
        showNotice("মেসেজটি রিসাইকেল বিনে পাঠানো হয়েছে!", "success");
      } else {
        const updated = customTemplates.map(t => t.id === id ? { ...t, status: 'recycled' as const } : t);
        setCustomTemplates(updated);
        localStorage.setItem(`tech_templates_v3_${user?.uid}`, JSON.stringify(updated));
        addLog("Template moved to Recycle Bin locally.");
        showNotice("মেসেজটি রিসাইকেল বিনে পাঠানো হয়েছে!", "success");
      }
    } catch (err: any) {
      addLog(`Template recycling failed: ${err.message}`);
      showNotice(`রিসাইকেলে পাঠাতে ব্যর্থ হয়েছে: ${err.message}`, "error");
    }
  };

  // Restore template from Recycle Bin
  const handleRestoreTemplate = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addLog(`Restoring template: ${id}...`);
    try {
      if (db && !id.startsWith('local-template-')) {
        await updateDoc(doc(db, 'promo_templates', id), { status: 'active' });
        addLog("Template restored to active list in Firestore.");
        showNotice("মেসেজটি সফলভাবে রিস্টোর করা হয়েছে!", "success");
      } else {
        const updated = customTemplates.map(t => t.id === id ? { ...t, status: 'active' as const } : t);
        setCustomTemplates(updated);
        localStorage.setItem(`tech_templates_v3_${user?.uid}`, JSON.stringify(updated));
        addLog("Template restored locally.");
        showNotice("মেসেজটি সফলভাবে রিস্টোর করা হয়েছে!", "success");
      }
    } catch (err: any) {
      addLog(`Template restore failed: ${err.message}`);
      showNotice(`রিস্টোর করতে ব্যর্থ হয়েছে: ${err.message}`, "error");
    }
  };

  // Permanent Delete template
  const handlePermanentDeleteTemplate = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addLog(`Permanently deleting template: ${id}...`);
    try {
      if (db && !id.startsWith('local-template-')) {
        await deleteDoc(doc(db, 'promo_templates', id));
        addLog("Template permanently deleted from Firestore.");
        showNotice("মেসেজটি চিরতরে মুছে ফেলা হয়েছে!", "success");
      } else {
        const updated = customTemplates.filter(t => t.id !== id);
        setCustomTemplates(updated);
        localStorage.setItem(`tech_templates_v3_${user?.uid}`, JSON.stringify(updated));
        addLog("Template permanently deleted locally.");
        showNotice("মেসেজটি চিরতরে মুছে ফেলা হয়েছে!", "success");
      }
    } catch (err: any) {
      addLog(`Template permanent deletion failed: ${err.message}`);
      showNotice(`চিরতরে মুছতে ব্যর্থ হয়েছে: ${err.message}`, "error");
    }
  };

  // 5.5 CUSTOMER PLATFORM DOCUMENTS CRUD HANDLERS
  const handleSaveClientDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUsername.trim()) {
      alert("Username field is required.");
      return;
    }

    setSavingDoc(true);
    
    const docData = {
      platform: docPlatform,
      username: docUsername.trim(),
      password: docPassword.trim(),
      email: docEmail.trim(),
      phoneNumber: docPhoneNumber.trim(),
      dob: docDob.trim(),
      fullName: docFullName.trim(),
      whatsappNumber: docWhatsappNumber.trim(),
      userId: user?.uid || ''
    };

    try {
      if (editingDocId) {
        addLog(`Updating customer document: ${docPlatform} - ${docUsername}...`);
        if (db && !editingDocId.startsWith('local-doc-')) {
          await updateDoc(doc(db, 'client_documents', editingDocId), docData);
          addLog("Customer document updated securely in Firestore.");
          showNotice("Document updated successfully!", "success");
        } else {
          const updated = clientDocuments.map(d => d.id === editingDocId ? { ...d, ...docData } : d);
          setClientDocuments(updated);
          localStorage.setItem(`tech_client_docs_v3_${user?.uid}`, JSON.stringify(updated));
          addLog("Customer document updated locally.");
          showNotice("Document updated successfully!", "success");
        }
        setEditingDocId(null);
      } else {
        addLog(`Creating new customer document for platform: ${docPlatform}...`);
        const newDoc = {
          ...docData,
          createdAt: new Date().toISOString(),
          userId: user?.uid || ''
        };

        if (db) {
          await addDoc(collection(db, 'client_documents'), newDoc);
          addLog("Customer document saved securely in Firestore.");
          showNotice("New document saved successfully!", "success");
        } else {
          const localId = `local-doc-${Date.now()}`;
          const updated = [{ id: localId, ...newDoc }, ...clientDocuments];
          setClientDocuments(updated);
          localStorage.setItem(`tech_client_docs_v3_${user?.uid}`, JSON.stringify(updated));
          addLog("Customer document saved locally.");
          showNotice("New document saved successfully!", "success");
        }
      }

      // Clear form and close panel
      setDocUsername('');
      setDocPassword('');
      setDocEmail('');
      setDocPhoneNumber('');
      setDocDob('');
      setDocFullName('');
      setDocWhatsappNumber('');
      setShowDocForm(false);
    } catch (err: any) {
      addLog(`Error saving document: ${err.message}`);
      showNotice(`Failed to save document: ${err.message}`, "error");
    } finally {
      setSavingDoc(false);
    }
  };

  const handleStartEditClientDocument = (docItem: ClientDocument) => {
    setEditingDocId(docItem.id);
    setDocPlatform(docItem.platform);
    setDocUsername(docItem.username);
    setDocPassword(docItem.password || '');
    setDocEmail(docItem.email || '');
    setDocPhoneNumber(docItem.phoneNumber || '');
    setDocDob(docItem.dob || '');
    setDocFullName(docItem.fullName || '');
    setDocWhatsappNumber(docItem.whatsappNumber || '');
    setShowDocForm(true);
    addLog(`Editing customer document: ${docItem.platform} - ${docItem.username}`);
  };

  const handleCancelEditClientDocument = () => {
    setEditingDocId(null);
    setDocPlatform('Baji');
    setDocUsername('');
    setDocPassword('');
    setDocEmail('');
    setDocPhoneNumber('');
    setDocDob('');
    setDocFullName('');
    setDocWhatsappNumber('');
    setShowDocForm(false);
    addLog("Cancelled customer document editing.");
  };

  const handleDeleteClientDocument = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this document? This cannot be undone.")) {
      return;
    }
    
    addLog(`Permanently deleting customer document: ${id}...`);
    try {
      if (db && !id.startsWith('local-doc-')) {
        await deleteDoc(doc(db, 'client_documents', id));
        addLog("Customer document deleted from Firestore.");
        showNotice("Document deleted successfully!", "success");
      } else {
        const updated = clientDocuments.filter(d => d.id !== id);
        setClientDocuments(updated);
        localStorage.setItem(`tech_client_docs_v3_${user?.uid}`, JSON.stringify(updated));
        addLog("Customer document deleted locally.");
        showNotice("Document deleted successfully!", "success");
      }
    } catch (err: any) {
      addLog(`Failed to delete document: ${err.message}`);
      showNotice(`Failed to delete: ${err.message}`, "error");
    }
  };

  // 6. GENERATE TARGET TRIGGERS
  const handleGeneratePhone = () => {
    const phoneContacts = activeContacts.filter(c => !!c.phoneNumber);
    if (phoneContacts.length === 0) {
      alert("No active phone numbers found in the database yet.");
      return;
    }

    setLoadingMessage("Generating Phone Number...");
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
      showNotice("Phone number generated successfully!", "success");
    }, 800);
  };

  const handleGenerateEmail = () => {
    const emailContacts = activeContacts.filter(c => !!c.email);
    if (emailContacts.length === 0) {
      alert("No active emails found in the database yet.");
      return;
    }

    setLoadingMessage("Generating Email Address...");
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
      showNotice("Email generated successfully!", "success");
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
        showNotice("Moved to Recycle Bin!", "info");
      } else {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, status: 'recycled' } : c));
        addLog(`Recycled locally: ${detail}`);
        showNotice("Moved to Recycle Bin!", "info");
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
        showNotice("Restored successfully!", "success");
      } else {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c));
        addLog(`Restored locally: ${detail}`);
        showNotice("Restored successfully!", "success");
      }
    } catch (err: any) {
      addLog(`Restore failed: ${err.message}`);
    }
  };

  const handlePermanentDelete = async (id: string, detail: string) => {
    addLog(`Permanently deleting contact from server: ${detail}...`);
    try {
      if (db && !id.startsWith('local-')) {
        await deleteDoc(doc(db, 'contacts', id));
        setContacts(prev => prev.filter(c => c.id !== id));
        addLog(`Erased from server: ${detail}`);
        showNotice("Permanently deleted from server!", "success");
      } else {
        setContacts(prev => prev.filter(c => c.id !== id));
        addLog(`Erased local contact: ${detail}`);
        showNotice("Permanently deleted successfully!", "success");
      }
    } catch (err: any) {
      addLog(`Failed to permanently delete contact: ${err.message}`);
      showNotice(`Failed to delete: ${err.message}`, "error");
    }
  };

  // 8. ON-CLICK PROMOTION LAUNCHERS
  const formatBdInternationalPhone = (phone: string): string => {
    let digits = phone.replace(/[^\d]/g, ''); // keep only digits
    if (!digits) return '';

    // If it starts with 00880, replace with 880
    if (digits.startsWith('00880')) {
      digits = '880' + digits.slice(5);
    }
    // If it starts with 880, it's correct
    else if (digits.startsWith('880') && digits.length === 13) {
      // already perfect
    }
    // If it starts with 01 and has 11 digits (e.g., 01712345678)
    else if (digits.startsWith('01') && digits.length === 11) {
      digits = '88' + digits;
    }
    // If it starts with 1 and has 10 digits (e.g., 1712345678)
    else if (digits.startsWith('1') && digits.length === 10) {
      digits = '880' + digits;
    }
    return digits;
  };

  const handleSendWhatsApp = () => {
    if (!selectedContact || !selectedContact.phoneNumber) {
      alert("No active phone number is assigned to target.");
      return;
    }

    const cleanNum = formatBdInternationalPhone(selectedContact.phoneNumber);
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

  const handleSendTelegram = () => {
    if (!selectedContact || !selectedContact.phoneNumber) {
      alert("No active phone number is assigned to target.");
      return;
    }

    const cleanNum = formatBdInternationalPhone(selectedContact.phoneNumber);
    const encodedMessage = encodeURIComponent(promoMessage);
    const telegramUrl = `https://t.me/share/url?url=https://t.me/+${cleanNum}&text=${encodedMessage}`;

    addLog(`Opening Telegram secure promotional channel to +${cleanNum}...`);
    updateStats('telegramSentCount');
    window.open(telegramUrl, '_blank');
  };

  const handleSendImo = () => {
    if (!selectedContact || !selectedContact.phoneNumber) {
      alert("No active phone number is assigned to target.");
      return;
    }

    const cleanNum = formatBdInternationalPhone(selectedContact.phoneNumber);
    navigator.clipboard.writeText(promoMessage);

    addLog(`Copying message template for IMO. Launching IMO protocol deep link for +${cleanNum}...`);
    updateStats('imoSentCount');

    // Attempting deep link opening
    const imoUrl = `imo://chat?phone=${cleanNum}`;
    showNotice("IMO message copied to clipboard! Please open IMO app to paste.", "info");
    window.open(imoUrl, '_blank');
  };

  const handleSendSMS = () => {
    if (!selectedContact || !selectedContact.phoneNumber) {
      alert("No active phone number is assigned to target.");
      return;
    }

    const cleanNum = formatBdInternationalPhone(selectedContact.phoneNumber);
    const encodedMessage = encodeURIComponent(promoMessage);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = `sms:${cleanNum}${isIOS ? '&' : '?'}body=${encodedMessage}`;

    addLog(`Opening standard device SMS app to +${cleanNum}...`);
    updateStats('smsSentCount');
    window.open(smsUrl, '_blank');
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

  const filteredActivePhones = useMemo(() => {
    const phones = activeContacts.filter(c => !!c.phoneNumber);
    if (!searchQuery.trim()) return phones;
    return phones.filter(c => c.phoneNumber.includes(searchQuery));
  }, [activeContacts, searchQuery]);

  const filteredActiveEmails = useMemo(() => {
    const emails = activeContacts.filter(c => !!c.email);
    if (!searchQuery.trim()) return emails;
    return emails.filter(c => c.email.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeContacts, searchQuery]);

  // Loading Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
        <style>{`
          @keyframes pulseGlow {
            0%, 100% {
              transform: scale(0.98);
              opacity: 0.15;
              filter: blur(40px);
            }
            50% {
              transform: scale(1.05);
              opacity: 0.35;
              filter: blur(60px);
            }
          }
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
          @keyframes progressPulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .glow-bg-1 {
            background: radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(0,0,0,0) 70%);
            animation: pulseGlow 6s infinite alternate ease-in-out;
          }
          .glow-bg-2 {
            background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(0,0,0,0) 70%);
            animation: pulseGlow 8s infinite alternate-reverse ease-in-out;
          }
          .glow-bg-3 {
            background: radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(0,0,0,0) 70%);
            animation: pulseGlow 5s infinite alternate ease-in-out;
          }
        `}</style>
        
        {/* Abstract Glowing Nebula Backdrops */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] glow-bg-1 rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] glow-bg-2 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] glow-bg-3 rounded-full pointer-events-none" />

        {/* Scanline overlay for high-tech CRT monitor aesthetic */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_97%,rgba(99,102,241,0.04)_97%)] bg-[size:100%_12px] pointer-events-none" />
        
        {/* Outer Tech Shell Card */}
        <div className="relative z-10 flex flex-col items-center justify-center p-12 bg-slate-900/45 backdrop-blur-xl border border-slate-800/80 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm w-full text-center">
          
          {/* Animated Spinner Structure */}
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
            {/* Outer dotted tracking orbit */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/10 animate-spin [animation-duration:12s]" />
            
            {/* Spinning ring 1 */}
            <div className="absolute inset-1 rounded-full border-t-4 border-l-4 border-indigo-500 border-r-transparent border-b-transparent animate-spin [animation-duration:1.2s]" />
            
            {/* Spinning ring 2 (reverse) */}
            <div className="absolute inset-3 rounded-full border-b-4 border-r-4 border-emerald-500 border-t-transparent border-l-transparent animate-spin [animation-direction:reverse] [animation-duration:1.6s]" />
            
            {/* Spinning ring 3 */}
            <div className="absolute inset-6 rounded-full border-t-2 border-violet-500 border-b-transparent border-l-transparent border-r-transparent animate-spin [animation-duration:0.8s]" />
            
            {/* Glowing Center core with pulsing database or key icon */}
            <div className="absolute inset-9 rounded-full bg-slate-950/95 border border-slate-800 flex items-center justify-center shadow-[inset_0_0_15px_rgba(99,102,241,0.3)]">
              <Database className="w-7 h-7 text-indigo-400 animate-pulse" />
            </div>

            {/* Orbiting glowing particle/dot */}
            <div className="absolute inset-0 animate-spin [animation-duration:2.5s]">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10b981] absolute -top-1 left-1/2 -translate-x-1/2" />
            </div>
          </div>

          {/* Texts */}
          <div className="space-y-3">
            <h1 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>TECH PROMOTION</span>
            </h1>
            <div className="h-[2px] w-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 mx-auto rounded-full" />
            <p className="text-[10px] font-black tracking-[0.25em] text-indigo-400/95 uppercase animate-pulse">
              System Initialization
            </p>
          </div>

          {/* Micro-activity bar */}
          <div className="w-40 h-[4px] bg-slate-950 rounded-full overflow-hidden mt-6 border border-slate-800">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>

          <p className="text-[9px] font-mono text-slate-500 mt-4 tracking-widest uppercase">
            Securing campaign workspace...
          </p>
        </div>
      </div>
    );
  }

  // 1. MOBILE LOGIN VIEW
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center sm:py-6 overflow-x-hidden">
        <div id="login-layout" className="w-full max-w-md min-h-screen sm:min-h-[92vh] sm:rounded-3xl sm:border sm:border-slate-800/80 sm:shadow-2xl bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
              {notification.type === 'success' ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
              ) : notification.type === 'error' ? (
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
              )}
              
              <div className="space-y-1.5 w-full">
                <p className={`text-sm font-black tracking-wider uppercase ${
                  notification.type === 'success' ? 'text-emerald-400' :
                  notification.type === 'error' ? 'text-rose-400' : 'text-indigo-400'
                }`}>
                  {notification.type === 'success' ? 'সফল হয়েছে' :
                   notification.type === 'error' ? 'ব্যর্থ হয়েছে' : 'তথ্য নোটিফিকেশন'}
                </p>
                <p className="text-xs text-slate-300 font-bold leading-relaxed px-2 break-words">{notification.message}</p>
              </div>

              <button
                type="button"
                onClick={() => setNotification(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-700/50"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        )}

        {/* Beautiful glassmorphic background-blur loading screen with rotating logo */}
        {globalLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-slate-950/65 transition-all duration-300">
            <div className="relative flex flex-col items-center p-8 bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl max-w-xs w-[85%] text-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                <div className="absolute inset-4 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/50">
                  <Database className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white tracking-wide uppercase">Campaign Action</h4>
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
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs bg-slate-950 text-slate-200 pl-9 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
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

        </div>
      </div>
    </div>
    );
  }

  // 2. DASHBOARD VIEW (FULLY MOBILE OPTIMIZED)
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center sm:py-6 overflow-x-hidden w-full">
      <div id="dashboard-layout" className="w-full max-w-md min-h-screen sm:min-h-[92vh] sm:rounded-3xl sm:border sm:border-slate-200/80 sm:shadow-2xl bg-slate-50 text-slate-800 flex flex-col font-sans select-none pb-8 relative overflow-hidden">
        
        {/* Custom visual notification toast */}
        {notification && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
              {notification.type === 'success' ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
              ) : notification.type === 'error' ? (
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
              )}
              
              <div className="space-y-1.5 w-full">
                <p className={`text-sm font-black tracking-wider uppercase ${
                  notification.type === 'success' ? 'text-emerald-400' :
                  notification.type === 'error' ? 'text-rose-400' : 'text-indigo-400'
                }`}>
                  {notification.type === 'success' ? 'সফল হয়েছে' :
                   notification.type === 'error' ? 'ব্যর্থ হয়েছে' : 'তথ্য নোটিফিকেশন'}
                </p>
                <p className="text-xs text-slate-300 font-bold leading-relaxed px-2 break-words">{notification.message}</p>
              </div>

              <button
                type="button"
                onClick={() => setNotification(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-700/50"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        )}

        {/* Beautiful glassmorphic background-blur loading screen with rotating logo */}
        {globalLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-slate-950/65 transition-all duration-300">
            <div className="relative flex flex-col items-center p-8 bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl max-w-xs w-[85%] text-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                <div className="absolute inset-4 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/50">
                  <Database className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white tracking-wide uppercase">Campaign Action</h4>
                <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase animate-pulse">
                  {loadingMessage || "Processing..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Top Navigation Header */}
        <header className="sticky top-0 z-40 bg-white border-b-2 animated-header-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer focus:outline-none"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-black tracking-tight uppercase shimmer-text">Tech Promotion</h1>
              <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-0.5">ADMIN DIALS LABS</p>
            </div>
          </div>
        </header>

        {/* Slide-out Menu Drawer Overlay */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsMenuOpen(false)}
            />

          {/* Drawer Container */}
          <div className="relative flex flex-col w-72 max-w-[80vw] h-full bg-white shadow-2xl z-10 p-5 transform transition-transform duration-300 ease-out">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-sm font-black text-indigo-950 tracking-tight uppercase">Tech Promotion</h3>
                <p className="text-[9px] font-bold text-indigo-500 tracking-wider">Navigation Hub</p>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Links */}
            <div className="flex-1 space-y-1.5">
              <button
                onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-left ${
                  currentView === 'dashboard' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Campaign Dashboard</span>
              </button>

              <button
                onClick={() => { setCurrentView('active-leads'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-left ${
                  currentView === 'active-leads' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Active Dialer Lead-Sync</span>
              </button>

              <button
                onClick={() => { setCurrentView('recycle-bin'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-left ${
                  currentView === 'recycle-bin' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span>Recycle Bin Recovery Archived</span>
              </button>

              <button
                onClick={() => { setCurrentView('saved-documents'); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-left ${
                  currentView === 'saved-documents' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 text-amber-500" />
                <span>📁 কাস্টমার ডকুমেন্ট সেভ ({clientDocuments.length})</span>
              </button>
            </div>

            {/* Bottom Session Info */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Current Session</p>
                <p className="text-[10px] font-bold text-slate-700 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Safe Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* METRIC CARD STATS FOR ACTIVE PHONES, EMAILS, RECYCLE BIN, & CUSTOMER DOCUMENTS */}
      <section className="bg-slate-900 text-white px-2 py-2 shrink-0 border-b border-slate-800">
        {/* Exactly 4 compact boxes aligned tightly side-by-side */}
        <div className="grid grid-cols-4 gap-1">
          {/* Box 1: Active Phones */}
          <div className="bg-slate-950/40 border border-indigo-500/10 rounded-lg p-1.5 text-center flex flex-col justify-center shadow-inner hover:border-indigo-500/30 transition-colors">
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tight block truncate">Active Phones</span>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <Phone className="w-3 h-3 text-indigo-400" />
              <span className="text-xs font-black text-white">{activePhoneCount}</span>
            </div>
          </div>

          {/* Box 2: Active Emails */}
          <div className="bg-slate-950/40 border border-emerald-500/10 rounded-lg p-1.5 text-center flex flex-col justify-center shadow-inner hover:border-emerald-500/30 transition-colors">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tight block truncate">Active Emails</span>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <Mail className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-black text-white">{activeEmailCount}</span>
            </div>
          </div>

          {/* Box 3: Recycle Bin */}
          <button 
            onClick={() => { setCurrentView('recycle-bin'); }}
            className="bg-slate-950/40 border border-rose-500/10 rounded-lg p-1.5 text-center flex flex-col justify-center shadow-inner hover:border-rose-500/30 transition-colors cursor-pointer focus:outline-none"
          >
            <span className="text-[8px] font-black text-rose-400 uppercase tracking-tight block text-center truncate">Recycle Bin</span>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span className="text-xs font-black text-white">
                {recycledPhones.length + deepRecycledPhones.length + recycledEmails.length + deepRecycledEmails.length}
              </span>
            </div>
          </button>

          {/* Box 4: Saved Docs */}
          <button 
            onClick={() => setCurrentView('saved-documents')}
            className="bg-slate-950/50 border border-amber-500/30 rounded-lg p-1.5 text-center flex flex-col justify-center shadow-inner hover:border-amber-500/50 hover:bg-slate-950/70 transition-all cursor-pointer focus:outline-none"
          >
            <span className="text-[8px] font-black text-amber-400 uppercase tracking-tight block truncate">Saved Docs</span>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <FileText className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-black text-white">{clientDocuments.length}</span>
            </div>
          </button>
        </div>
      </section>

      {/* Main Column scroll area - tightly set space-y-2 for very close vertical spacing */}
      <main className="flex-1 overflow-y-auto p-2.5 space-y-2 max-w-md mx-auto w-full">
        {currentView === 'dashboard' && (
          <>
        {/* SECTION 1: INSTANT ADDS PANEL FOR PHONES AND EMAILS */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <Database className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Add to Database</h2>
          </div>

          <form onSubmit={handleBulkAdd} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Phone number input on the left */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Phone Number
                </label>
                <textarea
                  value={bulkPhoneInput}
                  onChange={(e) => setBulkPhoneInput(e.target.value)}
                  placeholder="Enter phone number(s)..."
                  rows={4}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50/50 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Email input on the right */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <textarea
                  value={bulkEmailInput}
                  onChange={(e) => setBulkEmailInput(e.target.value)}
                  placeholder="Enter email address(es)..."
                  rows={4}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50/50 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer"
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
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <Shuffle className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Generate Target</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGeneratePhone}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-2 rounded-lg transition-all shadow-sm cursor-pointer text-center"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Generate Phone</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateEmail}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-2 rounded-lg transition-all shadow-sm cursor-pointer text-center"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Generate Email</span>
            </button>
          </div>
        </section>

        {/* SECTION 3: SAVED MESSAGE TEMPLATE CREATOR (ACCORDION MENU) */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => setShowTemplateManager(!showTemplateManager)}
            className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between transition-colors cursor-pointer text-left font-sans"
          >
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  💾 Custom Saved Messages ({activeTemplates.length})
                </h3>
                <p className="text-[9px] text-slate-400 font-bold">
                  Create, save, edit and select promotion texts dynamically
                </p>
              </div>
            </div>
            {showTemplateManager ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showTemplateManager && (
            <div className="p-3 border-t border-slate-100 bg-white space-y-3">
              <form onSubmit={handleSaveTemplate} className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-indigo-950 uppercase tracking-wider block">
                    {editingTemplateId ? '📝 Edit Saved Template:' : '➕ Save New Template:'}
                  </span>
                  {editingTemplateId && (
                    <button
                      type="button"
                      onClick={handleCancelEditTemplate}
                      className="text-[9px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Template Label (e.g. Eid Discount)"
                    value={newTemplateLabel}
                    onChange={(e) => setNewTemplateLabel(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <textarea
                    required
                    placeholder="Write your promotional campaign message body copy here..."
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg leading-relaxed focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingTemplate}
                  className={`w-full inline-flex items-center justify-center gap-1 text-white text-[10px] font-extrabold py-2 rounded-lg transition-colors cursor-pointer ${
                    editingTemplateId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {savingTemplate ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>{editingTemplateId ? 'Update Saved Template' : 'Save Template to Database'}</span>
                </button>
              </form>

              {/* Saved templates list */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Your Saved Campaign Messages:</span>
                
                {activeTemplates.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic py-2 text-center">No custom messages saved yet. Add your first template above.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {activeTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setPromoMessage(tpl.text);
                          addLog(`Loaded saved message: ${tpl.label}`);
                        }}
                        className={`p-2.5 border rounded-xl cursor-pointer flex items-start justify-between gap-2 text-left transition-colors ${
                          editingTemplateId === tpl.id 
                            ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-200/50' 
                            : 'bg-slate-50 hover:bg-indigo-50/50 border-slate-200'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <span className="text-xs font-bold text-indigo-950 block truncate">{tpl.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate leading-relaxed mt-0.5">{tpl.text}</span>
                        </div>
                        {confirmDeleteTemplateId === tpl.id ? (
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(tpl.id);
                                setConfirmDeleteTemplateId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer"
                            >
                              Sure?
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteTemplateId(null);
                              }}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-bold cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                handleStartEditTemplate(tpl, e);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-all cursor-pointer"
                              title="Edit Template"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                setConfirmDeleteTemplateId(tpl.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all cursor-pointer"
                              title="Delete Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 4: CAMPAIGN WRITER COMPOSER */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-2.5 space-y-2">
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
          {activeTemplates.length > 0 && (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Quick Load Template:</label>
              <div className="flex flex-wrap gap-1">
                {activeTemplates.slice(0, 4).map((tpl) => (
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
              className="w-full text-xs p-2.5 font-semibold border border-slate-200 rounded-lg bg-slate-50/50 leading-relaxed resize-none focus:outline-none"
            />
            <div className="text-[8px] text-slate-400 font-bold text-right">
              {promoMessage.length} characters • ~{Math.ceil(promoMessage.length / 160)} SMS Parts
            </div>
          </div>

          {/* Active target feedback preview */}
          {selectedContact ? (
            <div className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-1 text-left relative overflow-hidden">
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
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Configure a target contact below or click Generate.</span>
            </div>
          )}

          {/* Action on-click campaign trigger buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleSendWhatsApp}
              disabled={!selectedContact || !selectedContact.phoneNumber}
              className={`flex items-center justify-center gap-1.5 text-xs font-extrabold py-2.5 rounded-lg transition-all cursor-pointer shadow-md ${
                selectedContact && selectedContact.phoneNumber
                  ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white ring-1 ring-emerald-400/50 shadow shadow-emerald-500/20'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
              }`}
              title="WhatsApp Promotion"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Send WhatsApp</span>
            </button>

            <button
              onClick={handleSendTelegram}
              disabled={!selectedContact || !selectedContact.phoneNumber}
              className={`flex items-center justify-center gap-1.5 text-xs font-extrabold py-2.5 rounded-lg transition-all cursor-pointer shadow-md ${
                selectedContact && selectedContact.phoneNumber
                  ? 'bg-sky-500 hover:bg-sky-600 active:scale-95 text-white ring-1 ring-sky-400/50 shadow shadow-sky-500/20'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
              }`}
              title="Telegram Promotion"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Send Telegram</span>
            </button>

            <button
              onClick={handleSendImo}
              disabled={!selectedContact || !selectedContact.phoneNumber}
              className={`flex items-center justify-center gap-1.5 text-xs font-extrabold py-2.5 rounded-lg transition-all cursor-pointer shadow-md ${
                selectedContact && selectedContact.phoneNumber
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white ring-1 ring-blue-400/50 shadow shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
              }`}
              title="Imo Promotion"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Send IMO</span>
            </button>

            <button
              onClick={handleSendSMS}
              disabled={!selectedContact || !selectedContact.phoneNumber}
              className={`flex items-center justify-center gap-1.5 text-xs font-extrabold py-2.5 rounded-lg transition-all cursor-pointer shadow-md ${
                selectedContact && selectedContact.phoneNumber
                  ? 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white ring-1 ring-amber-400/50 shadow shadow-amber-500/20'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
              }`}
              title="SMS Promotion"
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Send SMS</span>
            </button>

            <button
              onClick={handleSendEmail}
              disabled={!selectedContact || !selectedContact.email}
              className={`col-span-2 flex items-center justify-center gap-1.5 text-xs font-extrabold py-2.5 rounded-lg transition-all cursor-pointer shadow-md ${
                selectedContact && selectedContact.email
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white ring-1 ring-indigo-400/50 shadow shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200'
              }`}
              title="Email Promotion"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Send Email Campaign</span>
            </button>
          </div>
        </section>

          </>
        )}
 
        {/* VIEW: ACTIVE LEADS SYNC-LIST */}
        {currentView === 'active-leads' && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Active Dialer Lead-Sync
                </h2>
              </div>
              <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                {activePhoneCount + activeEmailCount} items
              </span>
            </div>

            <div className="relative shrink-0">
              <Search className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={leadsTab === 'phones' ? "Search active phones..." : "Search active emails..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none"
              />
            </div>

            {/* Tab Selector buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => { setLeadsTab('phones'); setSearchQuery(''); }}
                className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  leadsTab === 'phones'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Active Phones ({filteredActivePhones.length})
              </button>
              <button
                type="button"
                onClick={() => { setLeadsTab('emails'); setSearchQuery(''); }}
                className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  leadsTab === 'emails'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Active Emails ({filteredActiveEmails.length})
              </button>
            </div>

            {/* List Area */}
            <div className="divide-y divide-slate-100 space-y-1 mt-1 pr-0.5 max-h-[440px] overflow-y-auto">
              {leadsTab === 'phones' ? (
                filteredActivePhones.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-6">No active phone leads found.</p>
                ) : (
                  filteredActivePhones.map((contact) => {
                    const isSelected = selectedContact?.id === contact.id || 
                      (selectedContact?.phoneNumber === contact.phoneNumber && contact.phoneNumber !== '');
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
                              {contact.phoneNumber}
                            </span>
                            {isSelected && (
                              <span className="text-[8px] font-extrabold bg-indigo-600 text-white px-1.5 py-0.2 rounded-full uppercase">Target</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContact(contact);
                              setCurrentView('dashboard');
                              addLog(`Loaded target ${contact.phoneNumber} from Leads tab.`);
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-extrabold transition-all cursor-pointer"
                            title="Load as Active Target"
                          >
                            Load
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToRecycleBin(contact.id, contact.phoneNumber);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Move to Recycle Bin"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                filteredActiveEmails.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-6">No active email leads found.</p>
                ) : (
                  filteredActiveEmails.map((contact) => {
                    const isSelected = selectedContact?.id === contact.id || 
                      (selectedContact?.email === contact.email && contact.email !== '');
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
                              {contact.email}
                            </span>
                            {isSelected && (
                              <span className="text-[8px] font-extrabold bg-indigo-600 text-white px-1.5 py-0.2 rounded-full uppercase">Target</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContact(contact);
                              setCurrentView('dashboard');
                              addLog(`Loaded target ${contact.email} from Leads tab.`);
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-extrabold transition-all cursor-pointer"
                            title="Load as Active Target"
                          >
                            Load
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToRecycleBin(contact.id, contact.email);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Move to Recycle Bin"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </section>
        )}

        {/* SECTION 8: RECYCLE BIN RECOVERY ARCHIVE VIEW */}
        {currentView === 'recycle-bin' && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 text-left">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Archive className="w-4 h-4 text-rose-500" />
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recycle Bin Recovery Archived</h2>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                এখানে আপনার ডিলিট করা কন্টাক্টগুলো জমা আছে। আপনি চাইলে এগুলোকে পুনরায় একটিভ করতে পারেন, অথবা সার্ভার থেকে চিরতরে মুছে ফেলতে পারেন।
              </p>
            </div>

            {/* Tab Selector buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setRecycleTab('phones')}
                className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  recycleTab === 'phones'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Phones ({recycledPhones.length + deepRecycledPhones.length})
              </button>
              <button
                type="button"
                onClick={() => setRecycleTab('emails')}
                className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  recycleTab === 'emails'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Emails ({recycledEmails.length + deepRecycledEmails.length})
              </button>
              <button
                type="button"
                onClick={() => setRecycleTab('templates')}
                className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  recycleTab === 'templates'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Messages ({recycledTemplates.length})
              </button>
            </div>

            {/* List area depending on active tab */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
              {recycleTab === 'phones' && (
                <div className="space-y-4 text-left">
                  {/* Recycled Phones */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block border-b border-slate-100 pb-1">Deleted Phone Numbers ({recycledPhones.length})</span>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                      {recycledPhones.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-4 text-center">কোন ডিলিট হওয়া ফোন নাম্বার নেই।</p>
                      ) : (
                        recycledPhones.map((contact) => (
                          <div key={contact.id} className="p-2.5 bg-rose-50/30 border border-rose-100/50 rounded-xl flex items-center justify-between gap-2 text-left transition-colors">
                            <span className="text-xs font-mono font-black text-slate-900 truncate block">
                              {contact.phoneNumber}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleRestoreFromRecycleBin(contact.id, contact.phoneNumber)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Restore to Active Contacts"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Restore</span>
                              </button>
                              {confirmDeleteId === contact.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      handlePermanentDelete(contact.id, contact.phoneNumber);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    Sure?
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(contact.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Delete Permanently from Server"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Deep Archived Phones */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1">Deep Archived Phones ({deepRecycledPhones.length})</span>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                      {deepRecycledPhones.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-4 text-center">ডিপ আর্কাইভ খালি রয়েছে।</p>
                      ) : (
                        deepRecycledPhones.map((contact) => (
                          <div key={contact.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-left transition-colors opacity-80 hover:opacity-100">
                            <span className="text-xs font-mono font-black text-slate-700 truncate block">
                              {contact.phoneNumber}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleRestoreFromRecycleBin(contact.id, contact.phoneNumber)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Restore to Active Contacts"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Restore</span>
                              </button>
                              {confirmDeleteId === contact.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      handlePermanentDelete(contact.id, contact.phoneNumber);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    Sure?
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(contact.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Delete Permanently from Server"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {recycleTab === 'emails' && (
                <div className="space-y-4 text-left">
                  {/* Recycled Emails */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block border-b border-slate-100 pb-1">Deleted Emails ({recycledEmails.length})</span>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                      {recycledEmails.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-4 text-center">কোন ডিলিট হওয়া ইমেইল নেই।</p>
                      ) : (
                        recycledEmails.map((contact) => (
                          <div key={contact.id} className="p-2.5 bg-rose-50/30 border border-rose-100/50 rounded-xl flex items-center justify-between gap-2 text-left transition-colors">
                            <span className="text-xs font-mono font-black text-slate-900 truncate block">
                              {contact.email}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleRestoreFromRecycleBin(contact.id, contact.email)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Restore to Active Contacts"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Restore</span>
                              </button>
                              {confirmDeleteId === contact.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      handlePermanentDelete(contact.id, contact.email);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    Sure?
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(contact.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Delete Permanently from Server"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Deep Archived Emails */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1">Deep Archived Emails ({deepRecycledEmails.length})</span>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                      {deepRecycledEmails.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-4 text-center">ডিপ আর্কাইভ খালি রয়েছে।</p>
                      ) : (
                        deepRecycledEmails.map((contact) => (
                          <div key={contact.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-left transition-colors opacity-80 hover:opacity-100">
                            <span className="text-xs font-mono font-black text-slate-700 truncate block">
                              {contact.email}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleRestoreFromRecycleBin(contact.id, contact.email)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Restore to Active Contacts"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Restore</span>
                              </button>
                              {confirmDeleteId === contact.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      handlePermanentDelete(contact.id, contact.email);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    Sure?
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(contact.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Delete Permanently from Server"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {recycleTab === 'templates' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block border-b border-slate-100 pb-1">
                      Deleted Custom Messages ({recycledTemplates.length})
                    </span>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
                      {recycledTemplates.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-4 text-center">কোন ডিলিট হওয়া কাস্টম মেসেজ নেই।</p>
                      ) : (
                        recycledTemplates.map((tpl) => (
                          <div key={tpl.id} className="p-2.5 bg-rose-50/30 border border-rose-100/50 rounded-xl flex items-start justify-between gap-2 text-left transition-colors">
                            <div className="truncate pr-1">
                              <span className="text-xs font-bold text-indigo-950 block truncate">{tpl.label}</span>
                              <span className="text-[10px] text-slate-500 block truncate leading-relaxed mt-0.5">{tpl.text}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleRestoreTemplate(tpl.id)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Restore Message Template"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Restore</span>
                              </button>
                              {confirmDeleteTemplateId === tpl.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      handlePermanentDeleteTemplate(tpl.id);
                                      setConfirmDeleteTemplateId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    Sure?
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteTemplateId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteTemplateId(tpl.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Delete Permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 9: SAVED CUSTOMER PLATFORM DOCUMENTS VIEW */}
        {currentView === 'saved-documents' && (
          <section className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 text-left">
              
              {/* Header Title & Toggle Form Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Customer Credentials Manager</h2>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Safely store and manage account credentials for Baji, CX, Jitbaji, Babu88, Nagad88, Crickex, and other platforms.</p>
                </div>
                
                <button
                  onClick={() => {
                    if (showDocForm) {
                      handleCancelEditClientDocument();
                    } else {
                      setShowDocForm(true);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    showDocForm 
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/15'
                  }`}
                >
                  {showDocForm ? (
                    <span>Close Form</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Credentials</span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible New/Edit Document Form */}
              {showDocForm && (
                <form onSubmit={handleSaveClientDocument} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 animate-slide-down">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    {editingDocId ? "📁 Edit Customer Credentials" : "📁 Save New Credentials"}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Platform Select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Select Platform *
                      </label>
                      <select
                        value={docPlatform}
                        onChange={(e) => setDocPlatform(e.target.value)}
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      >
                        {['Baji', 'CX', 'Jitbaji', 'Babu88', 'Nagad88', 'Crickex', 'Others', 'বাজি', 'সিএক্স', 'জিৎবাজ', 'বাবু 88', 'নগদ ৮৮', 'কৃকিয়া', 'আদার্স'].map((plat) => {
                          const displayLabel = plat === 'বাজি' ? 'Baji' :
                                               plat === 'সিএক্স' ? 'CX' :
                                               plat === 'জিৎবাজ' ? 'Jitbaji' :
                                               plat === 'বাবু 88' ? 'Babu88' :
                                               plat === 'নগদ ৮৮' ? 'Nagad88' :
                                               plat === 'কৃকিয়া' ? 'Crickex' :
                                               plat === 'আদার্স' ? 'Others' : plat;
                          return <option key={plat} value={plat}>{displayLabel}</option>;
                        })}
                      </select>
                    </div>

                    {/* Username */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={docUsername}
                        onChange={(e) => setDocUsername(e.target.value)}
                        placeholder="sky_winner"
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Password
                      </label>
                      <input
                        type="text"
                        value={docPassword}
                        onChange={(e) => setDocPassword(e.target.value)}
                        placeholder="Pass1234"
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={docEmail}
                        onChange={(e) => setDocEmail(e.target.value)}
                        placeholder="customer@gmail.com"
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={docPhoneNumber}
                        onChange={(e) => setDocPhoneNumber(e.target.value)}
                        placeholder="01712345678"
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>

                    {/* DOB */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Date of Birth
                      </label>
                      <input
                        type="text"
                        value={docDob}
                        onChange={(e) => setDocDob(e.target.value)}
                        placeholder="12/05/1998"
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={docFullName}
                        onChange={(e) => setDocFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      />
                    </div>

                    {/* WhatsApp Number */}
                    <div className="space-y-1 col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        WhatsApp Number (with country code, e.g. 8801712345678)
                      </label>
                      <input
                        type="text"
                        value={docWhatsappNumber}
                        onChange={(e) => setDocWhatsappNumber(e.target.value)}
                        placeholder="8801712345678"
                        className="w-full text-xs bg-white text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Form Submission Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCancelEditClientDocument}
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-black transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingDoc}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-indigo-500/10 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {savingDoc ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{editingDocId ? "Update" : "Save"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search by username, full name, platform, email, phone or WhatsApp..."
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-slate-50/50 font-medium text-slate-800"
                />
              </div>

              {/* Document List Container */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans">Credential List ({filteredClientDocuments.length})</span>
                  {docSearchQuery && (
                    <button 
                      onClick={() => setDocSearchQuery('')} 
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {filteredClientDocuments.length === 0 ? (
                  <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                    <p className="text-xs font-bold text-slate-400">No credentials found.</p>
                    <p className="text-[10px] text-slate-400">Click the button above to add new customer accounts.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClientDocuments.map((docItem) => {
                      // Platform visual colors
                      const colorMap: Record<string, string> = {
                        'Baji': 'bg-green-50 text-green-700 border-green-200/50',
                        'বাজি': 'bg-green-50 text-green-700 border-green-200/50',
                        'CX': 'bg-cyan-50 text-cyan-700 border-cyan-200/50',
                        'সিএক্স': 'bg-cyan-50 text-cyan-700 border-cyan-200/50',
                        'Jitbaji': 'bg-amber-50 text-amber-700 border-amber-200/50',
                        'জিৎবাজ': 'bg-amber-50 text-amber-700 border-amber-200/50',
                        'Babu88': 'bg-purple-50 text-purple-700 border-purple-200/50',
                        'বাবু 88': 'bg-purple-50 text-purple-700 border-purple-200/50',
                        'Nagad88': 'bg-rose-50 text-rose-700 border-rose-200/50',
                        'নগদ ৮৮': 'bg-rose-50 text-rose-700 border-rose-200/50',
                        'Crickex': 'bg-teal-50 text-teal-700 border-teal-200/50',
                        'কৃকিয়া': 'bg-teal-50 text-teal-700 border-teal-200/50',
                        'Others': 'bg-slate-50 text-slate-700 border-slate-200/50',
                        'আদার্স': 'bg-slate-50 text-slate-700 border-slate-200/50',
                      };
                      const colorClasses = colorMap[docItem.platform] || colorMap['Others'];

                      const displayPlatform = docItem.platform === 'বাজি' ? 'Baji' :
                                              docItem.platform === 'সিএক্স' ? 'CX' :
                                              docItem.platform === 'জিৎবাজ' ? 'Jitbaji' :
                                              docItem.platform === 'বাবু 88' ? 'Babu88' :
                                              docItem.platform === 'নগদ ৮৮' ? 'Nagad88' :
                                              docItem.platform === 'কৃকিয়া' ? 'Crickex' :
                                              docItem.platform === 'আদার্স' ? 'Others' : docItem.platform;

                      return (
                        <div 
                          key={docItem.id} 
                          className="bg-white rounded-2xl border border-slate-100 hover:border-indigo-300 transition-all p-4 space-y-3 relative overflow-hidden hover:shadow-xs group text-left"
                        >
                          {/* Platform Badge & Title Row */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider ${colorClasses}`}>
                                {displayPlatform}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors font-mono tracking-tight break-all">
                                Username: {docItem.username}
                              </h4>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleStartEditClientDocument(docItem)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteClientDocument(docItem.id, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Customer Meta Specs */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                            {docItem.fullName && (
                              <div className="col-span-2 space-y-0.5">
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">Full Name</span>
                                <span className="text-slate-700 font-bold block">{docItem.fullName}</span>
                              </div>
                            )}

                            {docItem.password && (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">Password</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-800 font-mono font-bold truncate block max-w-[120px]">{docItem.password}</span>
                                  <button 
                                    onClick={() => { navigator.clipboard.writeText(docItem.password || ''); alert("Password copied to clipboard!"); }}
                                    className="p-0.5 text-indigo-500 hover:text-indigo-700 cursor-pointer"
                                    title="Copy Password"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {docItem.email && (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">Email</span>
                                <span className="text-slate-800 font-mono truncate block max-w-[120px]" title={docItem.email}>{docItem.email}</span>
                              </div>
                            )}

                            {docItem.phoneNumber && (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">Phone Number</span>
                                <span className="text-slate-800 font-mono truncate block">{docItem.phoneNumber}</span>
                              </div>
                            )}

                            {docItem.dob && (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">Date of Birth (DOB)</span>
                                <span className="text-slate-800 font-mono block">{docItem.dob}</span>
                              </div>
                            )}
                          </div>

                          {/* WhatsApp One-Click Action Trigger */}
                          {docItem.whatsappNumber ? (
                            <button
                              onClick={() => {
                                const cleanNum = formatBdInternationalPhone(docItem.whatsappNumber!);
                                const encodedText = encodeURIComponent(
                                  promoMessage && promoMessage !== 'Write or select your custom saved campaign message here.'
                                    ? promoMessage 
                                    : `Hello ${docItem.fullName || docItem.username}, your account details for ${displayPlatform} have been successfully stored.`
                                );
                                const waUrl = `https://wa.me/${cleanNum}?text=${encodedText}`;
                                addLog(`Opening direct WhatsApp line to ${docItem.username} (+${cleanNum})...`);
                                updateStats('whatsappSentCount');
                                window.open(waUrl, '_blank');
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-500/10 hover:-translate-y-0.5 active:translate-y-0"
                            >
                              <MessageCircle className="w-4 h-4 shrink-0" />
                              <span>Send WhatsApp Message (On Click)</span>
                            </button>
                          ) : (
                            <div className="text-center py-2 text-[9px] text-slate-400 font-bold bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                              No WhatsApp number saved
                            </div>
                          )}

                          <div className="text-[8px] text-slate-400 text-right font-mono">
                            Added: {new Date(docItem.createdAt).toLocaleDateString()}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </section>
        )}

      </main>

      {/* Mobile Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-[10px] text-slate-400 shrink-0">
        <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-1">
          <p className="font-bold text-slate-600">© 2026 Promotion System</p>
        </div>
      </footer>

    </div>
  </div>
  );
}
