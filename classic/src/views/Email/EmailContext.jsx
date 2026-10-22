import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const EmailContext = createContext(null);

export function EmailProvider({ children }) {
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [accountsError, setAccountsError] = useState(null);
    const [activeAccountId, setActiveAccountId] = useState(null);

    const [activeFolder, setActiveFolder] = useState('INBOX');
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messagesError, setMessagesError] = useState(null);

    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const activeAccount = accounts.find((a) => a.id === activeAccountId) || null;

    // Load user accounts on mount
    const loadAccounts = useCallback(async () => {
        try {
            setLoadingAccounts(true);
            setAccountsError(null);
            const res = await api.get('/api/user/email-accounts');
            const list = Array.isArray(res) ? res : (res?.accounts || res?.data || []);
            setAccounts(list);

            if (list.length > 0) {
                // If current active account is still valid, retain it; otherwise default or first
                setActiveAccountId((prev) => {
                    if (prev && list.some((a) => a.id === prev)) return prev;
                    const defaultAcc = list.find((a) => a.isDefault);
                    return defaultAcc ? defaultAcc.id : list[0].id;
                });
            } else {
                setActiveAccountId(null);
                setMessages([]);
                setSelectedMessage(null);
            }
        } catch (err) {
            setAccountsError(err.data?.error || err.message || 'Failed to load email accounts');
        } finally {
            setLoadingAccounts(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    // Load messages whenever activeAccount or activeFolder changes
    const loadMessages = useCallback(async (accountId, folder = 'INBOX') => {
        if (!accountId) {
            setMessages([]);
            return;
        }

        try {
            setLoadingMessages(true);
            setMessagesError(null);
            const res = await api.get(`/api/user/email-accounts/${accountId}/messages?folder=${encodeURIComponent(folder)}`);
            const msgList = res?.messages || (Array.isArray(res) ? res : []);
            setMessages(msgList);

            // Auto-select first message if available and none selected
            if (msgList.length > 0) {
                setSelectedMessageId(msgList[0].id || msgList[0].uid);
                setSelectedMessage(msgList[0]);
            } else {
                setSelectedMessageId(null);
                setSelectedMessage(null);
            }
        } catch (err) {
            const errorMsg = err.data?.error || err.message || 'Unable to connect to mailbox server';
            setMessagesError(errorMsg);
            setMessages([]);
            setSelectedMessage(null);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (activeAccountId) {
            loadMessages(activeAccountId, activeFolder);
        }
    }, [activeAccountId, activeFolder, loadMessages]);

    // Load individual message details
    const selectMessage = useCallback(async (msg) => {
        if (!msg) {
            setSelectedMessageId(null);
            setSelectedMessage(null);
            return;
        }
        const uid = msg.id || msg.uid;
        setSelectedMessageId(uid);
        setSelectedMessage(msg);

        if (!activeAccountId || !uid) return;

        try {
            setLoadingDetail(true);
            const res = await api.get(`/api/user/email-accounts/${activeAccountId}/messages/${uid}`);
            if (res?.message) {
                setSelectedMessage((prev) => ({ ...prev, ...res.message }));
            }
        } catch (err) {
            console.warn('[EmailContext] Detail fetch warning:', err.message);
        } finally {
            setLoadingDetail(false);
        }
    }, [activeAccountId]);

    return (
        <EmailContext.Provider
            value={{
                accounts,
                loadingAccounts,
                accountsError,
                activeAccountId,
                setActiveAccountId,
                activeAccount,
                activeFolder,
                setActiveFolder,
                messages,
                loadingMessages,
                messagesError,
                selectedMessageId,
                selectedMessage,
                loadingDetail,
                selectMessage,
                searchQuery,
                setSearchQuery,
                refreshMessages: () => loadMessages(activeAccountId, activeFolder),
                refreshAccounts: loadAccounts,
            }}
        >
            {children}
        </EmailContext.Provider>
    );
}

export function useEmail() {
    const ctx = useContext(EmailContext);
    if (!ctx) {
        throw new Error('useEmail must be used within an EmailProvider');
    }
    return ctx;
}
