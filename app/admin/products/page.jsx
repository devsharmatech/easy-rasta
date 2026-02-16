'use client'

import { useState, useEffect } from 'react'
import {
    Plus, Search, Edit, Trash2, Package, MoreVertical, AlertCircle, Eye,
    TrendingUp, DollarSign, BarChart3, Loader2, RefreshCw, X,
    ShoppingCart, Users, Clock, ArrowUpDown, Boxes, ChevronDown,
    CheckCircle, XCircle, ToggleLeft, ToggleRight, IndianRupee
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import ImageUpload from '@/components/admin/ImageUpload'

export default function ProductsPage() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [stockFilter, setStockFilter] = useState('all')
    const [selected, setSelected] = useState(new Set())

    // Dialogs
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [currentProduct, setCurrentProduct] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Detail view
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailProduct, setDetailProduct] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')

    // Actions
    const [deletingId, setDeletingId] = useState(null)
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const [formData, setFormData] = useState({ name: '', description: '', price: '', stock: '', image_url: '' })

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchProducts() }, [])

    const fetchProducts = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const res = await fetch('/api/admin/products', { headers })
            if (!res.ok) throw new Error()
            setProducts(await res.json())
        } catch { toast.error("Failed to load products") }
        finally { setLoading(false); setRefreshing(false) }
    }

    const fetchDetailProduct = async (productId) => {
        setDetailOpen(true)
        setDetailLoading(true)
        setDetailProduct(null)
        setActiveTab('overview')
        try {
            const res = await fetch(`/api/admin/products?id=${productId}`, { headers })
            if (!res.ok) throw new Error()
            setDetailProduct(await res.json())
        } catch { toast.error("Failed to load product details") }
        finally { setDetailLoading(false) }
    }

    // Form
    const handleOpenDialog = (product = null) => {
        if (product) {
            setCurrentProduct(product)
            setFormData({
                name: product.name, description: product.description || '', price: product.price,
                stock: product.stock || 0, image_url: product.image_url || '',
            })
        } else {
            setCurrentProduct(null)
            setFormData({ name: '', description: '', price: '', stock: '0', image_url: '' })
        }
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const url = currentProduct ? `/api/admin/products/${currentProduct.id}` : '/api/admin/products'
            const method = currentProduct ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers, body: JSON.stringify(formData) })
            if (!res.ok) throw new Error()
            toast.success(`Product ${currentProduct ? 'updated' : 'created'} successfully`)
            setIsDialogOpen(false)
            fetchProducts()
            if (detailProduct?.id === currentProduct?.id) fetchDetailProduct(currentProduct.id)
        } catch { toast.error("Failed to save product") }
        finally { setIsSubmitting(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return
        setDeletingId(id)
        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success("Product deleted")
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
            if (detailProduct?.id === id) { setDetailOpen(false); setDetailProduct(null) }
            fetchProducts()
        } catch { toast.error("Failed to delete") }
        finally { setDeletingId(null) }
    }

    const handleBulkDelete = async () => {
        if (selected.size === 0) return
        if (!confirm(`Delete ${selected.size} product(s)?`)) return
        setBulkDeleting(true)
        try {
            const ids = Array.from(selected).join(',')
            const res = await fetch(`/api/admin/products?ids=${ids}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success(`${selected.size} products deleted`)
            setSelected(new Set())
            fetchProducts()
        } catch { toast.error("Failed to delete") }
        finally { setBulkDeleting(false) }
    }

    const handleToggleActive = async (product) => {
        try {
            const res = await fetch(`/api/admin/products/${product.id}`, {
                method: 'PUT', headers,
                body: JSON.stringify({ ...product, is_active: !product.is_active })
            })
            if (!res.ok) throw new Error()
            toast.success(`Product ${!product.is_active ? 'activated' : 'deactivated'}`)
            fetchProducts()
            if (detailProduct?.id === product.id) fetchDetailProduct(product.id)
        } catch { toast.error("Failed to update status") }
    }

    // Filtering
    const filtered = products.filter(p => {
        const term = searchTerm.toLowerCase()
        const matchSearch = p.name?.toLowerCase().includes(term) || p.description?.toLowerCase()?.includes(term)
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.is_active : !p.is_active)
        const matchStock = stockFilter === 'all' ||
            (stockFilter === 'instock' ? p.remaining_stock > 0 : stockFilter === 'low' ? (p.remaining_stock > 0 && p.remaining_stock <= 5) : p.remaining_stock <= 0)
        return matchSearch && matchStatus && matchStock
    })

    // Selection
    const toggleSelect = (id) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n) }
    const toggleAll = () => { setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id))) }

    // Stats
    const totalProducts = products.length
    const totalSold = products.reduce((a, b) => a + (b.total_sold || 0), 0)
    const totalRevenue = products.reduce((a, b) => a + (b.total_revenue || 0), 0)
    const lowStockCount = products.filter(p => (p.remaining_stock || 0) <= 5 && p.is_active).length

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const formatDateTime = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}</div>
            <Card className="border-0 shadow-sm"><CardContent className="py-20"><div className="h-8 bg-gray-100 rounded animate-pulse max-w-md mx-auto" /></CardContent></Card>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Product Inventory</h2>
                    <p className="text-muted-foreground">Manage products, track inventory, and analyze sales</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchProducts(true)} disabled={refreshing} className="gap-2">
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                    </Button>
                    <Button onClick={() => handleOpenDialog()} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                        <Plus className="h-4 w-4" /> Add Product
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Products', value: totalProducts, icon: Package, gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600' },
                    { label: 'Units Sold', value: totalSold.toLocaleString(), icon: ShoppingCart, gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'Low Stock', value: lowStockCount, icon: AlertCircle, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-600' },
                ].map((card, i) => (
                    <Card key={i} className="border-0 shadow-sm overflow-hidden">
                        <div className={`h-1 bg-gradient-to-r ${card.gradient}`} />
                        <CardContent className="pt-5 pb-4 px-5">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.bg} ${card.text}`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{card.value}</p>
                                    <p className="text-xs text-muted-foreground">{card.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stock" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stock</SelectItem>
                        <SelectItem value="instock">In Stock</SelectItem>
                        <SelectItem value="low">Low Stock</SelectItem>
                        <SelectItem value="outofstock">Out of Stock</SelectItem>
                    </SelectContent>
                </Select>
                {selected.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-2">
                        {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete {selected.size}
                    </Button>
                )}
            </div>

            {/* ===== MOBILE CARD VIEW (below lg) ===== */}
            <div className="lg:hidden space-y-3">
                {filtered.length > 0 ? filtered.map((product) => {
                    const remaining = product.remaining_stock ?? (product.stock || 0)
                    const stockLevel = remaining <= 0 ? 'out' : remaining <= 5 ? 'low' : 'ok'
                    return (
                        <Card key={product.id} className={`border shadow-sm overflow-hidden ${!product.is_active ? 'opacity-60' : ''} ${selected.has(product.id) ? 'ring-2 ring-orange-300' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} className="mt-1 h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                    <div className="h-16 w-16 rounded-lg bg-gray-100 border flex items-center justify-center overflow-hidden flex-shrink-0" onClick={() => fetchDetailProduct(product.id)}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Package className="h-6 w-6 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0" onClick={() => fetchDetailProduct(product.id)}>
                                        <p className="font-semibold text-sm truncate">{product.name}</p>
                                        <p className="text-lg font-bold text-orange-600">₹{Number(product.price).toLocaleString()}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">Stock: {product.stock || 0}</span>
                                            <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                                <ShoppingCart className="h-2.5 w-2.5" /> {product.total_sold || 0} sold
                                            </span>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${stockLevel === 'out' ? 'bg-red-50 text-red-700 border-red-200' : stockLevel === 'low' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                {remaining} left
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${product.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {product.is_active ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                            {product.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-xs font-medium text-muted-foreground">₹{(product.total_revenue || 0).toLocaleString()} rev</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => fetchDetailProduct(product.id)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(product)} className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                            {deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                }) : (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="text-center py-16 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                            <p className="font-medium">No products found</p>
                            <p className="text-xs mt-1">Try adjusting your filters or add a new product</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ===== DESKTOP TABLE VIEW (lg and above) ===== */}
            <Card className="border-0 shadow-sm hidden lg:block">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[40px]">
                                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                </TableHead>
                                <TableHead className="font-semibold">Product</TableHead>
                                <TableHead className="font-semibold">Price</TableHead>
                                <TableHead className="font-semibold">Stock</TableHead>
                                <TableHead className="font-semibold">Sold</TableHead>
                                <TableHead className="font-semibold">Remaining</TableHead>
                                <TableHead className="font-semibold">Revenue</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((product) => {
                                const remaining = product.remaining_stock ?? (product.stock || 0)
                                const stockLevel = remaining <= 0 ? 'out' : remaining <= 5 ? 'low' : 'ok'
                                return (
                                    <TableRow key={product.id} className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selected.has(product.id) ? 'bg-blue-50/30' : ''} ${!product.is_active ? 'opacity-60' : ''}`}>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                        </TableCell>
                                        <TableCell onClick={() => fetchDetailProduct(product.id)}>
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-10 w-10 rounded-lg bg-gray-100 border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-gray-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{product.name}</p>
                                                    {product.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{product.description}</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchDetailProduct(product.id)}>
                                            <span className="font-semibold text-orange-600">₹{Number(product.price).toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchDetailProduct(product.id)}>
                                            <span className="text-sm">{product.stock || 0}</span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchDetailProduct(product.id)}>
                                            <div className="flex items-center gap-1.5">
                                                <ShoppingCart className="h-3.5 w-3.5 text-green-500" />
                                                <span className="text-sm font-medium text-green-700">{product.total_sold || 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchDetailProduct(product.id)}>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${stockLevel === 'out' ? 'bg-red-50 text-red-700 border-red-200' : stockLevel === 'low' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                {remaining} left
                                            </span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchDetailProduct(product.id)}>
                                            <span className="text-sm font-medium">₹{(product.total_revenue || 0).toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchDetailProduct(product.id)}>
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${product.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {product.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                {product.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => fetchDetailProduct(product.id)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(product)} className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                                    {deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                                        <Package className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No products found</p>
                                        <p className="text-xs mt-1">Try adjusting your filters or add a new product</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ========== ADD/EDIT PRODUCT DIALOG ========== */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto z-[60]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-orange-600" />
                            {currentProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                        <DialogDescription>Enter the details of the product below.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (₹)</Label>
                                <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stock">Initial Stock</Label>
                                <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <ImageUpload value={formData.image_url} onChange={(url) => setFormData({ ...formData, image_url: url })} aspectRatio={1} folder="products" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : 'Save Product'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========== PRODUCT DETAIL DIALOG ========== */}
            <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetailProduct(null) }}>
                <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Package className="h-5 w-5 text-orange-600" />
                            {detailLoading ? 'Loading Product...' : (detailProduct?.name || 'Product Details')}
                        </DialogTitle>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="py-16 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                            <div className="text-center">
                                <p className="font-medium text-gray-700">Fetching product details</p>
                                <p className="text-sm text-muted-foreground mt-1">Loading inventory, sales, and buyer data...</p>
                            </div>
                        </div>
                    ) : detailProduct && (
                        <div className="space-y-5">
                            {/* Product Header - responsive */}
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-xl bg-gray-100 border overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                                    {detailProduct.image_url ? (
                                        <img src={detailProduct.image_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <Package className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${detailProduct.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {detailProduct.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">ID: {detailProduct.id?.substring(0, 8)}...</span>
                                    </div>
                                    <h3 className="text-xl font-bold">{detailProduct.name}</h3>
                                    <p className="text-2xl font-bold text-orange-600 mt-1">₹{Number(detailProduct.price).toLocaleString()}</p>
                                    {detailProduct.description && (
                                        <p className="text-sm text-muted-foreground mt-2">{detailProduct.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Inventory Stats - responsive */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {[
                                    { label: 'Initial Stock', value: detailProduct.inventory?.initial_stock ?? detailProduct.stock ?? 0, icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50' },
                                    { label: 'Total Sold', value: detailProduct.inventory?.total_sold ?? 0, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
                                    { label: 'Remaining', value: detailProduct.inventory?.remaining ?? detailProduct.stock ?? 0, icon: Package, color: detailProduct.inventory?.remaining <= 5 ? 'text-red-600' : 'text-emerald-600', bg: detailProduct.inventory?.remaining <= 5 ? 'bg-red-50' : 'bg-emerald-50' },
                                    { label: 'Revenue', value: `₹${(detailProduct.inventory?.total_revenue ?? 0).toLocaleString()}`, icon: IndianRupee, color: 'text-orange-600', bg: 'bg-orange-50' },
                                    { label: 'Orders', value: detailProduct.inventory?.total_orders ?? 0, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
                                ].map((card, i) => (
                                    <div key={i} className={`rounded-xl p-3 ${card.bg}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{card.label}</span>
                                        </div>
                                        <p className={`text-lg sm:text-xl font-bold ${card.color}`}>{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Stock progress bar */}
                            {detailProduct.inventory && detailProduct.inventory.initial_stock > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="font-medium">Stock Utilization</span>
                                        <span className="text-muted-foreground">
                                            {detailProduct.inventory.total_sold} / {detailProduct.inventory.initial_stock} sold
                                            ({Math.round((detailProduct.inventory.total_sold / detailProduct.inventory.initial_stock) * 100)}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (detailProduct.inventory.total_sold / detailProduct.inventory.initial_stock) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tab Navigation - responsive */}
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                                {[
                                    { key: 'overview', label: 'Purchase History', shortLabel: 'History', icon: ShoppingCart },
                                    { key: 'buyers', label: `Buyers (${detailProduct.buyers?.length || 0})`, shortLabel: 'Buyers', icon: Users },
                                    { key: 'logs', label: `Activity Log (${detailProduct.logs?.length || 0})`, shortLabel: 'Logs', icon: Clock },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <tab.icon className="h-4 w-4" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        <span className="sm:hidden">{tab.shortLabel}</span>
                                    </button>
                                ))}
                            </div>

                            {/* PURCHASE HISTORY TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-2">
                                    {detailProduct.order_items?.length > 0 ? (
                                        <>
                                            {/* Desktop table */}
                                            <div className="border rounded-xl overflow-hidden hidden sm:block">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gray-50/50">
                                                            <TableHead className="text-xs font-semibold">Buyer</TableHead>
                                                            <TableHead className="text-xs font-semibold">Order Status</TableHead>
                                                            <TableHead className="text-xs font-semibold">Payment</TableHead>
                                                            <TableHead className="text-xs font-semibold">Qty</TableHead>
                                                            <TableHead className="text-xs font-semibold">Price</TableHead>
                                                            <TableHead className="text-xs font-semibold">Total</TableHead>
                                                            <TableHead className="text-xs font-semibold">Date</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {detailProduct.order_items.map((item) => {
                                                            const buyer = item.orders?.rider_profiles?.users
                                                            return (
                                                                <TableRow key={item.id} className="text-sm">
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <Avatar className="h-6 w-6">
                                                                                <AvatarImage src={buyer?.profile_image_url || ''} />
                                                                                <AvatarFallback className="text-[8px] bg-gray-100">{buyer?.full_name?.substring(0, 2)?.toUpperCase() || '??'}</AvatarFallback>
                                                                            </Avatar>
                                                                            <div>
                                                                                <p className="text-xs font-medium">{buyer?.full_name || 'Unknown'}</p>
                                                                                {buyer?.mobile && <p className="text-[10px] text-muted-foreground">{buyer.mobile}</p>}
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${item.orders?.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                            item.orders?.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                                'bg-blue-50 text-blue-700 border-blue-200'
                                                                            }`}>
                                                                            {item.orders?.status || '-'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${item.orders?.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                                            }`}>
                                                                            {item.orders?.payment_status || '-'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="font-medium">{item.quantity}</TableCell>
                                                                    <TableCell>₹{Number(item.price).toLocaleString()}</TableCell>
                                                                    <TableCell className="font-semibold text-green-700">₹{Number(item.total).toLocaleString()}</TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            {/* Mobile cards */}
                                            <div className="sm:hidden space-y-2">
                                                {detailProduct.order_items.map((item) => {
                                                    const buyer = item.orders?.rider_profiles?.users
                                                    return (
                                                        <div key={item.id} className="border rounded-lg p-3 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-6 w-6">
                                                                        <AvatarImage src={buyer?.profile_image_url || ''} />
                                                                        <AvatarFallback className="text-[8px] bg-gray-100">{buyer?.full_name?.substring(0, 2)?.toUpperCase() || '??'}</AvatarFallback>
                                                                    </Avatar>
                                                                    <p className="text-xs font-medium">{buyer?.full_name || 'Unknown'}</p>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${item.orders?.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' : item.orders?.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                                    {item.orders?.status || '-'}
                                                                </span>
                                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${item.orders?.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                    {item.orders?.payment_status || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span>Qty: <b>{item.quantity}</b> × ₹{Number(item.price).toLocaleString()}</span>
                                                                <span className="font-bold text-green-700">₹{Number(item.total).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <ShoppingCart className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm font-medium">No purchases yet</p>
                                            <p className="text-xs">No one has bought this product yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* BUYERS TAB */}
                            {activeTab === 'buyers' && (
                                <div className="space-y-2">
                                    {detailProduct.buyers?.length > 0 ? detailProduct.buyers.map((buyer, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={buyer.profile_image_url || ''} />
                                                <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-xs">
                                                    {buyer.full_name?.substring(0, 2)?.toUpperCase() || '??'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm">{buyer.full_name || 'Unknown'}</p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                    {buyer.mobile && <span>📞 {buyer.mobile}</span>}
                                                    {buyer.email && <span>📧 {buyer.email}</span>}
                                                </div>
                                            </div>
                                            <div className="text-right space-y-0.5">
                                                <p className="text-sm font-bold text-green-700">₹{buyer.total_spent?.toLocaleString()}</p>
                                                <p className="text-[10px] text-muted-foreground">{buyer.total_quantity} unit(s)</p>
                                                {buyer.last_purchase && <p className="text-[10px] text-muted-foreground">Last: {formatDate(buyer.last_purchase)}</p>}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Users className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm font-medium">No buyers yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ACTIVITY LOG TAB */}
                            {activeTab === 'logs' && (
                                <div className="space-y-0">
                                    {detailProduct.logs?.length > 0 ? (
                                        <div className="relative pl-6 space-y-0">
                                            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
                                            {detailProduct.logs.map((log, i) => (
                                                <div key={log.id || i} className="relative pb-4">
                                                    <div className={`absolute left-[-15px] top-1.5 h-3 w-3 rounded-full border-2 bg-white ${log.action === 'product_created' ? 'border-green-500' :
                                                        log.action === 'stock_update' ? 'border-blue-500' :
                                                            log.action === 'price_change' ? 'border-orange-500' :
                                                                log.action === 'status_change' ? 'border-purple-500' :
                                                                    'border-gray-400'
                                                        }`} />
                                                    <div className="ml-2 bg-gray-50 rounded-lg p-3">
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1 gap-1">
                                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${log.action === 'product_created' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                log.action === 'stock_update' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                    log.action === 'price_change' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                        log.action === 'status_change' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                            'bg-gray-100 text-gray-700 border-gray-200'
                                                                }`}>
                                                                {log.action?.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">{formatDateTime(log.created_at)}</span>
                                                        </div>
                                                        <p className="text-sm">{log.message}</p>
                                                        {(log.old_value || log.new_value) && (
                                                            <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                                                                {log.old_value && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 line-through">{log.old_value}</span>}
                                                                <span className="text-muted-foreground">→</span>
                                                                {log.new_value && <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">{log.new_value}</span>}
                                                            </div>
                                                        )}
                                                        {log.users?.full_name && (
                                                            <p className="text-[10px] text-muted-foreground mt-1">by {log.users.full_name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Clock className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm font-medium">No activity recorded</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions - responsive */}
                            <DialogFooter className="gap-2 flex-col sm:flex-row">
                                <Button variant="outline" onClick={() => handleToggleActive(detailProduct)}
                                    className={`gap-2 ${detailProduct.is_active ? 'text-amber-700 border-amber-200 hover:bg-amber-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                                    {detailProduct.is_active ? <><ToggleRight className="h-4 w-4" /> Deactivate</> : <><ToggleLeft className="h-4 w-4" /> Activate</>}
                                </Button>
                                <Button onClick={() => { setDetailOpen(false); handleOpenDialog(detailProduct) }} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                                    <Edit className="h-4 w-4" /> Edit Product
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(detailProduct.id)} className="gap-2">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
