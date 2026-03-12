'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCcw, Search, Send, User, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react'

import { generateToken, onMessageListener } from '@/lib/firebaseClient'

export default function PushTesterPage() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    
    const [selectedUserId, setSelectedUserId] = useState('')
    const [manualToken, setManualToken] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [incomingPush, setIncomingPush] = useState(null)

    const [pushForm, setPushForm] = useState({
        title: 'Test Notification',
        message: 'This is a test push notification from EasyRasta.',
        category: 'system'
    })

    useEffect(() => {
        fetchUsers()
        
        // Listen for foreground messages
        onMessageListener((payload) => {
            console.log('[Push Received in Foreground]', payload)
            setIncomingPush(payload)
            showMessage('success', `Push Received: ${payload?.notification?.title}`)
            setTimeout(() => setIncomingPush(null), 8000)
        })

    }, [])

    const handleGenerateBrowserToken = async () => {
        setActionLoading(true)
        try {
            const token = await generateToken()
            if (token) {
                setManualToken(token)
                showMessage('success', 'Browser token generated successfully! You can now inject it.')
            } else {
                showMessage('error', 'Failed to generate token. Please auto-allow notification permissions.')
            }
        } catch (e) {
            showMessage('error', 'Token error')
        }
        setActionLoading(false)
    }

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('adminToken')
            const url = searchQuery ? `/api/admin/push-tester?q=${encodeURIComponent(searchQuery)}` : '/api/admin/push-tester'
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            setUsers(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Failed to fetch users:', error)
        }
        setLoading(false)
    }

    const showMessage = (type, text) => {
        setMessage({ type, text })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }

    const handleUpdateToken = async () => {
        if (!selectedUserId || !manualToken) return showMessage('error', 'Select a user and provide a token.')
        
        setActionLoading(true)
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/push-tester', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'update_token',
                    targetUserId: selectedUserId,
                    token: manualToken
                })
            })
            const data = await res.json()
            if (res.ok) {
                showMessage('success', 'Token updated successfully!')
                fetchUsers() // Refresh list to show new token
                setManualToken('')
            } else {
                showMessage('error', data.error || 'Failed to update token')
            }
        } catch (error) {
            showMessage('error', 'Network error occurred')
        }
        setActionLoading(false)
    }

    const handleSendPush = async () => {
        if (!selectedUserId || !pushForm.title || !pushForm.message) {
            return showMessage('error', 'Please fill all push notification fields.')
        }

        setActionLoading(true)
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/push-tester', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'send_push',
                    targetUserId: selectedUserId,
                    title: pushForm.title,
                    message: pushForm.message,
                    category: pushForm.category
                })
            })
            const data = await res.json()
            if (res.ok) {
                showMessage('success', data.message)
            } else {
                showMessage('error', data.message || data.error || 'Failed to send push')
            }
        } catch (error) {
            showMessage('error', 'Network error occurred')
        }
        setActionLoading(false)
    }

    const selectedUser = users.find(u => u.id === selectedUserId)

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Push Notification Tester</h1>
                <p className="text-gray-500 mt-2">Find a user, inject an FCM device token for testing, and send test payloads.</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <p className="font-medium">{message.text}</p>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
                {/* LEFT COL: User Selection & Token Injection */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-gray-100">
                        <CardHeader className="bg-gray-50/50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-orange-600" />
                                1. Select Target User
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        placeholder="Search by name or mobile..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                                    />
                                </div>
                                <Button onClick={fetchUsers} variant="outline"><RefreshCcw className="h-4 w-4" /></Button>
                            </div>

                            <div className="border rounded-lg overflow-y-auto max-h-[300px]">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-500">Loading users...</div>
                                ) : users.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No users found.</div>
                                ) : (
                                    <div className="divide-y">
                                        {users.map(u => (
                                            <div 
                                                key={u.id} 
                                                onClick={() => setSelectedUserId(u.id)}
                                                className={`p-3 cursor-pointer flex justify-between items-center transition-colors ${selectedUserId === u.id ? 'bg-orange-50 border-l-4 border-orange-500 pl-2' : 'hover:bg-gray-50'}`}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{u.full_name || 'Anonymous User'}</div>
                                                    <div className="text-xs text-gray-500">{u.mobile} • {u.role}</div>
                                                </div>
                                                <div>
                                                    {u.device_token ? (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Has Token</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-gray-400 border-gray-200">No Token</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`shadow-sm border-gray-100 transition-opacity ${!selectedUserId ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CardHeader className="bg-gray-50/50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-blue-600" />
                                2. Inject Device Token (Optional)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                If the user doesn't have an FCM token, you can generate a token for your current browser and inject it to test receiving web pushes immediately!
                            </p>
                            <div className="space-y-4">
                                <Button 
                                    onClick={handleGenerateBrowserToken} 
                                    disabled={actionLoading}
                                    variant="outline"
                                    className="w-full border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                >
                                    <Smartphone className="h-4 w-4 mr-2" />
                                    Generate Token for this Browser
                                </Button>
                                
                                <div className="space-y-2">
                                    <Label>FCM Device Token</Label>
                                    <Input 
                                        placeholder="epD0x... (paste or auto-generate token)" 
                                        value={manualToken}
                                        onChange={e => setManualToken(e.target.value)}
                                        disabled={actionLoading}
                                    />
                                </div>
                                <Button 
                                    onClick={handleUpdateToken} 
                                    disabled={actionLoading || !manualToken}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    Force Update User Token
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Incoming Foreground Push Popup */}
                {incomingPush && (
                    <div className="fixed bottom-4 right-4 max-w-sm bg-white p-4 rounded-xl shadow-2xl border-l-4 border-green-500 z-50 animate-in slide-in-from-bottom-5">
                        <div className="flex items-center gap-2 text-green-700 font-bold mb-1">
                            <Bell className="h-5 w-5" />
                            New Push Received!
                        </div>
                        <h4 className="font-semibold text-gray-900">{incomingPush?.notification?.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{incomingPush?.notification?.body}</p>
                        <div className="text-xs bg-gray-100 p-2 rounded text-gray-500 font-mono break-all">
                            {JSON.stringify(incomingPush?.data)}
                        </div>
                    </div>
                )}

                {/* RIGHT COL: Send Push Form */}
                <div>
                    <Card className={`sticky top-24 shadow-sm border-gray-100 ${(!selectedUser || !selectedUser.device_token) ? 'opacity-60 border-orange-200' : 'border-gray-200'}`}>
                        <CardHeader className="bg-gray-50/50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Send className="h-5 w-5 text-green-600" />
                                3. Configure & Send Push
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {!selectedUser ? (
                                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                    Select a user from the left panel first.
                                </div>
                            ) : !selectedUser.device_token ? (
                                <div className="p-6 mb-6 text-center text-orange-700 bg-orange-50 rounded-lg border border-orange-100">
                                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                                    This user does not have a <b>device_token</b> yet. You must inject a token manually on the left before you can send them a push notification.
                                </div>
                            ) : null}

                            <div className={`space-y-5 ${(!selectedUser || !selectedUser.device_token) ? 'pointer-events-none opacity-50' : ''}`}>
                                <div className="p-3 bg-gray-50 rounded-lg text-sm mb-2">
                                    Sending to: <span className="font-semibold">{selectedUser?.full_name}</span> ({selectedUser?.mobile})
                                </div>

                                <div className="space-y-2">
                                    <Label>Notification Title</Label>
                                    <Input 
                                        value={pushForm.title}
                                        onChange={e => setPushForm(prev => ({...prev, title: e.target.value}))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Notification Body / Message</Label>
                                    <Textarea 
                                        rows={4}
                                        value={pushForm.message}
                                        onChange={e => setPushForm(prev => ({...prev, message: e.target.value}))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Category (Deep Link Target)</Label>
                                    <select 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={pushForm.category}
                                        onChange={e => setPushForm(prev => ({...prev, category: e.target.value}))}
                                    >
                                        <option value="system">System (General)</option>
                                        <option value="event">Event Registration</option>
                                        <option value="store">Store Order</option>
                                        <option value="ride">Ride Status</option>
                                        <option value="wallet">Wallet Update</option>
                                    </select>
                                </div>

                                <Button 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                                    size="lg"
                                    onClick={handleSendPush}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Sending...' : 'Send Push Notification 🚀'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
