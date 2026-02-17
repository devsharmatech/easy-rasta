'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    MessageSquare, Search, Trash2, Mail, MailOpen, RefreshCw,
    CheckCircle2, Loader2, Inbox, Clock, Reply, ArrowUpRight, User
} from 'lucide-react';
import { toast } from 'sonner';

export default function MessagesPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Detail
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailMessage, setDetailMessage] = useState(null);

    // Actions
    const [refreshing, setRefreshing] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => { fetchMessages() }, []);

    const fetchMessages = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const res = await fetch('/api/admin/contacts', { headers });
            if (!res.ok) throw new Error();
            setMessages(await res.json());
        } catch { toast.error('Failed to load messages'); }
        finally { setLoading(false); setRefreshing(false); }
    };

    // Stats
    const stats = useMemo(() => ({
        total: messages.length,
        unread: messages.filter(m => m.status === 'new').length,
        read: messages.filter(m => m.status === 'read').length,
        replied: messages.filter(m => m.status === 'replied').length,
    }), [messages]);

    const handleViewDetail = (msg) => {
        setDetailMessage(msg);
        setDetailOpen(true);
        if (msg.status === 'new') {
            handleStatusUpdate(msg.id, 'read');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await fetch('/api/admin/contacts', {
                method: 'PUT', headers,
                body: JSON.stringify({ id, status })
            });
            fetchMessages();
            if (detailMessage?.id === id) {
                setDetailMessage(prev => ({ ...prev, status }));
            }
        } catch { toast.error('Failed to update status'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this message permanently?')) return;
        setDeleting(id);
        try {
            await fetch(`/api/admin/contacts?id=${id}`, { method: 'DELETE', headers });
            toast.success('Message deleted');
            fetchMessages();
            if (detailMessage?.id === id) setDetailOpen(false);
        } catch { toast.error('Failed to delete'); }
        finally { setDeleting(null); }
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    };

    // Filter Logic
    const filtered = messages.filter(m => {
        const term = searchTerm.toLowerCase();
        const matchSearch =
            m.name.toLowerCase().includes(term) ||
            m.email.toLowerCase().includes(term) ||
            m.subject.toLowerCase().includes(term);
        const matchStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
                </div>
                <p className="text-muted-foreground font-medium">Loading messages...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Messages
                    </h2>
                    <p className="text-muted-foreground mt-1">View and manage contact form submissions</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchMessages(true)}
                    disabled={refreshing}
                    className="gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors"
                >
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-blue-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                                <Inbox className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                <p className="text-xs text-muted-foreground font-medium">Total Messages</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-orange-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
                                <p className="text-xs text-muted-foreground font-medium">Unread</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-purple-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                                <MailOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.read}</p>
                                <p className="text-xs text-muted-foreground font-medium">Read</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-green-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-green-100 text-green-600">
                                <Reply className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.replied}</p>
                                <p className="text-xs text-muted-foreground font-medium">Replied</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email or subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-gray-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] border-gray-200">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">🔵 New</SelectItem>
                        <SelectItem value="read">📖 Read</SelectItem>
                        <SelectItem value="replied">✅ Replied</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {filtered.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b">
                                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Sender</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Subject</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Received</TableHead>
                                    <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((msg) => (
                                    <TableRow
                                        key={msg.id}
                                        className={`cursor-pointer transition-colors duration-200 ${msg.status === 'new'
                                                ? 'bg-orange-50/30 hover:bg-orange-50/60 border-l-2 border-l-orange-400'
                                                : 'hover:bg-gray-50/80'
                                            }`}
                                        onClick={() => handleViewDetail(msg)}
                                    >
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${msg.status === 'new'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : msg.status === 'replied'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {msg.status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                                                {msg.status === 'new' ? 'New' : msg.status === 'replied' ? 'Replied' : 'Read'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                    {msg.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className={`text-sm ${msg.status === 'new' ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                        {msg.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{msg.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className={`text-sm truncate max-w-[250px] ${msg.status === 'new' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                {msg.subject}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                                <Clock className="h-3.5 w-3.5" />
                                                {getTimeAgo(msg.created_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                                    onClick={(e) => { e.stopPropagation(); handleViewDetail(msg); }}
                                                >
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                                    disabled={deleting === msg.id}
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                                >
                                                    {deleting === msg.id
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <Trash2 className="h-4 w-4" />
                                                    }
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mb-4">
                                <MessageSquare className="h-10 w-10 text-orange-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">No messages found</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                                {searchTerm || statusFilter !== 'all'
                                    ? 'Try adjusting your search or filter to find messages.'
                                    : 'When someone submits the contact form, their message will appear here.'
                                }
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                                {detailMessage?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                                <DialogTitle className="text-left">Message from {detailMessage?.name}</DialogTitle>
                                <p className="text-sm text-muted-foreground text-left">{detailMessage?.email}</p>
                            </div>
                        </div>
                    </DialogHeader>
                    {detailMessage && (
                        <div className="space-y-4 mt-2">
                            {/* Status & Date row */}
                            <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${detailMessage.status === 'new'
                                        ? 'bg-orange-100 text-orange-700'
                                        : detailMessage.status === 'replied'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {detailMessage.status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                    {detailMessage.status === 'new' ? 'New' : detailMessage.status === 'replied' ? 'Replied' : 'Read'}
                                </span>
                                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {new Date(detailMessage.created_at).toLocaleString()}
                                </span>
                            </div>

                            {/* Subject */}
                            <div className="border-t pt-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                                <p className="font-semibold text-lg text-gray-900">{detailMessage.subject}</p>
                            </div>

                            {/* Message body */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-5 rounded-xl border border-gray-100">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Message</p>
                                <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{detailMessage.message}</p>
                            </div>

                            <DialogFooter className="gap-2 pt-2">
                                {detailMessage.status !== 'replied' && (
                                    <Button
                                        variant="outline"
                                        className="gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                                        onClick={() => handleStatusUpdate(detailMessage.id, 'replied')}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Mark as Replied
                                    </Button>
                                )}
                                <Button
                                    variant="destructive"
                                    className="gap-2"
                                    onClick={() => handleDelete(detailMessage.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
