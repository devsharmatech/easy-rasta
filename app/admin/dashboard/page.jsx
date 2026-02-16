'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Store, Bike, Calendar, Star, Activity, MapPin, ShoppingCart, IndianRupee, Package, TrendingUp, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react'

// ─── Mini SVG Line Chart ───────────────────────────────────────────────
const MiniLineChart = ({ data, color = '#f97316', height = 200 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
                No data available
            </div>
        )
    }

    const values = data.map(d => Number(d.count) || 0)
    const maxVal = Math.max(...values, 1)
    const width = 100
    const padding = 2

    const points = values.map((val, i) => {
        const x = padding + (i / (values.length - 1)) * (width - padding * 2)
        const y = height - padding - (val / maxVal) * (height - padding * 2 - 20)
        return { x, y, val }
    })

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

    const total = values.reduce((a, b) => a + b, 0)

    return (
        <div style={{ height }} className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
                <path d={pathD} fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="1" fill={color} opacity={i === points.length - 1 ? 1 : 0.4} />
                ))}
            </svg>
            <div className="absolute bottom-1 right-2 text-xs font-medium text-muted-foreground">
                Total: {total}
            </div>
        </div>
    )
}

// ─── Bar Chart ─────────────────────────────────────────────────────────
const MiniBarChart = ({ data, color = '#f97316', height = 200 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
                No data available
            </div>
        )
    }

    const values = data.map(d => Number(d.count) || 0)
    const maxVal = Math.max(...values, 1)

    return (
        <div style={{ height }} className="flex items-end gap-[2px] px-1">
            {values.map((val, i) => {
                const barHeight = (val / maxVal) * (height - 30)
                const isLast7 = i >= values.length - 7
                return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                        <div
                            className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                            style={{
                                height: `${Math.max(barHeight, 2)}px`,
                                backgroundColor: isLast7 ? color : `${color}50`,
                                minWidth: '3px'
                            }}
                        />
                        <div className="absolute -top-6 hidden group-hover:block bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                            {val}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Clickable Stat Card ───────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, description, trend, trendUp, color = 'orange', href }) => {
    const colorMap = {
        orange: 'from-orange-500 to-orange-600',
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        red: 'from-red-500 to-red-600',
        cyan: 'from-cyan-500 to-cyan-600',
        rose: 'from-rose-500 to-rose-600',
        amber: 'from-amber-500 to-amber-600',
    }
    const bgMap = {
        orange: 'bg-orange-50 text-orange-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        red: 'bg-red-50 text-red-600',
        cyan: 'bg-cyan-50 text-cyan-600',
        rose: 'bg-rose-50 text-rose-600',
        amber: 'bg-amber-50 text-amber-600',
    }

    const content = (
        <Card className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-sm overflow-hidden group ${href ? 'cursor-pointer' : ''}`}>
            <div className={`h-1 bg-gradient-to-r ${colorMap[color]}`} />
            <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold tracking-tight">{value}</p>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                    </div>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bgMap[color]} transition-transform group-hover:scale-110`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                    {trend ? (
                        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
                            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {trend}
                        </div>
                    ) : <div />}
                    {href && (
                        <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    )}
                </div>
            </CardContent>
        </Card>
    )

    if (href) {
        return <Link href={href} className="block">{content}</Link>
    }
    return content
}

// ─── Clickable Gradient Card ───────────────────────────────────────────
const GradientCard = ({ icon: Icon, value, label, gradient, href }) => {
    const content = (
        <Card className={`border-0 shadow-sm bg-gradient-to-br ${gradient} text-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group ${href ? 'cursor-pointer' : ''}`}>
            <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 opacity-80 group-hover:scale-110 transition-transform" />
                    <div className="flex-1">
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-white/80">{label}</p>
                    </div>
                    {href && <ExternalLink className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />}
                </div>
            </CardContent>
        </Card>
    )

    if (href) return <Link href={href} className="block">{content}</Link>
    return content
}

// ─── Main Dashboard ────────────────────────────────────────────────────
export default function DashboardPage() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Safe number helper
    const n = (val) => (val != null && !isNaN(val) ? Number(val) : 0)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('adminToken')
                const res = await fetch('/api/admin/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    setStats(await res.json())
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-0 shadow-sm">
                            <CardContent className="pt-5 pb-4 px-5">
                                <div className="h-24 bg-gray-100 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-0 shadow-sm">
                            <CardContent className="pt-5 pb-4 px-5">
                                <div className="h-24 bg-gray-100 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map(i => (
                        <Card key={i} className="border-0 shadow-sm">
                            <CardContent className="pt-5 pb-4 px-5">
                                <div className="h-48 bg-gray-100 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        return `${days}d ago`
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s an overview of the EasyRasta ecosystem.</p>
                </div>
                <div className="text-sm text-muted-foreground bg-white border rounded-lg px-3 py-1.5 shadow-sm hidden md:block">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Stat Cards Row 1 */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Riders"
                    value={n(stats?.riders).toLocaleString()}
                    icon={Bike}
                    description="Registered riders"
                    color="orange"
                    href="/admin/riders"
                    trend={stats?.todayRiders > 0 ? `+${stats.todayRiders} today` : null}
                    trendUp={true}
                />
                <StatCard
                    title="Active Vendors"
                    value={n(stats?.vendors).toLocaleString()}
                    icon={Store}
                    description="Verified businesses"
                    color="blue"
                    href="/admin/vendors"
                />
                <StatCard
                    title="Total Orders"
                    value={n(stats?.orders).toLocaleString()}
                    icon={ShoppingCart}
                    description="All time orders"
                    color="purple"
                    href="/admin/orders"
                />
                <StatCard
                    title="Total Earnings"
                    value={`₹${n(stats?.totalEarnings).toLocaleString()}`}
                    icon={IndianRupee}
                    description="From paid orders"
                    color="green"
                    href="/admin/orders"
                />
            </div>

            {/* Stat Cards Row 2 */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Rides"
                    value={n(stats?.rides).toLocaleString()}
                    icon={Activity}
                    description="Completed trips"
                    color="cyan"
                    href="/admin/riders"
                />
                <StatCard
                    title="Distance Covered"
                    value={`${n(stats?.totalDistance).toLocaleString()} km`}
                    icon={MapPin}
                    description="Total km traveled"
                    color="rose"
                    href="/admin/riders"
                />
                <StatCard
                    title="Events Created"
                    value={n(stats?.events).toLocaleString()}
                    icon={Calendar}
                    description="Community events"
                    color="amber"
                    href="/admin/events"
                />
                <StatCard
                    title="This Month"
                    value={`₹${n(stats?.thisMonthEarnings).toLocaleString()}`}
                    icon={TrendingUp}
                    description="Revenue this month"
                    color="green"
                    href="/admin/orders"
                />
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/admin/riders" className="block">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">Rider Registrations</CardTitle>
                                    <CardDescription>Daily signups over the last 30 days</CardDescription>
                                </div>
                                <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="h-4 w-4 text-orange-600" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MiniBarChart data={stats?.graphs?.registrations} color="#f97316" height={180} />
                            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground px-1">
                                <span>{stats?.graphs?.registrations?.[0]?.date ? formatDate(stats.graphs.registrations[0].date) : ''}</span>
                                <span>{stats?.graphs?.registrations?.length > 0 ? formatDate(stats.graphs.registrations[stats.graphs.registrations.length - 1].date) : ''}</span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/riders" className="block">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group hover:-translate-y-0.5">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">Ride Activity</CardTitle>
                                    <CardDescription>Completed rides over the last 30 days</CardDescription>
                                </div>
                                <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MiniLineChart data={stats?.graphs?.rides} color="#3b82f6" height={180} />
                            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground px-1">
                                <span>{stats?.graphs?.rides?.[0]?.date ? formatDate(stats.graphs.rides[0].date) : ''}</span>
                                <span>{stats?.graphs?.rides?.length > 0 ? formatDate(stats.graphs.rides[stats.graphs.rides.length - 1].date) : ''}</span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Bottom Section: Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Riders */}
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">New Riders</CardTitle>
                                <CardDescription>Latest registrations</CardDescription>
                            </div>
                            <Link href="/admin/riders" className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-full transition-colors">
                                View All <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {stats?.recentRiders?.length > 0 ? stats.recentRiders.map((rider, i) => (
                                <div
                                    key={i}
                                    onClick={() => router.push('/admin/riders')}
                                    className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-b last:border-0 border-gray-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                                            {rider?.users?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{rider?.users?.full_name || 'Unknown'}</p>
                                            <p className="text-xs text-muted-foreground">Joined {timeAgo(rider.created_at)}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">New</span>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground text-center py-6">No recent riders</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
                                <CardDescription>Latest product orders</CardDescription>
                            </div>
                            <Link href="/admin/orders" className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-colors">
                                View All <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {stats?.recentOrders?.length > 0 ? stats.recentOrders.map((order, i) => (
                                <div
                                    key={i}
                                    onClick={() => router.push('/admin/orders')}
                                    className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-b last:border-0 border-gray-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                                            <ShoppingCart className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                Order #{order?.id?.slice(0, 8) || '---'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">₹{n(order.total_amount).toLocaleString()}</p>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${order.payment_status === 'paid'
                                            ? 'text-green-700 bg-green-50'
                                            : 'text-amber-700 bg-amber-50'
                                            }`}>
                                            {order.payment_status || 'unpaid'}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground text-center py-6">No orders yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Summary Row */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <GradientCard icon={Star} value={n(stats?.reviews).toLocaleString()} label="Reviews Posted" gradient="from-orange-500 to-red-500" href="/admin/reviews" />
                <GradientCard icon={Package} value={n(stats?.products).toLocaleString()} label="Products Listed" gradient="from-blue-500 to-cyan-500" href="/admin/products" />
                <GradientCard icon={Calendar} value={n(stats?.events).toLocaleString()} label="Active Events" gradient="from-purple-500 to-pink-500" href="/admin/events" />
                <GradientCard icon={TrendingUp} value={n(stats?.rides).toLocaleString()} label="Total Rides" gradient="from-green-500 to-emerald-500" href="/admin/riders" />
            </div>
        </div>
    )
}
