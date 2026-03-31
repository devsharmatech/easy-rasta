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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, MapPin, RefreshCw, Eye, CheckCircle2, Ban, ShieldCheck, CreditCard, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function SponsorshipsPage() {
    const [claims, setClaims] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [detailItem, setDetailItem] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [adminNote, setAdminNote] = useState('')

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/sponsorships', { headers })
            if (res.ok) setClaims(await res.json())
        } catch (e) {
            console.error(e)
            toast.error('Failed to load sponsorships')
        } finally {
            setLoading(false)
        }
    }

    const filtered = claims.filter(item => {
        const scoutName = item.rider?.full_name?.toLowerCase() || ''
        const matchSearch = scoutName.includes(searchTerm.toLowerCase()) || item.tier?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchStatus = statusFilter === 'all' || item.status === statusFilter
        return matchSearch && matchStatus
    })

    const totalClaims = claims.length
    const pendingClaims = claims.filter(c => c.status === 'pending').length
    const approvedClaims = claims.filter(c => c.status === 'approved').length
    const flaggedClaims = claims.filter(c => c.status === 'flagged').length

    const handleAction = async (claim, action) => {
        if (!confirm(`Are you sure you want to ${action} this sponsorship claim? ${action === 'approve' ? 'This will instantly transfer ₹' + (claim.amount_paise/100) + ' to their wallet.' : ''}`)) return
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/sponsorships', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ claim_id: claim.id, action, admin_note: adminNote })
            })
            if (!res.ok) throw new Error()
            toast.success(`Claim ${action === 'approve' ? 'approved and rewarded' : 'rejected'} successfully`)
            setAdminNote('')
            fetchData()
            setDetailItem(null)
        } catch {
            toast.error(`Failed to ${action} claim`)
        } finally {
            setActionLoading(false)
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Sponsorship Claims</h2>
                    <p className="text-muted-foreground">Manage and payout monthly rider event sponsorship rewards.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><CreditCard className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalClaims}</p><p className="text-xs text-muted-foreground">Total Claims</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Clock className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{pendingClaims}</p><p className="text-xs text-muted-foreground">Pending Approval</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{approvedClaims}</p><p className="text-xs text-muted-foreground">Approved & Paid</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{flaggedClaims}</p><p className="text-xs text-muted-foreground">Flagged (GPS)</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search user name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Submissions</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="flagged">Flagged</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-semibold">Bill</TableHead>
                                <TableHead className="font-semibold">Rider Details</TableHead>
                                <TableHead className="font-semibold">Sponsorship Month & Tier</TableHead>
                                <TableHead className="font-semibold">Check-ins</TableHead>
                                <TableHead className="font-semibold">Amount (₹)</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((item) => (
                                <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell>
                                        <div className="h-12 w-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer" onClick={() => setDetailItem(item)}>
                                            {item.bill_url ? (
                                                <Image src={item.bill_url} alt="Bill photo" width={48} height={48} className="object-cover h-full w-full" />
                                            ) : (
                                                <CreditCard className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{item.rider?.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground">{item.rider?.mobile || '-'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-semibold">{item.claim_month}</p>
                                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 border rounded text-[10px] font-bold uppercase ${
                                            item.tier === 'tier3' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                            item.tier === 'tier2' ? 'bg-zinc-100 text-zinc-700 border-zinc-200' : 
                                            'bg-orange-50 text-orange-700 border-orange-200'
                                        }`}>{item.tier} (Gold/Silver/Bronze)</span>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-bold text-gray-700">{item.check_in_count}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">Verified GPS</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-base font-bold text-green-700">₹{item.amount_paise / 100}</p>
                                    </TableCell>
                                    <TableCell>
                                        {item.status === 'pending' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">Review Pending</span>}
                                        {item.status === 'flagged' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center gap-1 w-fit"><AlertTriangle className="h-3 w-3" /> Flagged</span>}
                                        {item.status === 'approved' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">Paid Out</span>}
                                        {item.status === 'rejected' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">Rejected</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => {setDetailItem(item); setAdminNote(item.admin_note || '');}} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <CreditCard className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No sponsorship claims found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!detailItem} onOpenChange={(open) => { if(!open) setDetailItem(null) }}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" /> Verify Sponsorship Claim
                        </DialogTitle>
                    </DialogHeader>
                    {detailItem && (
                        <div className="space-y-4">
                            
                            {detailItem.bill_url && (
                                <div className="w-full h-80 bg-gray-100 rounded-lg overflow-hidden relative">
                                    <Image src={detailItem.bill_url} alt="Bill photo" fill className="object-contain" />
                                    <a href={detailItem.bill_url} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">Open Full Page</a>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Rider</p>
                                    <p className="font-semibold">{detailItem.rider?.full_name}</p>
                                    <p className="text-xs text-gray-500">{detailItem.rider?.mobile}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Tier Level</p>
                                        <p className="font-bold uppercase text-sm">{detailItem.tier}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Check-ins</p>
                                        <p className="font-bold text-gray-700">{detailItem.check_in_count}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                        detailItem.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        detailItem.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        detailItem.status === 'flagged' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {detailItem.status === 'pending' ? 'Pending Review' : detailItem.status}
                                    </span>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                    <p className="text-xs text-green-700/70 mb-1 font-semibold">Payout Amount</p>
                                    <p className="font-bold text-xl text-green-700">₹{detailItem.amount_paise / 100}</p>
                                </div>
                                
                                {detailItem.status === 'flagged' && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 col-span-2 text-sm text-red-800 flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <p><strong>Fraud Alert:</strong> System detected suspicious clustering (multiple claims submitted unusually close to this rider's GPS location). Please scrutinize the bill heavily before approving.</p>
                                    </div>
                                )}

                            </div>
                            
                            {(detailItem.status === 'pending' || detailItem.status === 'flagged') ? (
                                <div className="space-y-2 mt-4">
                                    <Label>Admin Review Note (Optional)</Label>
                                    <Textarea 
                                        placeholder="Reason for rejection or approval note..." 
                                        value={adminNote} 
                                        onChange={(e) => setAdminNote(e.target.value)}
                                    />
                                </div>
                            ) : (
                                detailItem.admin_note && (
                                    <div className="bg-gray-50 p-3 rounded-lg mt-4 border border-gray-100">
                                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Admin Note</p>
                                        <p className="text-sm font-medium">{detailItem.admin_note}</p>
                                    </div>
                                )
                            )}

                            <DialogFooter className="mt-6 flex sm:justify-between w-full">
                                {['pending', 'flagged'].includes(detailItem.status) ? (
                                    <>
                                        <Button variant="destructive" onClick={() => handleAction(detailItem, 'reject')} disabled={actionLoading} className="gap-2">
                                            <Ban className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Reject Bill'}
                                        </Button>
                                        <Button onClick={() => handleAction(detailItem, 'approve')} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 gap-2 font-bold px-6">
                                            <CreditCard className="h-4 w-4" /> {actionLoading ? 'Transferring ₹...' : `Approve Payout (₹${detailItem.amount_paise/100})`}
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" onClick={() => setDetailItem(null)} className="w-full">Close window</Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
