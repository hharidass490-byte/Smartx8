/**
 * SMART X 8 - Unified Backend & Data Storage Engine
 * Manages participant registrations, payment transactions, admin authentication,
 * and intelligent deduplication to prevent repeated participant records.
 */

(function (window) {
    'use strict';

    const STORAGE_KEY = 'hackathonRegistrations';
    const PASS_KEY = 'smartx8_admin_password';
    const AUTH_KEY = 'smartx8_admin_authenticated';

    const DEFAULT_ADMIN_USERS = ['admin', 'smartx8'];
    const DEFAULT_PASSWORDS = ['aids8', 'smartx8', 'smartx8@2026'];

    /**
     * Clean phone number to compare digits (strips country code, spaces, dashes)
     */
    function normalizePhone(phone) {
        if (!phone) return '';
        const digits = String(phone).replace(/\D/g, '');
        // Take the last 10 digits if available (standard in India)
        return digits.length >= 10 ? digits.slice(-10) : digits;
    }

    /**
     * Normalize name string for loose comparison
     */
    function normalizeName(name) {
        if (!name) return '';
        return String(name)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .trim();
    }

    /**
     * Normalize string for comparison
     */
    function normalizeStr(str) {
        if (!str) return '';
        return String(str).toLowerCase().trim();
    }

    /**
     * Check if two participant records represent the same person / registration
     */
    function areDuplicates(r1, r2) {
        if (!r1 || !r2) return false;

        // 1. Exact registration ID match
        if (r1.registrationId && r2.registrationId) {
            if (normalizeStr(r1.registrationId) === normalizeStr(r2.registrationId)) {
                return true;
            }
        }

        // 2. Email match (emails are globally unique per participant)
        if (r1.email && r2.email) {
            if (normalizeStr(r1.email) === normalizeStr(r2.email)) {
                return true;
            }
        }

        // 3. Phone number match (10-digit normalized)
        const p1 = normalizePhone(r1.phone);
        const p2 = normalizePhone(r2.phone);
        if (p1 && p2 && p1 === p2 && p1.length >= 8) {
            return true;
        }

        // 4. Same participant name AND same college
        const n1 = normalizeName(r1.fullname);
        const n2 = normalizeName(r2.fullname);
        const c1 = normalizeStr(r1.college);
        const c2 = normalizeStr(r2.college);
        if (n1 && n2 && n1 === n2 && c1 && c2 && (c1.includes(c2) || c2.includes(c1))) {
            return true;
        }

        return false;
    }

    /**
     * Merge two duplicate records into one canonical, complete record
     */
    function mergeRecords(primary, secondary) {
        const isPrimaryConfirmed = primary.status === 'Confirmed' || primary.status === 'Verified';
        const isSecConfirmed = secondary.status === 'Confirmed' || secondary.status === 'Verified';

        // Prefer the confirmed record as base
        const base = isSecConfirmed && !isPrimaryConfirmed ? { ...secondary } : { ...primary };
        const other = base === primary ? secondary : primary;

        return {
            registrationId: base.registrationId || other.registrationId || ('SMARTX8-REG-' + Math.floor(10000 + Math.random() * 90000)),
            fullname: base.fullname || other.fullname || 'Participant',
            email: base.email || other.email || '',
            phone: base.phone || other.phone || '',
            college: base.college || other.college || '',
            year: base.year || other.year || 'Student',
            track: base.track || other.track || 'Agentic AI',
            teamsize: base.teamsize || other.teamsize || 'Individual',
            teamMembers: base.teamMembers || other.teamMembers || '',
            amount: Math.max(Number(base.amount) || 0, Number(other.amount) || 0) || 300,
            paymentMethod: base.paymentMethod || other.paymentMethod || 'upi',
            utrNumber: (base.utrNumber && !base.utrNumber.startsWith('UTR')) ? base.utrNumber : (other.utrNumber || base.utrNumber || ''),
            transactionId: base.transactionId || other.transactionId || ('TXN-SMARTX8-' + Date.now().toString().slice(-6)),
            status: (isPrimaryConfirmed || isSecConfirmed) ? 'Confirmed' : (base.status || other.status || 'Pending Verification'),
            timestamp: base.timestamp || other.timestamp || new Date().toLocaleString(),
            confirmedAt: base.confirmedAt || other.confirmedAt || (isPrimaryConfirmed || isSecConfirmed ? (base.timestamp || new Date().toLocaleString()) : undefined)
        };
    }

    /**
     * Deduplicate an array of registration records
     */
    function deduplicate(list) {
        if (!Array.isArray(list)) return [];
        const unique = [];

        for (const item of list) {
            if (!item || (!item.fullname && !item.email && !item.phone && !item.registrationId)) {
                continue;
            }

            const existingIdx = unique.findIndex(existing => areDuplicates(existing, item));
            if (existingIdx >= 0) {
                // Merge duplicate into existing entry
                unique[existingIdx] = mergeRecords(unique[existingIdx], item);
            } else {
                unique.push({ ...item });
            }
        }

        return unique;
    }

    /**
     * Built-in verified sample records for demo purposes
     */
    function getSampleRecords() {
        return [
            {
                registrationId: 'SMARTX8-2026-A101',
                fullname: 'Karthik Raja S',
                email: 'karthik.ai@gmail.com',
                phone: '+91 9842155678',
                college: 'NSN CET Karur',
                year: '3rd Year',
                track: 'Agentic AI',
                teamsize: '2 Members',
                teamMembers: 'Siva K (3rd Year, AI&DS)',
                amount: 600,
                paymentMethod: 'upi',
                utrNumber: '425918736452',
                transactionId: 'TXN-UPI-89214',
                status: 'Confirmed',
                timestamp: '22/09/2026, 05:40:12',
                confirmedAt: '22/09/2026, 05:40:12'
            },
            {
                registrationId: 'SMARTX8-2026-B204',
                fullname: 'Priya Dharshini M',
                email: 'priya.ds@kongu.edu',
                phone: '+91 9443218765',
                college: 'Kongu Engineering College',
                year: '4th Year',
                track: 'Generative AI',
                teamsize: 'Individual',
                teamMembers: '',
                amount: 300,
                paymentMethod: 'card',
                utrNumber: '528194726154',
                transactionId: 'TXN-CARD-77412',
                status: 'Confirmed',
                timestamp: '22/09/2026, 05:41:30',
                confirmedAt: '22/09/2026, 05:41:30'
            },
            {
                registrationId: 'SMARTX8-2026-C309',
                fullname: 'Arun Kumar V',
                email: 'arun.innovator@psgtech.ac.in',
                phone: '+91 9840192837',
                college: 'PSG Tech Coimbatore',
                year: '2nd Year',
                track: 'Climate Tech',
                teamsize: '4 Members',
                teamMembers: 'Deepak R, Naveen M, Praveen S',
                amount: 1200,
                paymentMethod: 'upi',
                utrNumber: '491827364512',
                transactionId: 'TXN-UPI-61298',
                status: 'Confirmed',
                timestamp: '22/09/2026, 05:42:45',
                confirmedAt: '22/09/2026, 05:42:45'
            }
        ];
    }

    /**
     * SmartXBackend Service
     */
    const SmartXBackend = {
        STORAGE_KEY,
        PASS_KEY,
        AUTH_KEY,

        /**
         * Retrieve all registrations from storage.
         * Automatically deduplicates and updates storage if autoDedupe is true.
         */
        getAll(autoDedupe = true) {
            let list = [];
            const raw = localStorage.getItem(STORAGE_KEY);
            const isInitialized = localStorage.getItem('smartx8_db_initialized') === 'true';

            try {
                if (raw !== null) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        list = parsed;
                    }
                }
            } catch (err) {
                console.error('Error reading registrations from storage:', err);
                list = [];
            }

            // ONLY seed sample data on first-ever launch (when storage key does NOT exist at all)
            if (raw === null && !isInitialized) {
                list = getSampleRecords();
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
                    localStorage.setItem('smartx8_db_initialized', 'true');
                } catch (e) { }
                return {
                    registrations: list,
                    duplicatesRemoved: 0,
                    totalCount: list.length
                };
            }

            if (!autoDedupe || list.length === 0) {
                return {
                    registrations: list,
                    duplicatesRemoved: 0,
                    totalCount: list.length
                };
            }

            const initialLength = list.length;
            const deduplicated = deduplicate(list);
            const duplicatesRemoved = initialLength - deduplicated.length;

            if (duplicatesRemoved > 0) {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
                } catch (err) {
                    console.error('Error saving deduplicated records:', err);
                }
            }

            return {
                registrations: deduplicated,
                duplicatesRemoved: duplicatesRemoved,
                totalCount: deduplicated.length
            };
        },

        /**
         * Check if a participant record already exists in the database
         */
        findExisting(candidate) {
            if (!candidate) return null;
            const { registrations } = this.getAll(false);
            return registrations.find(r => areDuplicates(r, candidate)) || null;
        },

        /**
         * Save or update a participant registration record.
         * Enforces deduplication: if the participant exists, updates in place!
         */
        saveOrUpdate(record) {
            if (!record) return { success: false, error: 'No record provided' };

            const { registrations } = this.getAll(false);
            const matchIndex = registrations.findIndex(r => areDuplicates(r, record));

            let savedRecord = null;
            let isUpdate = false;

            if (matchIndex >= 0) {
                // Merge candidate with existing record
                savedRecord = mergeRecords(registrations[matchIndex], record);
                registrations[matchIndex] = savedRecord;
                isUpdate = true;
            } else {
                savedRecord = { ...record };
                registrations.unshift(savedRecord);
            }

            // Ensure entire array is cleanly deduplicated
            const cleanList = deduplicate(registrations);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
            } catch (err) {
                console.error('Error persisting registration:', err);
                return { success: false, error: err.message };
            }

            return {
                success: true,
                isUpdate: isUpdate,
                record: savedRecord,
                totalCount: cleanList.length
            };
        },

        /**
         * Clean and deduplicate the entire registration database in localStorage.
         * Returns the number of duplicates removed.
         */
        cleanDatabase() {
            let list = [];
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    list = JSON.parse(raw);
                }
            } catch (err) {
                list = [];
            }

            if (!Array.isArray(list) || list.length === 0) return 0;

            const initialCount = list.length;
            const cleaned = deduplicate(list);
            const removed = initialCount - cleaned.length;

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            } catch (e) { }

            return removed;
        },

        /**
         * Verify payment and confirm a registration by ID
         */
        verifyPayment(registrationId) {
            const { registrations } = this.getAll(false);
            const idx = registrations.findIndex(r => r.registrationId === registrationId);
            if (idx === -1) return false;

            registrations[idx].status = 'Confirmed';
            registrations[idx].verifiedAt = new Date().toLocaleString();

            const cleanList = deduplicate(registrations);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
            return true;
        },

        /**
         * Delete registration by ID or matching participant details.
         * Thoroughly removes matching record AND any duplicate ghost entries.
         */
        deleteRegistration(identifier) {
            let list = [];
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw !== null) {
                    list = JSON.parse(raw) || [];
                }
            } catch (e) {
                list = [];
            }

            if (!Array.isArray(list) || list.length === 0) {
                return { success: false, removedCount: 0, remainingCount: 0 };
            }

            const initialLength = list.length;
            const targetId = typeof identifier === 'string' ? identifier.trim() : (identifier?.registrationId || '');

            // Find target record to extract any matching email/phone/name
            const targetRecord = list.find(r => r && r.registrationId && r.registrationId.trim().toLowerCase() === targetId.toLowerCase());

            const filtered = list.filter(r => {
                if (!r) return false;

                // 1. Direct ID match
                if (r.registrationId && targetId && r.registrationId.trim().toLowerCase() === targetId.toLowerCase()) {
                    return false;
                }

                // 2. If target record was found, also remove duplicates sharing the same participant identity
                if (targetRecord && areDuplicates(r, targetRecord)) {
                    return false;
                }

                return true;
            });

            const removedCount = initialLength - filtered.length;
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
                localStorage.setItem('smartx8_db_initialized', 'true');
            } catch (err) {
                console.error('Error saving after delete:', err);
            }

            return {
                success: removedCount > 0,
                removedCount: removedCount,
                remainingCount: filtered.length
            };
        },

        /**
         * Clear all registrations
         */
        clearAll() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
                localStorage.setItem('smartx8_db_initialized', 'true');
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
            }
            return true;
        },

        /**
         * Seed sample verified records
         */
        seedSampleData() {
            const samples = getSampleRecords();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
            localStorage.setItem('smartx8_db_initialized', 'true');
            return samples;
        },

        /**
         * Utility deduplicate function
         */
        deduplicate(list) {
            return deduplicate(list);
        },

        // ====================================================
        // AUTHENTICATION & SECURITY MANAGEMENT
        // ====================================================
        getStoredPassword() {
            return localStorage.getItem(PASS_KEY) || 'smartx8@2026';
        },

        setStoredPassword(newPassword) {
            if (!newPassword || newPassword.length < 6) return false;
            localStorage.setItem(PASS_KEY, newPassword);
            return true;
        },

        validatePassword(password) {
            const stored = this.getStoredPassword();
            const allowed = [stored, ...DEFAULT_PASSWORDS].filter(Boolean);
            return allowed.includes(password);
        },

        validateLogin(username, password) {
            const u = (username || '').trim().toLowerCase();
            const p = (password || '');
            const validUsers = DEFAULT_ADMIN_USERS;
            return validUsers.includes(u) && this.validatePassword(p);
        },

        isAuthenticated() {
            return sessionStorage.getItem(AUTH_KEY) === 'true';
        },

        setAuthenticated(status) {
            if (status) {
                sessionStorage.setItem(AUTH_KEY, 'true');
            } else {
                sessionStorage.removeItem(AUTH_KEY);
            }
        },

        logout() {
            this.setAuthenticated(false);
            window.location.replace('admin-login.html');
        }
    };

    // Export to global scope
    window.SmartXBackend = SmartXBackend;

})(window);
