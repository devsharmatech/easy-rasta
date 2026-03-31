'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AlertCircle, AlertTriangle, ShieldAlert, RefreshCw, Eye, CheckCircle2, UserX, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function FraudFlagsPage() {
    const [flags, setFlags] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [severityFilter, setSeverityFilter] = useState('all')
    const [detailFlag, setDetailFlag] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/fraud-flags', { headers })
            if (res.ok) setFlags(await res.json())
        } catch (e) {
            console.error(e)
            toast.error('Failed to load fraud flags')
        } finally {
            setLoading(false)
        }
    }

    const filtered = flags.filter(flag => {
        const userName = flag.user?.full_name?.toLowerCase() || ''
        const typeMatch = flag.flag_type?.toLowerCase().includes(searchTerm.toLowerCase())
        const userMatch = userName.includes(searchTerm.toLowerCase())
        const severityMatch = severityFilter === 'all' || flag.severity === severityFilter
        return (typeMatch || userMatch) && severityMatch
    })

    const totalFlags = flags.length
    const criticalFlags = flags.filter(f => f.severity === 'critical' && !f.resolved).length
    const warningFlags = flags.filter(f => (f.severity === 'high' || f.severity === 'medium') && !f.resolved).length
    const resolvedFlags = flags.filter(f => f.resolved).length

    const handleAction = async (flag, action) => {
        if (!confirm(`Are you sure you want to ${action} this fraud alert? ${action === 'penalize' ? 'This user will be BLOCKED from participation immediately.' : ''}`)) return
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/fraud-flags', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ flag_id: flag.id, action })
            })
            if (!res.ok) throw new Error()
            toast.success(`Flag ${action === 'resolve' ? 'dismissed' : 'account restricted'} successfully`)
            fetchData()
            setDetailFlag(null)
        } catch {
            toast.error(`Failed to execute ${action}`)
        } finally {
            setActionLoading(false)
        }
    }

    const getSeverityColor = (sev) => {
        switch(sev) {
            case 'critical': return 'text-red-700 bg-red-100 border-red-200'
            case 'high': return 'text-orange-700 bg-orange-100 border-orange-200'
            case 'medium': return 'text-amber-700 bg-amber-100 border-amber-200'
            default: return 'text-blue-700 bg-blue-100 border-blue-200'
        }
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Fraud Flags</h2>
                    <p className="text-muted-foreground">Manage and resolve system-generated alerts about suspicious activity.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><AlertCircle className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalFlags}</p><p className="text-xs text-muted-foreground">Total Alerts</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><ShieldAlert className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{criticalFlags}</p><p className="text-xs text-muted-foreground">Critical Flags</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{warningFlags}</p><p className="text-xs text-muted-foreground">High/Med Priority</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{resolvedFlags}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[300px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search flag type or user name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-semibold">User</TableHead>
                                <TableHead className="font-semibold">Type</TableHead>
                                <TableHead className="font-semibold">Severity</TableHead>
                                <TableHead className="font-semibold">Details Snapshot</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Alerted At</TableHead>
                                <TableHead className="font-semibold text-right">Review</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((flag) => (
                                <TableRow key={flag.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell>
                                        <p className="font-medium text-sm">{flag.user?.full_name || 'System'}</p>
                                        <p className="text-xs text-muted-foreground">{flag.user?.mobile || '-'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-bold uppercase tracking-wider">{flag.flag_type}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getSeverityColor(flag.severity)}`}>
                                            {flag.severity}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs text-gray-500 max-w-[200px] truncate">{JSON.stringify(flag.details)}</p>
                                    </TableCell>
                                    <TableCell>
                                        {flag.resolved ? (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">Resolved</span>
                                        ) : (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Open Alert</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{formatDate(flag.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setDetailFlag(flag)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <ShieldAlert className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No system flags detected</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!detailFlag} onOpenChange={() => setDetailFlag(null)}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-600" /> System Fraud Alert
                        </DialogTitle>
                    </DialogHeader>
                    {detailFlag && (
                        <div className="space-y-4">
                            
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-red-900 uppercase text-xs tracking-widest">{detailFlag.flag_type} Alert Detected</p>
                                    <p className="text-sm text-red-800 font-medium">The system has flagged this rider for potential abuse regarding {detailFlag.flag_type.replace('_', ' ')}.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Rider</p>
                                    <p className="font-semibold">{detailFlag.user?.full_name}</p>
                                    <p className="text-xs text-gray-500">{detailFlag.user?.mobile}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Severity / Impact</p>
                                    <p className="font-bold uppercase tracking-wider text-sm">{detailFlag.severity}</p>
                                </div>
                                <div className="bg-gray-100 rounded-lg p-4 col-span-2">
                                    <p className="text-xs font-bold uppercase text-gray-500 mb-2">Technical Evidence</p>
                                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-gray-700 bg-white p-3 border rounded overflow-hidden">
                                        {JSON.stringify(detailFlag.details, null, 4)}
                                    </pre>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 col-span-2">
                                    <p className="text-xs font-bold uppercase text-blue-700 mb-1">System Recommendation</p>
                                    <p className="text-sm text-blue-800">
                                        {detailFlag.flag_type === 'gps_mismatch' ? 'Scrutinize the location check. If coordinates are too far from the bunk, penalize.' : 
                                         detailFlag.flag_type === 'duplicate_photo' ? 'Reject the report and deduct the reward. If repeated, block the user.' : 
                                         'Review the provided details before taking action.'}
                                    </p>
                                </div>
                            </div>

                            <DialogFooter className="mt-8 flex sm:justify-between w-full">
                                {!detailFlag.resolved ? (
                                    <>
                                        <Button variant="outline" onClick={() => handleAction(detailFlag, 'resolve')} disabled={actionLoading} className="gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-200">
                                            <CheckCircle2 className="h-4 w-4" /> Dismiss False Alert
                                        </Button>
                                        <Button variant="destructive" onClick={() => handleAction(detailFlag, 'penalize')} disabled={actionLoading} className="gap-2">
                                            <UserX className="h-4 w-4" /> {actionLoading ? 'Restricting...' : 'Restrict Account'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" onClick={() => setDetailFlag(null)} className="w-full">Close window</Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
