'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, CheckCircle, XCircle, Search, Calendar, MapPin, Droplet, Wrench, FileText } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function ExpensesAdminPage() {
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState([])
    const [actionLoading, setActionLoading] = useState(false)

    // Filters
    const [filterType, setFilterType] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [searchName, setSearchName] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Modal
    const [viewExpense, setViewExpense] = useState(null)

    useEffect(() => {
        fetchExpenses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, filterType, filterStatus, searchName])

    const fetchExpenses = async () => {
        setLoading(true)
        const params = new URLSearchParams({ page })
        if (filterType !== 'all') params.append('type', filterType)
        if (filterStatus !== 'all') params.append('status', filterStatus)
        if (searchName) params.append('rider_name', searchName)

        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch(`/api/admin/expenses?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status) {
                setExpenses(data.data.data)
                setTotalPages(data.data.pagination.total_pages || 1)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error("Error fetching expenses")
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (ids, action) => {
        if (!ids.length) return
        setActionLoading(true)
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/expenses/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ expense_ids: ids, action })
            })
            const data = await res.json()
            if (data.status) {
                toast.success(data.message)
                setSelectedIds([])
                fetchExpenses()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error("Error processing action")
        } finally {
            setActionLoading(false)
        }
    }

    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(expenses.filter(e => e.status === 'pending').map(e => e.id))
        } else {
            setSelectedIds([])
        }
    }

    const toggleSelect = (id, checked) => {
        if (checked) {
            setSelectedIds([...selectedIds, id])
        } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id))
        }
    }

    const renderTypeIcon = (type) => {
        switch (type) {
            case 'fuel': return <Droplet className="w-4 h-4 text-orange-500" />
            case 'service': return <Wrench className="w-4 h-4 text-blue-500" />
            case 'washroom': return <MapPin className="w-4 h-4 text-green-500" />
            default: return <FileText className="w-4 h-4 text-gray-500" />
        }
    }

    const statusBadge = (status) => {
        switch (status) {
            case 'approved': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Approved</Badge>
            case 'rejected': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Rejected</Badge>
            default: return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Pending</Badge>
        }
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-100">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-gray-800">Expense Management</CardTitle>
                    <p className="text-sm text-gray-500">Review, approve, and process cashback for rider expenses</p>
                </div>
                {selectedIds.length > 0 && (
                    <div className="flex gap-2 mt-4 md:mt-0">
                        <Button
                            variant="outline"
                            className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                            onClick={() => handleAction(selectedIds, 'approve')}
                            disabled={actionLoading}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Selected ({selectedIds.length})
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            onClick={() => handleAction(selectedIds, 'reject')}
                            disabled={actionLoading}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Selected ({selectedIds.length})
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-0">

                {/* Filters */}
                <div className="p-4 flex flex-col md:flex-row gap-3 bg-gray-50/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search rider name..."
                            className="pl-9 bg-white"
                            value={searchName}
                            onChange={(e) => { setSearchName(e.target.value); setPage(1); }}
                        />
                    </div>
                    <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
                        <SelectTrigger className="w-full md:w-[150px] bg-white">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="fuel">Fuel</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="washroom">Washroom</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                        <SelectTrigger className="w-full md:w-[150px] bg-white">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50/80">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={expenses.length > 0 && selectedIds.length === expenses.filter(e => e.status === 'pending').length && expenses.filter(e => e.status === 'pending').length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Rider</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount (₹)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Loading expenses...</TableCell>
                                </TableRow>
                            ) : expenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">No expenses found matching the criteria.</TableCell>
                                </TableRow>
                            ) : (
                                expenses.map(expense => (
                                    <TableRow key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell>
                                            <Checkbox
                                                disabled={expense.status !== 'pending'}
                                                checked={selectedIds.includes(expense.id)}
                                                onCheckedChange={(c) => toggleSelect(expense.id, c)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {new Date(expense.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(expense.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-800">{expense.rider_name}</span>
                                                <span className="text-xs text-gray-500">{expense.rider_mobile}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-gray-100 rounded-md">
                                                    {renderTypeIcon(expense.type)}
                                                </div>
                                                <span className="text-sm capitalize text-gray-700">{expense.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-gray-900">₹{expense.amount}</span>
                                        </TableCell>
                                        <TableCell>
                                            {statusBadge(expense.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setViewExpense(expense)} className="h-8 w-8 p-0">
                                                    <Eye className="h-4 w-4 text-gray-500" />
                                                </Button>
                                                {expense.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleAction([expense.id], 'approve')}
                                                            className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600"
                                                        >
                                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleAction([expense.id], 'reject')}
                                                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* View Modal */}
            <Dialog open={!!viewExpense} onOpenChange={(open) => !open && setViewExpense(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto w-[95vw] p-4 md:p-6">
                    <DialogHeader>
                        <DialogTitle className="capitalize text-lg md:text-xl font-bold">{viewExpense?.type} Expense Details</DialogTitle>
                    </DialogHeader>
                    {viewExpense && (
                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm text-gray-500">Status</span>
                                {statusBadge(viewExpense.status)}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Amount</p>
                                    <p className="font-bold text-lg text-gray-900">₹{viewExpense.amount}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Date</p>
                                    <p className="text-sm font-medium">{new Date(viewExpense.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            {viewExpense.type === 'fuel' && (
                                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase">Fuel Type</p>
                                        <p className="text-sm font-semibold capitalize">{viewExpense.fuel_type}</p>
                                    </div>
                                    <div className="text-center border-l border-gray-200">
                                        <p className="text-[10px] text-gray-500 uppercase">Qty (L)</p>
                                        <p className="text-sm font-semibold capitalize">{viewExpense.quantity}</p>
                                    </div>
                                    <div className="text-center border-l border-gray-200">
                                        <p className="text-[10px] text-gray-500 uppercase">Per Liter</p>
                                        <p className="text-sm font-semibold capitalize">₹{viewExpense.price_per_liter}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Rider Information</p>
                                <p className="text-sm font-medium">{viewExpense.rider_name}</p>
                                <p className="text-xs text-gray-500">{viewExpense.rider_mobile}</p>
                            </div>

                            {viewExpense.vehicle_details && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Vehicle Details</p>
                                    <p className="text-sm font-medium text-gray-800 bg-gray-50 p-3 rounded-md border border-gray-100">{viewExpense.vehicle_details}</p>
                                </div>
                            )}

                            {viewExpense.description && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Description</p>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100">{viewExpense.description}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Location</p>
                                <a
                                    href={`https://maps.google.com/?q=${viewExpense.latitude},${viewExpense.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    <MapPin className="w-4 h-4" />
                                    View on Google Maps
                                </a>
                            </div>

                            {viewExpense.image && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Receipt / Proof</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <a href={viewExpense.image} target="_blank" rel="noreferrer">
                                        <img
                                            src={viewExpense.image}
                                            alt="Receipt"
                                            className="w-full h-auto max-h-[300px] object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                        />
                                    </a>
                                </div>
                            )}

                            {viewExpense.status === 'pending' && (
                                <div className="flex gap-3 pt-4 border-t mt-4">
                                    <Button
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                        onClick={() => {
                                            handleAction([viewExpense.id], 'approve');
                                            setViewExpense(null);
                                        }}
                                        disabled={actionLoading}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        variant="destructive"
                                        onClick={() => {
                                            handleAction([viewExpense.id], 'reject');
                                            setViewExpense(null);
                                        }}
                                        disabled={actionLoading}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
